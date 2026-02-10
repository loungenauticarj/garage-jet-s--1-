
import React, { useState, useEffect } from 'react';
import { User, Reservation } from './types';
import Login from './components/Login';
import Register from './components/Register';
import ClientDashboard from './components/ClientDashboard';
import MarinaDashboard from './components/MarinaDashboard';
import * as authService from './services/auth';
import * as usersService from './services/users';
import * as reservationsService from './services/reservations';

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

const App: React.FC = () => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'CLIENT' | 'MARINA'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Load current user on mount
  useEffect(() => {
    const loadUser = async () => {
      const user = authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setView(user.role === 'MARINA' ? 'MARINA' : 'CLIENT');
        await loadData(user);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  // Load data based on user role
  const loadData = async (user: User) => {
    if (user.role === 'MARINA') {
      // Load all users and reservations for MARINA
      const { users: allUsers } = await usersService.getAllUsers();
      const { reservations: allReservations } = await reservationsService.getAllReservations();
      setUsers(allUsers);
      setReservations(allReservations);
    } else {
      // Load all reservations for CLIENT to enforce jet group blocking
      const { reservations: allReservations } = await reservationsService.getAllReservations();
      setReservations(allReservations);
    }
  };

  const handleLogin = async (email: string, password: string, role: 'CLIENT' | 'MARINA') => {
    const { user, error } = await authService.login(email, password, role);

    if (error) {
      alert(error);
      return;
    }

    if (user) {
      setCurrentUser(user);
      authService.saveCurrentUser(user);
      setView(role === 'MARINA' ? 'MARINA' : 'CLIENT');
      await loadData(user);
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
      await loadData(user);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setUsers([]);
    setReservations([]);
    setView('LOGIN');
  };

  const updateReservation = async (updatedRes: Reservation) => {
    const { reservation, error } = await reservationsService.updateReservation(updatedRes.id, updatedRes);

    if (error) {
      alert('Erro ao atualizar reserva: ' + error);
      return;
    }

    if (reservation) {
      setReservations(prev => prev.map(r => r.id === reservation.id ? reservation : r));
    }
  };

  const deleteReservation = async (reservationId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) return;

    const { success, error } = await reservationsService.deleteReservation(reservationId);

    if (error) {
      alert('Erro ao deletar reserva: ' + error);
      return;
    }

    if (success) {
      setReservations(prev => prev.filter(r => r.id !== reservationId));
    }
  };


  const addReservation = async (newRes: Reservation) => {
    if (!currentUser) return;

    const { reservation, error } = await reservationsService.createReservation(
      currentUser.id,
      currentUser.name,
      newRes.date,
      newRes.time,
      newRes.route,
      currentUser.jetName
    );

    if (error) {
      alert('Erro ao criar reserva: ' + error);
      return;
    }

    if (reservation) {
      setReservations(prev => [...prev, reservation]);
    }
  };

  const updateUser = async (updatedUser: User) => {
    const { user, error } = await usersService.updateUser(updatedUser.id, updatedUser);

    if (error) {
      alert('Erro ao atualizar usuário: ' + error);
      return;
    }

    if (user) {
      setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    }
  };

  const deleteUser = async (userId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente permanentemente? Todas as reservas associadas também serão removidas.')) {
      const { success, error } = await usersService.deleteUser(userId);

      if (error) {
        alert('Erro ao deletar usuário: ' + error);
        return;
      }

      if (success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setReservations(prev => prev.filter(r => r.userId !== userId));
      }
    }
  };

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

      <main className="flex-1 container mx-auto p-4 max-w-4xl">
        {view === 'LOGIN' && <Login onLogin={handleLogin} onGoToRegister={() => setView('REGISTER')} />}
        {view === 'REGISTER' && <Register onRegister={handleRegister} onBack={() => setView('LOGIN')} />}
        {view === 'CLIENT' && currentUser && (
          <ClientDashboard
            user={currentUser}
            reservations={reservations.filter(r => r.userId === currentUser.id)}
            allReservations={reservations}
            onAddReservation={addReservation}
            onUpdateReservation={updateReservation}
            onDeleteReservation={deleteReservation}
          />
        )}
        {view === 'MARINA' && (
          <MarinaDashboard
            reservations={reservations}
            users={users}
            onUpdateReservation={updateReservation}
            onUpdateUser={updateUser}
            onDeleteUser={deleteUser}
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
