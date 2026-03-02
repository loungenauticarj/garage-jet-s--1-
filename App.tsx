
import React, { useEffect, useRef, useState } from 'react';
import ClientDashboard from './components/ClientDashboard';
import Login from './components/Login';
import MarinaDashboard from './components/MarinaDashboard';
import Register from './components/Register';
import * as authService from './services/auth';
import * as reservationsService from './services/reservations';
import * as usersService from './services/users';
import { supabase } from './supabaseClient';
import { MaintenanceBlock, Reservation, User } from './types';
import {
  useReservationCreate,
  useReservationDelete,
  useReservationUpdate,
  useUserDeletion,
  useUserUpdate,
} from './hooks';

const JetSkiLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Água Estilizada */}
    <path d="M2 20C4 18.5 6 20 8 20C10 20 12 18.5 14 18.5C16 18.5 18 20 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

    {/* Moto Aquática / Jet Ski */}
    <path d="M4 16L18 13.5L22 16L21 17.5H5L4 16Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 13.5L14 10H17L18 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 10C15 10 15.5 8 16.5 8C17.5 8 18 10 18 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

    {/* Spray de Velocidade */}
    <path d="M3 15C1 15 0 14 0 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const CACHE_TTL_MS = 30000;

const mergeWithCachedMedia = (baseReservations: Reservation[], cachedReservations: Reservation[]) => {
  const cachedById = new Map(cachedReservations.map((reservation) => [reservation.id, reservation]));

  return baseReservations.map((reservation) => {
    const cached = cachedById.get(reservation.id);
    if (!cached) return reservation;

    const mergedClientPhotos =
      reservation.clientPhotos && reservation.clientPhotos.length > 0
        ? reservation.clientPhotos
        : (cached.clientPhotos || []);

    const mergedPhotos =
      reservation.photos && reservation.photos.length > 0
        ? reservation.photos
        : (cached.photos || []);

    return {
      ...reservation,
      clientPhotos: mergedClientPhotos,
      photos: mergedPhotos,
    };
  });
};

const App: React.FC = () => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'CLIENT' | 'MARINA'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>(() => {
    const storedBlocks = localStorage.getItem('maintenance_blocks');
    if (!storedBlocks) return [];

    try {
      const parsed = JSON.parse(storedBlocks);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [lastDataUpdateAt, setLastDataUpdateAt] = useState<number | null>(null);
  const [dataLoadSource, setDataLoadSource] = useState<'cache' | 'network' | 'mixed'>('network');
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const isRefreshingRef = useRef(false);
  const usersCacheRef = useRef<{ data: User[]; timestamp: number } | null>(null);
  const reservationsLiteCacheRef = useRef<{ data: Reservation[]; timestamp: number } | null>(null);
  const userReservationsCacheRef = useRef<Record<string, { data: Reservation[]; timestamp: number }>>({});
  const userProfileCacheRef = useRef<Record<string, { data: User; timestamp: number }>>({});

  const isCacheFresh = (timestamp: number) => Date.now() - timestamp < CACHE_TTL_MS;

  // Load current user on mount
  useEffect(() => {
    const loadUser = async () => {
      const user = authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setView(user.role === 'MARINA' || user.role === 'OPERATIONAL' ? 'MARINA' : 'CLIENT');
        await loadData(user, { force: true });
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-refresh data with throttling and tab visibility awareness
  useEffect(() => {
    let autoRefreshDisabled = false;
    
    const interval = setInterval(async () => {
      const user = authService.getCurrentUser();
      if (!user || autoRefreshDisabled) return;
      if (document.hidden) return;
      if (isRefreshingRef.current) return;

      isRefreshingRef.current = true;
      try {
        await loadData(user);
      } finally {
        isRefreshingRef.current = false;
      }
    }, 10000);

    // Store reference to disable function in window for use in deleteUser
    (window as any).__disableAutoRefresh = () => {
      autoRefreshDisabled = true;
      setTimeout(() => {
        autoRefreshDisabled = false;
      }, 10000); // 10 segundos de pausa para garantir que a deleção seja propagada
    };

    // Store reference to force reload function
    (window as any).__forceReloadData = async () => {
      const user = authService.getCurrentUser();
      if (user) {
        console.log('[App] Forçando recarga de dados...');
        if (!isRefreshingRef.current) {
          isRefreshingRef.current = true;
          try {
            await loadData(user, { force: true });
          } finally {
            isRefreshingRef.current = false;
          }
        }
        console.log('[App] Recarga de dados concluída');
      }
    };

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'CLIENT') return;

    const channel = supabase
      .channel(`user-updates-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${currentUser.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          const refreshedUser: User = {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            phone: updated.phone,
            cpf: updated.cpf,
            address: updated.address,
            cep: updated.cep,
            registrationCode: updated.registration_code,
            role: updated.role,
            ownerType: updated.owner_type || 'UNICO',
            jetName: updated.jet_name || '',
            monthlyDueDate: updated.monthly_due_date,
            monthlyValue: updated.monthly_value,
            isBlocked: updated.is_blocked,
            jetSkiManufacturer: updated.jet_ski_manufacturer,
            jetSkiModel: updated.jet_ski_model,
            jetSkiYear: updated.jet_ski_year,
          };
          setCurrentUser(refreshedUser);
          authService.saveCurrentUser(refreshedUser);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Load data based on user role
  const loadData = async (user: User, options?: { force?: boolean }) => {
    const force = options?.force ?? false;

    if (user.role === 'MARINA' || user.role === 'OPERATIONAL') {
      // Load users + lightweight reservations for faster startup
      const cachedUsers = !force && usersCacheRef.current && isCacheFresh(usersCacheRef.current.timestamp)
        ? usersCacheRef.current.data
        : null;
      const cachedReservationsLite = !force && reservationsLiteCacheRef.current && isCacheFresh(reservationsLiteCacheRef.current.timestamp)
        ? reservationsLiteCacheRef.current.data
        : null;

      const usersPromise = cachedUsers
        ? Promise.resolve(cachedUsers)
        : usersService.getAllUsers().then(({ users: fetchedUsers }) => {
            usersCacheRef.current = { data: fetchedUsers, timestamp: Date.now() };
            return fetchedUsers;
          });

      const reservationsLitePromise = cachedReservationsLite
        ? Promise.resolve(cachedReservationsLite)
        : reservationsService.getAllReservationsLite().then(({ reservations: fetchedReservations }) => {
            reservationsLiteCacheRef.current = { data: fetchedReservations, timestamp: Date.now() };
            return fetchedReservations;
          });

      const [allUsers, allReservationsLite] = await Promise.all([usersPromise, reservationsLitePromise]);

      if (cachedUsers && cachedReservationsLite) {
        setDataLoadSource('cache');
      } else if (!cachedUsers && !cachedReservationsLite) {
        setDataLoadSource('network');
      } else {
        setDataLoadSource('mixed');
      }

      setLastDataUpdateAt(Date.now());

      setUsers(allUsers);
      setReservations((previousReservations) => mergeWithCachedMedia(allReservationsLite, previousReservations));
    } else {
      // Load lightweight global reservations + full reservations for the current client
      const cachedUserProfile = !force && userProfileCacheRef.current[user.id] && isCacheFresh(userProfileCacheRef.current[user.id].timestamp)
        ? userProfileCacheRef.current[user.id].data
        : null;
      const cachedReservationsLite = !force && reservationsLiteCacheRef.current && isCacheFresh(reservationsLiteCacheRef.current.timestamp)
        ? reservationsLiteCacheRef.current.data
        : null;
      const cachedUserReservations = !force && userReservationsCacheRef.current[user.id] && isCacheFresh(userReservationsCacheRef.current[user.id].timestamp)
        ? userReservationsCacheRef.current[user.id].data
        : null;

      const refreshedUserPromise = cachedUserProfile
        ? Promise.resolve(cachedUserProfile)
        : usersService.getUserById(user.id).then(({ user: fetchedUser }) => {
            if (fetchedUser) {
              userProfileCacheRef.current[user.id] = { data: fetchedUser, timestamp: Date.now() };
            }
            return fetchedUser;
          });

      const reservationsLitePromise = cachedReservationsLite
        ? Promise.resolve(cachedReservationsLite)
        : reservationsService.getAllReservationsLite().then(({ reservations: fetchedReservations }) => {
            reservationsLiteCacheRef.current = { data: fetchedReservations, timestamp: Date.now() };
            return fetchedReservations;
          });

      const userReservationsPromise = cachedUserReservations
        ? Promise.resolve(cachedUserReservations)
        : reservationsService.getUserReservations(user.id).then(({ reservations: fetchedReservations }) => {
            userReservationsCacheRef.current[user.id] = { data: fetchedReservations, timestamp: Date.now() };
            return fetchedReservations;
          });

      const [refreshedUser, allReservationsLite, userReservations] = await Promise.all([
        refreshedUserPromise,
        reservationsLitePromise,
        userReservationsPromise,
      ]);

      const cacheHits = [cachedUserProfile, cachedReservationsLite, cachedUserReservations].filter(Boolean).length;
      if (cacheHits === 3) {
        setDataLoadSource('cache');
      } else if (cacheHits === 0) {
        setDataLoadSource('network');
      } else {
        setDataLoadSource('mixed');
      }

      setLastDataUpdateAt(Date.now());

      if (refreshedUser) {
        setCurrentUser(refreshedUser);
        authService.saveCurrentUser(refreshedUser);
      }

      const userReservationsById = new Map(userReservations.map((reservation) => [reservation.id, reservation]));
      const mergedReservations = allReservationsLite.map((reservation) => userReservationsById.get(reservation.id) || reservation);

      setReservations((previousReservations) => mergeWithCachedMedia(mergedReservations, previousReservations));
    }
  };

  const handleLogin = async (email: string, password: string, role: 'CLIENT' | 'MARINA' | 'OPERATIONAL') => {
    try {
      const { user, error } = await authService.login(email, password, role);

      if (error) {
        alert(error);
        return;
      }

      if (user) {
        setCurrentUser(user);
        authService.saveCurrentUser(user);
        setView(role === 'MARINA' || role === 'OPERATIONAL' ? 'MARINA' : 'CLIENT');

        try {
          await loadData(user, { force: true });
        } catch (loadError) {
          console.error('Erro ao carregar dados após login:', loadError);
          alert('Login realizado, mas houve falha ao carregar dados iniciais. Tente atualizar a página.');
        }
      }
    } catch (err: any) {
      console.error('Erro inesperado no login:', err);
      alert('Não foi possível concluir o login. Tente novamente.');
    }
  };

  const handleRegister = async (userData: User) => {
    const { user, error } = await authService.register({
      email: userData.email,
      password: userData.password || '',
      name: userData.name,
      phone: userData.phone,
      cpf: userData.cpf || '',
      address: userData.address,
      cep: userData.cep,
      monthlyDueDate: userData.monthlyDueDate,
      monthlyValue: userData.monthlyValue,
      jetSkiManufacturer: userData.jetSkiManufacturer,
      jetSkiModel: userData.jetSkiModel,
      jetSkiYear: userData.jetSkiYear,
    });

    if (error) {
      alert(error);
      return;
    }

    if (user) {
      setCurrentUser(user);
      authService.saveCurrentUser(user);
      setView('CLIENT');
      await loadData(user, { force: true });
    }
  };

  useEffect(() => {
    usersCacheRef.current = { data: users, timestamp: Date.now() };
  }, [users]);

  useEffect(() => {
    reservationsLiteCacheRef.current = {
      data: reservations.map((reservation) => ({
        ...reservation,
        photos: [],
        clientPhotos: [],
      })),
      timestamp: Date.now(),
    };

    if (currentUser?.role === 'CLIENT') {
      const currentUserReservations = reservations.filter((reservation) => reservation.userId === currentUser.id);
      userReservationsCacheRef.current[currentUser.id] = {
        data: currentUserReservations,
        timestamp: Date.now(),
      };
    }
  }, [reservations, currentUser]);

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setUsers([]);
    setReservations([]);
    setView('LOGIN');
  };

  const handleAddMaintenanceBlock = (block: Omit<MaintenanceBlock, 'id' | 'createdAt'>) => {
    const nextBlock: MaintenanceBlock = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      jetName: block.jetName,
      date: block.date,
      createdAt: new Date().toISOString(),
    };

    setMaintenanceBlocks((prev) => {
      const alreadyExists = prev.some(
        existing => existing.jetName === nextBlock.jetName && existing.date === nextBlock.date
      );

      if (alreadyExists) return prev;

      const updated = [...prev, nextBlock].sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem('maintenance_blocks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveMaintenanceBlock = (blockId: string) => {
    setMaintenanceBlocks((prev) => {
      const updated = prev.filter(block => block.id !== blockId);
      localStorage.setItem('maintenance_blocks', JSON.stringify(updated));
      return updated;
    });
  };

  const { updateReservation } = useReservationUpdate({ setReservations });

  const { deleteReservation } = useReservationDelete({ setReservations });

  const { addReservation } = useReservationCreate({
    currentUser,
    setReservations,
  });

  const { updateUser } = useUserUpdate({ users, setUsers });

  // Wrapper para atualizar usuário e sincronizar com currentUser se necessário
  const handleUpdateUserWithSync = async (updatedUser: User) => {
    const success = await updateUser(updatedUser);
    
    // Se a atualização foi bem-sucedida e é o usuário logado, atualizar currentUser também
    if (success && currentUser && updatedUser.id === currentUser.id) {
      const newCurrentUser = { ...currentUser, ...updatedUser };
      setCurrentUser(newCurrentUser);
      localStorage.setItem('currentUser', JSON.stringify(newCurrentUser));
    }
    
    return success;
  };

  const { deleteUser } = useUserDeletion({
    users,
    currentUser,
    setUsers,
    setReservations,
    onDeletedCurrentUser: () => {
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setView('LOGIN');
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-blue-800 text-white p-4 shadow-xl flex justify-between items-center z-50 border-b border-blue-900/50">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-2.5 rounded-2xl shadow-lg border border-white/20">
            <JetSkiLogo className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none italic uppercase">GARAGE JET´S</h1>
          </div>
        </div>
        {currentUser && (
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-blue-200 uppercase">{currentUser.role === 'MARINA' ? 'Administrador' : 'Cliente'}</p>
              {lastDataUpdateAt && (
                <p className="text-[10px] text-blue-300 mt-1 inline-flex items-center gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${dataLoadSource === 'cache' ? 'bg-emerald-300' : dataLoadSource === 'mixed' ? 'bg-amber-300' : 'bg-sky-300'}`}></span>
                  Atualizado há {Math.max(0, Math.floor((nowTick - lastDataUpdateAt) / 1000))}s • {dataLoadSource}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl transition-all duration-200 font-bold text-sm backdrop-blur-sm active:scale-95"
            >
              Sair
            </button>
          </div>
        )}
      </header>

      {currentUser && lastDataUpdateAt && (
        <div className="md:hidden bg-blue-900/60 text-blue-100 text-[10px] px-4 py-1.5 border-b border-blue-900/40 inline-flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${dataLoadSource === 'cache' ? 'bg-emerald-300' : dataLoadSource === 'mixed' ? 'bg-amber-300' : 'bg-sky-300'}`}></span>
          <span>Atualizado há {Math.max(0, Math.floor((nowTick - lastDataUpdateAt) / 1000))}s • {dataLoadSource}</span>
        </div>
      )}

      <main className="flex-1 container mx-auto p-4 max-w-4xl">
        {view === 'LOGIN' && <Login onLogin={handleLogin} onGoToRegister={() => setView('REGISTER')} />}
        {view === 'REGISTER' && <Register onRegister={handleRegister} onBack={() => setView('LOGIN')} />}
        {view === 'CLIENT' && currentUser && (
          <ClientDashboard
            user={currentUser}
            reservations={reservations.filter(r => r.userId === currentUser.id)}
            allReservations={reservations}
            maintenanceBlocks={maintenanceBlocks}
            onAddReservation={addReservation}
            onDeleteReservation={deleteReservation}
            onUpdateReservation={updateReservation}
          />
        )}
        {view === 'MARINA' && (
          <MarinaDashboard
            reservations={reservations}
            users={users}
            maintenanceBlocks={maintenanceBlocks}
            onUpdateReservation={updateReservation}
            onUpdateUser={handleUpdateUserWithSync}
            onDeleteUser={deleteUser}
            onDeleteReservation={deleteReservation}
            onAddMaintenanceBlock={handleAddMaintenanceBlock}
            onRemoveMaintenanceBlock={handleRemoveMaintenanceBlock}
            currentUser={currentUser}
            operationsOnly={currentUser?.role === 'OPERATIONAL'}
          />
        )}
      </main>

      <footer className="p-6 text-center text-gray-400 text-xs">
        <p>© {new Date().getFullYear()} GARAGE JET´S</p>
      </footer>
    </div>
  );
};

export default App;
