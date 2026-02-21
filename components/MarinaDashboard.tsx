
import React, { useEffect, useRef, useState } from 'react';
import { JetStatus, Reservation, StatusLabels, User } from '../types';
import { formatCEP, formatPhone, toTitleCase } from '../utils';

const JET_NAMES = [
  'Gti170 2022 cinza/verm',
  'Gti170 2023 cinza/verm',
  'Gti130 2014 Brc/verde',
  'Gti130 2024 Brc',
  'Gti130 2024 Ramos',
  'Gtx170 2023',
  'Rxt300 2020',
  'Wake170 2024'
];

const JET_OWNER_LIMITS: { [key: string]: number } = {
  'Gtx170 2023': 6,
  'Rxt300 2020': 6,
  'Gti170 2023': 6,
};

const DEFAULT_JET_OWNER_LIMIT = 10;

const getJetOwnerLimit = (jetName: string): number => {
  return JET_OWNER_LIMITS[jetName] || DEFAULT_JET_OWNER_LIMIT;
};

interface Props {
  reservations: Reservation[];
  users: User[];
  onUpdateReservation: (res: Reservation) => void;
  onUpdateUser: (updatedUser: User) => Promise<boolean>;
  onDeleteUser: (userId: string) => void;
  operationsOnly?: boolean;
}

const MarinaDashboard: React.FC<Props> = ({ reservations, users, onUpdateReservation, onUpdateUser, onDeleteUser, operationsOnly = false }) => {
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'CLIENTS' | 'FINANCE'>('OPERATIONS');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const [financeForm, setFinanceForm] = useState({ dueDate: 10, value: 0 });
  const [financeSearch, setFinanceSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [checkInPhotos, setCheckInPhotos] = useState<Record<string, string[]>>({});
  const [jetNames, setJetNames] = useState<string[]>(() => {
    const storedJetNames = localStorage.getItem('marina_jet_names');
    if (!storedJetNames) return JET_NAMES;

    try {
      const parsed = JSON.parse(storedJetNames);
      return Array.isArray(parsed) ? parsed : JET_NAMES;
    } catch {
      return JET_NAMES;
    }
  });
  const [newJetName, setNewJetName] = useState('');

  useEffect(() => {
    if (operationsOnly && activeTab !== 'OPERATIONS') {
      setActiveTab('OPERATIONS');
    }
  }, [activeTab, operationsOnly]);

  // State for calendar date picker (default to today, local time)
  const today = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // State for the full registration edit form
  const [regForm, setRegForm] = useState<Partial<User>>({});

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const cameraInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const galleryInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addJetName = () => {
    const normalizedJetName = newJetName.trim();

    if (!normalizedJetName) {
      alert('Digite um nome de jet para adicionar.');
      return;
    }

    const alreadyExists = jetNames.some(
      jet => jet.toLowerCase() === normalizedJetName.toLowerCase()
    );

    if (alreadyExists) {
      alert('Esse nome de jet já existe na lista.');
      return;
    }

    const updatedJetNames = [...jetNames, normalizedJetName].sort((a, b) => a.localeCompare(b));
    setJetNames(updatedJetNames);
    localStorage.setItem('marina_jet_names', JSON.stringify(updatedJetNames));
    setRegForm(prev => ({ ...prev, jetName: normalizedJetName }));
    setNewJetName('');
  };



  const updateStatus = (res: Reservation, nextStatus: JetStatus) => {
    onUpdateReservation({ ...res, status: nextStatus });
  };

  const handlePhotoCheckin = (e: React.ChangeEvent<HTMLInputElement>, resId: string) => {
    const files = e.target.files;
    if (!files) return;

    const currentPhotos = checkInPhotos[resId] || [];
    const remainingSlots = 10 - currentPhotos.length;
    
    if (remainingSlots <= 0) {
      alert('Você já atingiu o limite de 10 fotos para este check-in!');
      return;
    }

    const filesToProcess = Array.from(files as FileList).slice(0, remainingSlots);

    const readers = filesToProcess.map((file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(photoUrls => {
      const updatedPhotos = [...currentPhotos, ...photoUrls];
      setCheckInPhotos(prev => ({
        ...prev,
        [resId]: updatedPhotos
      }));

      // Reset input
      e.target.value = '';
    });
  };

  const removePhoto = (resId: string, index: number) => {
    setCheckInPhotos(prev => ({
      ...prev,
      [resId]: prev[resId].filter((_, i) => i !== index)
    }));
  };

  const finishCheckin = (res: Reservation) => {
    const photos = checkInPhotos[res.id] || [];
    
    if (photos.length === 0) {
      alert('Por favor, adicione pelo menos uma foto para o check-in!');
      return;
    }

    onUpdateReservation({
      ...res,
      photos: photos,
      status: JetStatus.CHECKED_IN
    });

    setCheckInPhotos(prev => ({
      ...prev,
      [res.id]: []
    }));

    alert('Check-in finalizado e fotos enviadas ao cliente!');
  };

  const startEditingFinance = (user: User) => {
    setEditingUserId(user.id);
    setFinanceForm({ dueDate: user.monthlyDueDate, value: user.monthlyValue });
  };

  const saveFinance = (user: User) => {
    onUpdateUser({
      ...user,
      monthlyDueDate: financeForm.dueDate,
      monthlyValue: financeForm.value
    });
    setEditingUserId(null);
  };

  const startEditingRegistration = (user: User) => {
    setEditingRegistrationId(user.id);
    setRegForm({ ...user });
  };

  const handleRegFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'name' || name === 'address' || name === 'jetSkiModel') {
      formattedValue = toTitleCase(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    }

    setRegForm(prev => ({ ...prev, [name]: formattedValue }));
  };

  const saveRegistration = () => {
    setValidationError(null);
    
    if (editingRegistrationId) {
      // Validate jet owner limits if ownerType is COTISTA and jetName is selected
      if (regForm.ownerType === 'COTISTA' && regForm.jetName) {
        const jetLimit = getJetOwnerLimit(regForm.jetName);
        const currentOwnerCount = users.filter(
          u => u.jetName === regForm.jetName && u.ownerType === 'COTISTA' && u.id !== editingRegistrationId
        ).length;
        
        if (currentOwnerCount >= jetLimit) {
          setValidationError(`Este jet já atingiu o limite de ${jetLimit} proprietários cotistas.`);
          return;
        }
      }
      
      onUpdateUser(regForm as User);
      setEditingRegistrationId(null);
      setRegForm({});
    }
  };

  const toggleBlock = async (user: User) => {
    if (blockingUserId === user.id) return;
    setBlockingUserId(user.id);
    const nextStatus = !user.isBlocked;
    const success = await onUpdateUser({ ...user, isBlocked: nextStatus });
    if (success) {
      setToastMessage(nextStatus ? 'Cliente bloqueado com sucesso.' : 'Cliente liberado com sucesso.');
      setTimeout(() => setToastMessage(null), 2000);
    }
    setBlockingUserId(null);
  };

  const resetPassword = (user: User) => {
    const defaultPassword = '1234';
    const confirmed = window.confirm(`Resetar senha de ${user.name} para "${defaultPassword}"?`);

    if (confirmed) {
      // Update localStorage
      localStorage.setItem(`pwd_${user.email}`, defaultPassword);

      // Update user object
      onUpdateUser({ ...user, password: defaultPassword });

      alert(`Senha de ${user.name} resetada para "${defaultPassword}" com sucesso!`);
    }
  };




  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanPhone}`;
    window.open(whatsappUrl, '_blank');
  };

  // Helper function to sort reservations alphabetically by userName
  const sortByName = (a: Reservation, b: Reservation) => a.userName.localeCompare(b.userName);


  const getUserMeta = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return null;

    return {
      jetModel: user.jetSkiModel || '---',
      jetYear: user.jetSkiYear || '---',
      ownerType: user.ownerType,
      ownerLabel: user.ownerType === 'COTISTA' ? 'Cotista' : 'Único',
      jetName: user.ownerType === 'COTISTA' ? (user.jetName || '---') : '',
    };
  };

  const renderReservationLine = (res: Reservation) => {
    const meta = getUserMeta(res.userId);
    const items: string[] = [];
    const nameParts = res.userName.trim().split(/\s+/).filter(Boolean);
    const displayName = nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
      : res.userName;

    items.push(displayName);

    if (meta) {
      if (meta.ownerType === 'COTISTA') {
        items.push(meta.jetName || '---');
        items.push('Cotista');
      } else {
        items.push(`${meta.jetModel} ${meta.jetYear}`.trim());
        items.push('Unico');
      }
    }

    items.push(res.time);
    items.push(res.route);

    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
        {items.map((item, index) => (
          <span key={`${res.id}-item-${index}`} className={index === 0 ? 'font-bold text-gray-900' : ''}>
            {item}
          </span>
        ))}
      </div>
    );
  };

  const filteredUsers = users
    .filter(u => u.name.toLowerCase().includes(clientSearch.toLowerCase()))
    .sort((a, b) => {
      const aKey = a.ownerType === 'COTISTA'
        ? `0-${(a.jetName || '').toLowerCase()}-${a.name.toLowerCase()}`
        : `1-${a.name.toLowerCase()}`;
      const bKey = b.ownerType === 'COTISTA'
        ? `0-${(b.jetName || '').toLowerCase()}-${b.name.toLowerCase()}`
        : `1-${b.name.toLowerCase()}`;
      return aKey.localeCompare(bKey);
    });

  // Filtered users for finance tab
  const filteredFinanceUsers = users
    .filter(u => u.name.toLowerCase().includes(financeSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 pb-20">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 text-white text-sm font-bold px-4 py-3 shadow-xl">
          {toastMessage}
        </div>
      )}
      <div className="flex items-center justify-between">
        <nav className="flex bg-white rounded-xl shadow-sm border p-1 sticky top-4 z-20 overflow-x-auto flex-1">
          <button
            onClick={() => setActiveTab('OPERATIONS')}
            className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition ${activeTab === 'OPERATIONS' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Painel Principal
          </button>
          {!operationsOnly && (
            <button
              onClick={() => setActiveTab('CLIENTS')}
              className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition ${activeTab === 'CLIENTS' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Clientes
            </button>
          )}
          {!operationsOnly && (
            <button
              onClick={() => setActiveTab('FINANCE')}
              className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition ${activeTab === 'FINANCE' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Financeiro
            </button>
          )}
        </nav>
        <button
          onClick={() => window.location.reload()}
          className="ml-3 p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition text-gray-600 hover:text-blue-600"
          title="Atualizar página"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {activeTab === 'OPERATIONS' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Date Picker */}
          <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-600">Selecionar data:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={() => {
                  setSelectedDate(today);
                }}
                className="ml-auto px-3 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition"
              >
                Hoje
              </button>
            </div>
          </div>

          {/* Seção 1: Reserva do dia -> Colocado na água */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Reserva do dia</h3>
            </div>
            <div className="flex flex-col gap-2">
              {reservations
                .filter(r => r.status === JetStatus.IN_DOCK && r.date === selectedDate)
                .sort(sortByName)
                .map(res => (
                  <div key={res.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center group hover:border-blue-300 transition">
                    <div>
                      {renderReservationLine(res)}
                    </div>
                    <button
                      onClick={() => updateStatus(res, JetStatus.IN_WATER)}
                      className="bg-blue-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition shadow-sm active:scale-95"
                    >
                      Colocado na água
                    </button>
                  </div>
                ))}
              {reservations.filter(r => r.status === JetStatus.IN_DOCK && r.date === selectedDate).length === 0 && (
                <p className="text-xs text-gray-400 italic px-2">Nenhuma reserva para {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}.</p>
              )}
            </div>
          </section>

          {/* Seção 2: Na Água -> Navegando */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-6 bg-teal-500 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Na Água</h3>
            </div>
            <div className="flex flex-col gap-2">
              {reservations
                .filter(r => r.status === JetStatus.IN_WATER && r.date === selectedDate)
                .sort(sortByName)
                .map(res => (
                  <div key={res.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
                    <div>
                      {renderReservationLine(res)}
                    </div>
                    <button
                      onClick={() => updateStatus(res, JetStatus.NAVIGATING)}
                      className="bg-teal-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition shadow-sm active:scale-95"
                    >
                      Navegando
                    </button>
                  </div>
                ))}
              {reservations.filter(r => r.status === JetStatus.IN_WATER && r.date === selectedDate).length === 0 && (
                <p className="text-xs text-gray-400 italic px-2">Vazio.</p>
              )}
            </div>
          </section>

          {/* Seção 3: Navegando -> Retornou e check-in */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Navegando</h3>
            </div>
            <div className="flex flex-col gap-2">
              {reservations
                .filter(r => r.status === JetStatus.NAVIGATING && r.date === selectedDate)
                .sort(sortByName)
                .map(res => (
                  <div key={res.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
                    <div>
                      {renderReservationLine(res)}
                    </div>
                    <button
                      onClick={() => updateStatus(res, JetStatus.RETURNED)}
                      className="bg-orange-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition shadow-sm active:scale-95"
                    >
                      Retornou e check-in
                    </button>
                  </div>
                ))}
              {reservations.filter(r => r.status === JetStatus.NAVIGATING && r.date === selectedDate).length === 0 && (
                <p className="text-xs text-gray-400 italic px-2">Vazio.</p>
              )}
            </div>
          </section>

          {/* Seção 4: Retornou e check-in -> Na vaga (com fotos) */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-6 bg-green-500 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Retornou e check-in</h3>
            </div>
            <div className="flex flex-col gap-2">
              {reservations
                .filter(r => r.status === JetStatus.RETURNED && r.date === selectedDate)
                .sort(sortByName)
                .map(res => {
                  const photos = checkInPhotos[res.id] || [];
                  const photosCount = photos.length;
                  const canAddMore = photosCount < 10;

                  return (
                    <div key={res.id} className="bg-white p-5 rounded-2xl shadow-lg border-2 border-green-500 flex flex-col gap-4">
                      <div className="text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {renderReservationLine(res)}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">Aguardando finalização do check-in</p>
                      </div>

                      {/* Photo Preview Grid */}
                      {photosCount > 0 && (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                          {photos.map((photo, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={photo}
                                alt={`Foto ${idx + 1}`}
                                className="w-full h-20 object-cover rounded-lg shadow-sm border border-gray-200"
                              />
                              <button
                                onClick={() => removePhoto(res.id, idx)}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center transition text-xs font-bold shadow-lg active:scale-90"
                                title="Remover foto"
                              >
                                ✕
                              </button>
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs rounded px-2 py-0.5">
                                {idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Photo Counter */}
                      <p className="text-center text-sm font-semibold text-gray-700">
                        {photosCount}/10 fotos {photosCount === 10 ? '✓ Completo' : canAddMore ? 'Adicione mais' : ''}
                      </p>

                      {/* Camera & Gallery Buttons */}
                      <div className="w-full flex gap-2">
                        <button
                          onClick={() => cameraInputRefs.current[res.id]?.click()}
                          disabled={!canAddMore}
                          className={`flex-1 ${canAddMore ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'} text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 active:scale-95 disabled:cursor-not-allowed`}
                          title="Tirar foto com a câmera"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <circle cx="12" cy="13" r="3" strokeWidth="2" />
                          </svg>
                          Câmera
                        </button>

                        <button
                          onClick={() => galleryInputRefs.current[res.id]?.click()}
                          disabled={!canAddMore}
                          className={`flex-1 ${canAddMore ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400'} text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 active:scale-95 disabled:cursor-not-allowed`}
                          title="Escolher da galeria"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Galeria
                        </button>
                      </div>

                      {/* Finish Button */}
                      {photosCount > 0 && (
                        <button
                          onClick={() => finishCheckin(res)}
                          className="w-full bg-green-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2 active:scale-95"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Finalizar Check-in ({photosCount} fotos)
                        </button>
                      )}

                      {/* Hidden File Inputs */}
                      <input
                        ref={el => { cameraInputRefs.current[res.id] = el; }}
                        type="file"
                        multiple
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoCheckin(e, res.id)}
                      />

                      <input
                        ref={el => { galleryInputRefs.current[res.id] = el; }}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoCheckin(e, res.id)}
                      />
                    </div>
                  );
                })}
              {reservations.filter(r => r.status === JetStatus.RETURNED && r.date === selectedDate).length === 0 && (
                <p className="text-xs text-gray-400 italic px-2">Vazio.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'CLIENTS' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <h3 className="text-lg font-bold text-blue-900">Cadastro do Cliente</h3>
          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <label className="block text-xs font-bold text-gray-500 mb-1">Pesquisar cliente</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="Digite o nome do cliente"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-dashed text-center text-sm text-gray-400">
                Nenhum cliente encontrado.
              </div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative">
                  {editingRegistrationId === u.id ? (
                    /* Edit Form Mode */
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Nome</label>
                          <input name="name" className="w-full p-2 border rounded" value={regForm.name} onChange={handleRegFormChange} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Telefone</label>
                          <input name="phone" className="w-full p-2 border rounded" value={regForm.phone} onChange={handleRegFormChange} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1">Endereço</label>
                          <input name="address" className="w-full p-2 border rounded" value={regForm.address} onChange={handleRegFormChange} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">CEP</label>
                          <input name="cep" className="w-full p-2 border rounded" value={regForm.cep} onChange={handleRegFormChange} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Senha</label>
                          <input name="password" type="text" className="w-full p-2 border rounded" value={regForm.password} onChange={handleRegFormChange} />
                        </div>

                        {/* Vessel/Embarcação Section */}
                        <div className="md:col-span-2 border-t pt-4 mt-2">
                          <p className="text-sm font-bold text-blue-900 mb-3">📋 Dados da Embarcação</p>
                        </div>

                        {regForm.ownerType === 'UNICO' && (
                          <>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Marca</label>
                              <select name="jetSkiManufacturer" className="w-full p-2 border rounded bg-white" value={regForm.jetSkiManufacturer} onChange={handleRegFormChange}>
                                <option value="">Selecione...</option>
                                <option value="Seadoo">Seadoo</option>
                                <option value="Yamaha">Yamaha</option>
                                <option value="Kawasaki">Kawasaki</option>
                                <option value="Outros">Outros</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Modelo Jet</label>
                              <input name="jetSkiModel" className="w-full p-2 border rounded" value={regForm.jetSkiModel} onChange={handleRegFormChange} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Ano Jet</label>
                              <input name="jetSkiYear" className="w-full p-2 border rounded" value={regForm.jetSkiYear} onChange={handleRegFormChange} />
                            </div>
                          </>
                        )}
                        {regForm.ownerType !== 'UNICO' && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Nome do Jet</label>
                            <select name="jetName" className="w-full p-2 border rounded" value={regForm.jetName || ''} onChange={handleRegFormChange}>
                              <option value="">Selecione um jet</option>
                              {jetNames.map((jet) => (
                                <option key={jet} value={jet}>{jet}</option>
                              ))}
                            </select>
                            <div className="mt-2 flex gap-2">
                              <input
                                type="text"
                                className="w-full p-2 border rounded"
                                placeholder="Novo nome do jet"
                                value={newJetName}
                                onChange={(e) => setNewJetName(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={addJetName}
                                className="px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 transition"
                              >
                                Adicionar
                              </button>
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2">Proprietário</label>
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="ownerType"
                                value="UNICO"
                                checked={regForm.ownerType === 'UNICO'}
                                onChange={handleRegFormChange}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm">Único</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="ownerType"
                                value="COTISTA"
                                checked={regForm.ownerType === 'COTISTA'}
                                onChange={handleRegFormChange}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm">Cotista</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      {validationError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                          ⚠️ {validationError}
                        </div>
                      )}
                      <div className="flex gap-2 justify-end pt-2">
                        <button onClick={() => setEditingRegistrationId(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold">Cancelar</button>
                        <button onClick={saveRegistration} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm">Salvar Alterações</button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-lg text-gray-900">{u.name}</h4>
                            {u.ownerType === 'COTISTA' && u.jetName && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {u.jetName} • Cotista
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">Cod: {u.registrationCode}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditingRegistration(u)}
                            className="p-2 bg-gray-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-50 transition shadow-sm active:scale-95"
                            title="Alterar Cadastro"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button
                            onClick={() => onDeleteUser(u.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition shadow-sm active:scale-95"
                            title="Excluir Cadastro"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Access Data */}
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 italic">Acesso do Cliente</p>
                          <p className="text-sm text-gray-700"><strong>Login:</strong> {u.email}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-700"><strong>Senha:</strong> {u.password || '---'}</p>
                            <button
                              onClick={() => resetPassword(u)}
                              className="p-1.5 bg-yellow-50 text-yellow-600 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition shadow-sm active:scale-95"
                              title="Resetar senha para 1234"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Jet-Ski Data */}
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-2">Dados da Embarcação</p>
                          {u.ownerType === 'COTISTA' ? (
                            <>
                              <p className="text-sm text-gray-700"><strong>Nome do Jet:</strong> {u.jetName || '---'}</p>
                              <p className="text-sm text-gray-700"><strong>Proprietário:</strong> Cotista</p>
                            </>
                          ) : (
                            <>
                              <div className="mb-2">
                                <p className="text-sm text-gray-700"><strong>Nome:</strong> {u.jetName || '---'}</p>
                              </div>
                              <p className="text-sm text-gray-700"><strong>Fab:</strong> {u.jetSkiManufacturer}</p>
                              <p className="text-sm text-gray-700"><strong>Mod:</strong> {u.jetSkiModel} ({u.jetSkiYear})</p>
                              <p className="text-sm text-gray-700"><strong>Proprietário:</strong> Único</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600 border-t pt-4">
                        <p><strong>📍 Endereço:</strong> {u.address}</p>
                        <p><strong>📮 CEP:</strong> {u.cep}</p>
                        <p className="flex items-center gap-2">
                          <span><strong>📞 Tel:</strong> {u.phone}</span>
                          <button
                            onClick={() => openWhatsApp(u.phone)}
                            className="inline-flex items-center justify-center w-7 h-7 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all active:scale-95 shadow-sm"
                            title="Abrir WhatsApp"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </button>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'FINANCE' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-lg font-bold text-blue-900">Gestão de Mensalidades</h3>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Pesquisar cliente..."
                className="w-full p-2.5 pl-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-all"
                value={financeSearch}
                onChange={(e) => setFinanceSearch(e.target.value)}
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Cliente</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Vencimento</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">Valor</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredFinanceUsers.length > 0 ? (
                  filteredFinanceUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 font-semibold text-gray-900">{u.name}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Dia</span>
                            <input
                              type="number"
                              min="1" max="31"
                              className="w-16 border rounded p-1"
                              value={financeForm.dueDate}
                              onChange={e => setFinanceForm({ ...financeForm, dueDate: parseInt(e.target.value) })}
                            />
                          </div>
                        ) : (
                          `Dia ${u.monthlyDueDate}`
                        )}
                      </td>
                      <td className="p-4 text-sm font-medium">
                        {editingUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">R$</span>
                            <input
                              type="number"
                              className="w-24 border rounded p-1"
                              value={financeForm.value}
                              onChange={e => setFinanceForm({ ...financeForm, value: parseFloat(e.target.value) })}
                            />
                          </div>
                        ) : (
                          `R$ ${u.monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {editingUserId === u.id ? (
                            <button
                              onClick={() => saveFinance(u)}
                              className="bg-blue-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm active:scale-95 transition"
                            >
                              Salvar
                            </button>
                          ) : (
                            <button
                              onClick={() => startEditingFinance(u)}
                              className="bg-gray-100 text-blue-700 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-blue-50 border border-blue-100 transition shadow-sm active:scale-95"
                            >
                              Cadastrar Financeiro
                            </button>
                          )}
                          <button
                            onClick={() => toggleBlock(u)}
                            disabled={blockingUserId === u.id}
                            className={`w-28 py-1.5 rounded-full text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${u.isBlocked ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                          >
                            {blockingUserId === u.id ? 'SALVANDO...' : (u.isBlocked ? 'BLOQUEADO' : 'LIBERADO')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-gray-400 italic">Nenhum cliente encontrado com este nome.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarinaDashboard;
