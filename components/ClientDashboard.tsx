
import React, { useState, useEffect, useRef } from 'react';
import { JetStatus, MaintenanceBlock, Reservation, StatusLabels, User } from '../types';
import { generateId } from '../utils';

const JetSkiIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 20C4 18.5 6 20 8 20C10 20 12 18.5 14 18.5C16 18.5 18 20 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4 16L18 13.5L22 16L21 17.5H5L4 16Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 13.5L14 10H17L18 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface Props {
  user: User;
  reservations: Reservation[];
  allReservations: Reservation[];
  maintenanceBlocks: MaintenanceBlock[];
  onAddReservation: (res: Reservation) => void;
  onDeleteReservation: (reservationId: string) => void;
  onUpdateReservation: (res: Reservation) => void;
}

const ClientDashboard: React.FC<Props> = ({ user, reservations, allReservations, maintenanceBlocks, onAddReservation, onDeleteReservation, onUpdateReservation }) => {
  const [showResForm, setShowResForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'STATUS' | 'HISTORY' | 'CALENDAR'>('STATUS');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [newRes, setNewRes] = useState({
    date: '',
    time: '',
    route: ''
  });
  const [clientPhotos, setClientPhotos] = useState<string[]>([]);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [fuelReceiptPhoto, setFuelReceiptPhoto] = useState<string>('');
  const [fuelPixName, setFuelPixName] = useState<string>('');
  const [fuelPixNumber, setFuelPixNumber] = useState<string>('');
  const previousPasswordRef = useRef<string>(user.password);

  // Monitorar mudanças na senha (quando admin reseta)
  useEffect(() => {
    const storedPassword = localStorage.getItem(`pwd_${user.email}`);
    
    if (storedPassword && storedPassword !== previousPasswordRef.current && storedPassword !== user.password) {
      previousPasswordRef.current = storedPassword;
      
      alert(`✓ Sua senha foi redefinida!\n\nNova senha: ${storedPassword}\n\nFaça login novamente com a nova senha.`);
      
      // Forçar logout
      localStorage.removeItem('currentUser');
      window.location.reload();
    }
  }, [user.email, user.password]);

  const normalizeJetName = (value?: string) => (value || '').trim().toLowerCase();
  const getTodayDate = () => new Date().toLocaleDateString('en-CA');
  const isAfterDailyUnlock = () => {
    const now = new Date();
    return now.getHours() > 0 || now.getMinutes() >= 1;
  };

  const hasFutureReservationBlock = (activeReservations: Reservation[], today: string, hasUnlockedCurrentDay: boolean) => {
    return activeReservations.some(r =>
      r.status !== JetStatus.CHECKED_IN &&
      (r.date > today || (!hasUnlockedCurrentDay && r.date === today))
    );
  };

  const handleSubmitRes = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.isBlocked) {
      alert("Usuário bloqueado. Favor entrar em contato com o administrador.");
      return;
    }

    // Verificar se cadastro está completo
    const isCadastroIncompleto = user.ownerType === 'COTISTA'
      ? !user.jetName || user.jetName.trim() === ''
      : !user.jetModel || user.jetModel.trim() === '' || !user.jetYear || user.jetYear.trim() === '';
    
    if (isCadastroIncompleto) {
      alert('Cadastro incompleto. Aguarde o administrador completar seus dados de jet para liberar agendamentos.');
      return;
    }

    // Get today's date in YYYY-MM-DD format
    const today = getTodayDate();
    const hasUnlockedCurrentDay = isAfterDailyUnlock();

    // Validate: each cotista can have only 1 active reservation at a time
    // But allow new reservation ONLY for today if there's a future reservation
    if (user.ownerType === 'COTISTA') {
      const activeReservations = reservations.filter(r => r.status !== JetStatus.CHECKED_IN);
      
      // Check if there's an active reservation after today.
      // Before 00:01, reservation of today is still considered blocking.
      const hasFutureReservation = hasFutureReservationBlock(activeReservations, today, hasUnlockedCurrentDay);
      
      if (hasFutureReservation) {
        // If they have a future reservation, they can only book for today
        if (newRes.date !== today) {
          alert('Você possui agendamento em data futura. Novo agendamento permitido apenas para hoje (a partir de 00:01 no dia da reserva atual).');
          return;
        }
      }
      
      // Check if there's an overdue active reservation (before today)
      const hasPastReservation = activeReservations.some(r => r.date < today);
      if (hasPastReservation && newRes.date <= today) {
        alert('Você possui agendamento pendente de dia anterior. Finalize o check-in para liberar novo agendamento.');
        return;
      }
    }

    // Validate: only one departure per jet on the same day (COTISTA only)
    if (user.ownerType === 'COTISTA' && user.jetName) {
      if (hasMaintenanceBlockForDate(newRes.date)) {
        alert('Data bloqueada para manutenção deste jet. Escolha outra data.');
        return;
      }

      const conflict = allReservations.find(r =>
        r.date === newRes.date &&
        r.status !== JetStatus.CHECKED_IN &&
        normalizeJetName(r.jetName) === normalizeJetName(user.jetName)
      );

      if (conflict) {
        const msg = conflict.userId !== user.id 
          ? `Reservado para outro cliente: ${conflict.userName}`
          : 'Já existe um agendamento ativo para este dia com este jet.';
        alert(msg);
        return;
      }
    }

    const res: Reservation = {
      id: generateId(),
      userId: user.id,
      userName: user.name,
      jetName: user.jetName,
      date: newRes.date,
      time: newRes.time,
      route: newRes.route,
      status: JetStatus.IN_DOCK,
      photos: []
    };
    onAddReservation(res);
    setNewRes({ date: '', time: '', route: '' });
    setShowResForm(false);
    setActiveTab('STATUS');
    alert('Sua reserva foi enviada!');
  };

  const sortedReservations = [...reservations].sort((a, b) => b.date.localeCompare(a.date));
  const currentRes = sortedReservations[0];

  const findJetDateConflict = (date: string, excludeId?: string) => {
    if (!user.jetName) return null;

    return allReservations.find(r =>
      r.date === date &&
      r.status !== JetStatus.CHECKED_IN &&
      normalizeJetName(r.jetName) === normalizeJetName(user.jetName) &&
      r.id !== excludeId
    );
  };

  const hasMaintenanceBlockForDate = (date: string) => {
    if (user.ownerType !== 'COTISTA' || !user.jetName) return false;

    return maintenanceBlocks.some(block =>
      block.date === date &&
      normalizeJetName(block.jetName) === normalizeJetName(user.jetName)
    );
  };

  const padNumber = (value: number) => value.toString().padStart(2, '0');

  const buildDateString = (year: number, month: number, day: number) => {
    return `${year}-${padNumber(month + 1)}-${padNumber(day)}`;
  };

  const reservedDates = new Set(
    user.jetName
      ? [
          ...allReservations
            .filter(r => r.status !== JetStatus.CHECKED_IN && normalizeJetName(r.jetName) === normalizeJetName(user.jetName))
            .map(r => r.date),
          ...(user.ownerType === 'COTISTA'
            ? maintenanceBlocks
                .filter(block => normalizeJetName(block.jetName) === normalizeJetName(user.jetName))
                .map(block => block.date)
            : []),
        ]
      : []
  );

  const handleDateChange = (value: string) => {
    const today = getTodayDate();
    const hasUnlockedCurrentDay = isAfterDailyUnlock();
    
    // Check if cotista has a future reservation
    if (user.ownerType === 'COTISTA') {
      const hasFutureReservation = hasFutureReservationBlock(reservations, today, hasUnlockedCurrentDay);
      
      if (hasFutureReservation && value !== today) {
        alert('Você possui agendamento em data futura. Novo agendamento permitido apenas para hoje (a partir de 00:01 no dia da reserva atual).');
        return;
      }
    }

    if (hasMaintenanceBlockForDate(value)) {
      alert('Data bloqueada para manutenção deste jet.');
      setNewRes({ ...newRes, date: '' });
      return;
    }

    const conflict = findJetDateConflict(value);

    if (conflict) {
      if (conflict.userId !== user.id) {
        alert(`Reservado para outro cliente: ${conflict.userName}`);
        setNewRes({ ...newRes, date: '' });
        return;
      }

      alert('Já existe um agendamento ativo para este dia com este jet.');
      setNewRes({ ...newRes, date: value });
      return;
    }

    setNewRes({ ...newRes, date: value });
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxPhotos = 6;
    const remainingSlots = maxPhotos - clientPhotos.length;
    
    if (remainingSlots <= 0) {
      alert(`Máximo de ${maxPhotos} fotos permitidas.`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClientPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeClientPhoto = (index: number) => {
    setClientPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const saveClientPhotos = (currentRes: Reservation) => {
    if (clientPhotos.length === 0) {
      alert('Adicione pelo menos uma foto.');
      return;
    }

    const updatedRes: Reservation = {
      ...currentRes,
      clientPhotos: [...(currentRes.clientPhotos || []), ...clientPhotos]
    };

    onUpdateReservation(updatedRes);
    setClientPhotos([]);
    setShowPhotoUpload(false);
    alert('Fotos adicionadas com sucesso!');
  };

  const handleFuelReceiptCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFuelReceiptPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveFuelData = (currentRes: Reservation) => {
    if (!fuelReceiptPhoto) {
      alert('Adicione a foto da nota fiscal.');
      return;
    }

    if (!fuelPixName || !fuelPixNumber) {
      alert('Preencha o nome e número do PIX.');
      return;
    }

    // Atualizar reserva atual
    const updatedRes: Reservation = {
      ...currentRes,
      fuelReceiptPhoto,
      fuelPixName,
      fuelPixNumber
    };

    onUpdateReservation(updatedRes);

    // Buscar reserva anterior do mesmo jet que passou pelas etapas
    const previousReservation = allReservations
      .filter(r => 
        normalizeJetName(r.jetName) === normalizeJetName(currentRes.jetName) &&
        r.date < currentRes.date &&
        (r.status === JetStatus.RETURNED || r.status === JetStatus.CHECKED_IN)
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    // Se encontrou reserva anterior, enviar dados de abastecimento
    if (previousReservation) {
      const updatedPreviousRes: Reservation = {
        ...previousReservation,
        fuelReceiptPhoto,
        fuelPixName,
        fuelPixNumber
      };
      onUpdateReservation(updatedPreviousRes);
    }

    setFuelReceiptPhoto('');
    setFuelPixName('');
    setFuelPixNumber('');
    setShowFuelForm(false);
    
    if (previousReservation) {
      alert(`Dados salvos! Informações enviadas para ${previousReservation.userName} (agendamento anterior).`);
    } else {
      alert('Dados de abastecimento salvos com sucesso!');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Perfil do Cliente */}
      <div className="bg-white p-4 rounded-2xl shadow-md border border-blue-50 flex justify-between items-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-blue-950">{user.name}</h2>
            {user.ownerType === 'COTISTA' && user.jetName && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {user.jetName} • Cotista
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center mt-0.5">
            <p className="text-blue-600 font-bold text-xs tracking-wider uppercase">ID: {user.registrationCode}</p>
            <span className="text-gray-300">|</span>
            <p className="text-gray-500 text-xs font-medium">{user.jetSkiManufacturer} {user.jetSkiModel}</p>
          </div>
          <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black uppercase ${user.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isBlocked ? 'bg-red-500' : 'bg-green-500'}`}></span>
            {user.isBlocked ? 'Bloqueado' : 'Liberado'}
          </div>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-lg">
          <JetSkiIcon className="w-6 h-6" />
        </div>
      </div>

      {/* Alerta de Cadastro Incompleto */}
      {(() => {
        const isCadastroIncompleto = user.ownerType === 'COTISTA'
          ? !user.jetName || user.jetName.trim() === ''
          : !user.jetModel || user.jetModel.trim() === '' || !user.jetYear || user.jetYear.trim() === '';
        
        if (isCadastroIncompleto) {
          return (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-amber-900 mb-1">⚠️ Cadastro Incompleto</h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {user.ownerType === 'COTISTA' 
                      ? 'Aguarde o administrador vincular você ao jet cotista correspondente para poder fazer agendamentos.'
                      : 'Aguarde o administrador completar os dados do seu jet (modelo e ano) para poder fazer agendamentos.'}
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Navegação entre Status e Histórico */}
      <div className="flex bg-white rounded-lg shadow-sm border p-0.5">
        <button
          onClick={() => setActiveTab('STATUS')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition ${activeTab === 'STATUS' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}
        >
          Status Atual
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition ${activeTab === 'HISTORY' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}
        >
          Histórico
        </button>
      </div>

      {activeTab === 'STATUS' ? (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              Acompanhamento
            </h3>
            {currentRes ? (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl shadow-sm ${currentRes.status === JetStatus.NAVIGATING ? 'bg-teal-500 text-white animate-pulse' :
                      currentRes.status === JetStatus.CHECKED_IN ? 'bg-blue-600 text-white' :
                        'bg-white text-blue-600 border'
                      }`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Situação</p>
                      <p className="text-lg font-black text-gray-900">{StatusLabels[currentRes.status]}</p>
                    </div>
                  </div>
                  <div className="text-xs">
                    <p className="text-gray-500"><strong>Data:</strong> {currentRes.date.split('-').reverse().join('/')}</p>
                    <p className="text-gray-500"><strong>Horário:</strong> {currentRes.time}</p>
                    <p className="text-gray-500"><strong>Destino:</strong> {currentRes.route}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => onDeleteReservation(currentRes.id)}
                        disabled={currentRes.status !== JetStatus.IN_DOCK}
                        className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm ${
                          currentRes.status === JetStatus.IN_DOCK
                            ? 'bg-red-600 text-white hover:bg-red-700 transition cursor-pointer'
                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                        title={currentRes.status === JetStatus.IN_DOCK ? 'Excluir agendamento' : 'Não pode excluir: O jet já saiu da vaga'}
                      >
                        Excluir
                      </button>
                      {currentRes.status === JetStatus.IN_WATER && (
                        <button
                          onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                          className="text-[10px] font-bold px-3 py-1 rounded shadow-sm bg-teal-600 text-white hover:bg-teal-700 transition"
                        >
                          📸 {showPhotoUpload ? 'Fechar' : 'Registrar fotos'}
                        </button>
                      )}
                      {currentRes.status === JetStatus.NAVIGATING && (
                        <button
                          onClick={() => setShowFuelForm(!showFuelForm)}
                          className="text-[10px] font-bold px-3 py-1 rounded shadow-sm bg-orange-600 text-white hover:bg-orange-700 transition"
                        >
                          ⛽ {showFuelForm ? 'Fechar' : 'Registrar abastecimento'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seção de captura de fotos pelo cliente */}
                {showPhotoUpload && currentRes.status === JetStatus.IN_WATER && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-xl border-2 border-teal-200 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-teal-900 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Registre seu passeio
                      </h4>
                      <span className="text-xs text-teal-700 font-medium">{clientPhotos.length}/6 fotos</span>
                    </div>
                    
                    <p className="text-xs text-teal-800 mb-3">
                      Capture momentos especiais do seu passeio! Adicione até 6 fotos.
                    </p>

                    <label className="block w-full">
                      <div className="border-2 border-dashed border-teal-300 rounded-lg p-4 text-center cursor-pointer hover:bg-teal-100 transition bg-white">
                        <svg className="w-8 h-8 mx-auto text-teal-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <p className="text-sm font-bold text-teal-700">Adicionar fotos</p>
                        <p className="text-xs text-teal-600 mt-1">Toque para abrir a câmera ou galeria</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={handlePhotoCapture}
                        className="hidden"
                        disabled={clientPhotos.length >= 6}
                      />
                    </label>

                    {clientPhotos.length > 0 && (
                      <div className="mt-3">
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {clientPhotos.map((photo, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-teal-300 shadow-sm">
                              <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                onClick={() => removeClientPhoto(idx)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-700 shadow-lg"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => saveClientPhotos(currentRes)}
                          className="w-full bg-teal-600 text-white font-bold py-2.5 rounded-lg hover:bg-teal-700 transition shadow-md"
                        >
                          ✓ Salvar fotos ({clientPhotos.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Seção de registro de abastecimento */}
                {showFuelForm && currentRes.status === JetStatus.NAVIGATING && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border-2 border-orange-200 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-orange-900 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Dados de Abastecimento
                      </h4>
                    </div>
                    
                    <p className="text-xs text-orange-800 mb-3">
                      Registre a nota fiscal e os dados do PIX para reembolso do combustível.
                    </p>

                    {/* Foto da nota fiscal */}
                    <div className="mb-3">
                      <label className="block text-xs font-bold text-orange-900 mb-2">Nota Fiscal do Posto</label>
                      {!fuelReceiptPhoto ? (
                        <label className="block w-full">
                          <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 text-center cursor-pointer hover:bg-orange-100 transition bg-white">
                            <svg className="w-8 h-8 mx-auto text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-sm font-bold text-orange-700">Fotografar nota fiscal</p>
                            <p className="text-xs text-orange-600 mt-1">Toque para abrir a câmera</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFuelReceiptCapture}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="relative rounded-lg overflow-hidden border-2 border-orange-300 shadow-sm">
                          <img src={fuelReceiptPhoto} alt="Nota fiscal" className="w-full h-auto" />
                          <button
                            onClick={() => setFuelReceiptPhoto('')}
                            className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-700 shadow-lg"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Campos de PIX */}
                    <div className="space-y-3 mb-3">
                      <div>
                        <label className="block text-xs font-bold text-orange-900 mb-1">Nome do PIX</label>
                        <input
                          type="text"
                          placeholder="Digite o nome cadastrado no PIX"
                          value={fuelPixName}
                          onChange={(e) => setFuelPixName(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-orange-900 mb-1">Número do PIX (CPF/Telefone/Email)</label>
                        <input
                          type="text"
                          placeholder="Digite a chave PIX"
                          value={fuelPixNumber}
                          onChange={(e) => setFuelPixNumber(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => saveFuelData(currentRes)}
                      disabled={!fuelReceiptPhoto || !fuelPixName || !fuelPixNumber}
                      className={`w-full font-bold py-2.5 rounded-lg transition shadow-md ${
                        fuelReceiptPhoto && fuelPixName && fuelPixNumber
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      ✓ Salvar dados de abastecimento
                    </button>
                  </div>
                )}

                {currentRes.clientPhotos && currentRes.clientPhotos.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-black text-teal-900 uppercase mb-2">📸 Fotos do passeio</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {currentRes.clientPhotos.map((photo, i) => (
                        <div key={i} className="aspect-square overflow-hidden rounded-lg border shadow-sm">
                          <img src={photo} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentRes.fuelReceiptPhoto && (
                  <div className="mt-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-xs font-black text-orange-900 uppercase">⛽ Dados de Abastecimento Recebidos</p>
                    </div>
                    <div className="bg-green-100 border border-green-300 rounded p-2 mb-2">
                      <p className="text-xs font-bold text-green-800">✓ Nota fiscal do próximo usuário recebida para reembolso</p>
                    </div>
                    <div className="space-y-2">
                      <div className="aspect-video overflow-hidden rounded-lg border-2 border-orange-400 shadow-sm bg-white">
                        <img src={currentRes.fuelReceiptPhoto} alt="Nota fiscal" className="w-full h-full object-contain" />
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border-2 border-orange-300 shadow-sm">
                        <p className="text-xs font-bold text-gray-700 mb-1">Dados para reembolso:</p>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-700"><strong>Nome PIX:</strong> {currentRes.fuelPixName}</p>
                          <p className="text-xs text-gray-700 break-all"><strong>Chave PIX:</strong> {currentRes.fuelPixNumber}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentRes.photos.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-black text-blue-900 uppercase mb-2">Fotos do check-in</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {currentRes.photos.map((photo, i) => (
                        <div key={i} className="aspect-square overflow-hidden rounded-lg border shadow-sm">
                          <img src={photo} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 italic text-sm">
                Nenhuma atividade recente.
              </div>
            )}
          </div>

          {!showResForm ? (
            (() => {
              const today = getTodayDate();
              const hasUnlockedCurrentDay = isAfterDailyUnlock();
              const isCadastroIncompleto = user.ownerType === 'COTISTA'
                ? !user.jetName || user.jetName.trim() === ''
                : !user.jetModel || user.jetModel.trim() === '' || !user.jetYear || user.jetYear.trim() === '';
              const hasFutureReservation = user.ownerType === 'COTISTA' &&
                hasFutureReservationBlock(reservations, today, hasUnlockedCurrentDay);
              const hasActivePastReservation = user.ownerType === 'COTISTA' && 
                reservations.some(r => r.status !== JetStatus.CHECKED_IN && r.date < today);
              const hasActiveReservationTodayBeforeUnlock = user.ownerType === 'COTISTA' &&
                !hasUnlockedCurrentDay &&
                reservations.some(r => r.status !== JetStatus.CHECKED_IN && r.date === today);
              const isReservationBlocked = isCadastroIncompleto || hasActivePastReservation || hasActiveReservationTodayBeforeUnlock || hasFutureReservation;
              
              return (
                <button
                  onClick={() => setShowResForm(true)}
                  disabled={isReservationBlocked}
                  title={
                    isCadastroIncompleto
                      ? 'Aguarde o administrador completar seu cadastro'
                      : hasActivePastReservation
                        ? 'Finalize o check-in pendente para liberar novo agendamento'
                        : hasActiveReservationTodayBeforeUnlock
                          ? 'Novo agendamento liberado a partir de 00:01 no dia da reserva'
                          : hasFutureReservation
                            ? 'Nova data já agendada. Aguarde até o dia marcado para liberar novo agendamento'
                            : ''
                  }
                  className={`w-full font-black py-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 ${
                    isReservationBlocked 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  {isCadastroIncompleto
                    ? 'Cadastro incompleto - aguarde admin'
                    : hasActivePastReservation
                      ? 'Pendência de agendamento - finalize check-in'
                      : hasActiveReservationTodayBeforeUnlock
                        ? 'Aguarde 00:01 para novo agendamento'
                        : hasFutureReservation
                          ? 'Nova data agendada - aguarde o dia'
                          : 'Reservar saída'}
                </button>
              );
            })()
          ) : (
            <div className="flex gap-4 items-start">
              {/* Formulário à esquerda */}
              <div className="bg-white p-3 rounded-lg shadow-lg border border-blue-600 animate-in slide-in-from-bottom-4 duration-300 flex-1 max-w-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-base text-blue-900">Agendar saída</h4>
                  <button
                    type="button"
                    onClick={() => setShowResForm(false)}
                    className="text-gray-400 hover:text-gray-600 transition"
                    title="Voltar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Debug Info Card */}
                <div className="mb-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-[11px]">
                  <p className="mb-1"><strong>🎯 Jet:</strong> {user.jetName || 'Não definido'}</p>
                  <p className="mb-1"><strong>👤 Tipo:</strong> {user.ownerType === 'COTISTA' ? 'Cotista (Compartilhado)' : 'Único'}</p>
                  {user.ownerType === 'COTISTA' && (
                    <p className="text-gray-600">
                      <strong>📅 Agendamentos:</strong> {reservations.filter(r => r.status !== JetStatus.CHECKED_IN).length} ativo(s)
                      {reservations.filter(r => r.status !== JetStatus.CHECKED_IN).length > 0 && (
                        <span className="block mt-1 text-gray-700">
                          {reservations
                            .filter(r => r.status !== JetStatus.CHECKED_IN)
                            .map(r => r.date.split('-').reverse().join('/'))
                            .join(', ')}
                        </span>
                      )}
                    </p>
                  )}
                  {user.ownerType === 'COTISTA' && (
                    <p className="mt-1 text-[10px] text-blue-700 font-semibold">
                      ✅ No dia do seu agendamento atual, já é possível fazer novo agendamento.
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmitRes} className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                    <div className="border rounded-md bg-gray-50 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          className="text-xs font-bold px-2 py-1 rounded bg-white border"
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        >
                          ◀
                        </button>
                        <div className="text-xs font-bold text-gray-700">
                          {calendarMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </div>
                        <button
                          type="button"
                          className="text-xs font-bold px-2 py-1 rounded bg-white border"
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        >
                          ▶
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-[10px] text-gray-500 mb-1">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => (
                          <div key={day} className="text-center font-bold">{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const year = calendarMonth.getFullYear();
                          const month = calendarMonth.getMonth();
                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                          const startDay = new Date(year, month, 1).getDay();
                          const cells: (number | null)[] = [];
                          const today = getTodayDate();
                          const hasUnlockedCurrentDay = isAfterDailyUnlock();

                          for (let i = 0; i < startDay; i += 1) {
                            cells.push(null);
                          }

                          for (let day = 1; day <= daysInMonth; day += 1) {
                            cells.push(day);
                          }

                          // Check if cotista has a reservation after today
                          const hasFutureReservation = user.ownerType === 'COTISTA' &&
                            hasFutureReservationBlock(reservations, today, hasUnlockedCurrentDay);

                          return cells.map((day, index) => {
                            if (!day) {
                              return <div key={`empty-${index}`} />;
                            }

                            const dateStr = buildDateString(year, month, day);
                            const isReserved = reservedDates.has(dateStr);
                            const isSelected = newRes.date === dateStr;
                            const isNotToday = dateStr !== today;
                            const isDisabledForFutureRes = hasFutureReservation && isNotToday;

                            const baseClass = 'w-full py-1 rounded text-xs font-bold';
                            let buttonClass = isReserved ? 'bg-red-200 text-red-800 cursor-not-allowed' : 'bg-white border text-gray-700';
                            
                            if (isDisabledForFutureRes) {
                              buttonClass = 'bg-gray-200 text-gray-500 cursor-not-allowed';
                            }
                            
                            const selectedClass = isSelected && !isDisabledForFutureRes ? 'bg-blue-600 text-white' : buttonClass;

                            return (
                              <button
                                type="button"
                                key={dateStr}
                                className={`${baseClass} ${selectedClass}`}
                                onClick={() => handleDateChange(dateStr)}
                                disabled={isReserved || isDisabledForFutureRes}
                                title={isReserved ? 'Reservado' : isDisabledForFutureRes ? 'Novo agendamento permitido apenas para hoje' : ''}
                              >
                                {day}
                              </button>
                            );
                          });
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600">
                        <span className="inline-block w-3 h-3 rounded bg-red-200 border"></span>
                        Dias reservados para este jet
                      </div>
                      
                      {/* Lista de dias reservados */}
                      {user.ownerType === 'COTISTA' && reservedDates.size > 0 && (
                        <div className="mt-3 p-2 bg-red-50 rounded border border-red-100 text-[10px] text-gray-700">
                          <p className="font-bold text-red-700 mb-1">📌 Datas bloqueadas:</p>
                          <div className="space-y-1">
                            {Array.from(reservedDates)
                              .sort()
                              .map(date => {
                                const maintenanceBlock = maintenanceBlocks.find(block =>
                                  block.date === date &&
                                  normalizeJetName(block.jetName) === normalizeJetName(user.jetName)
                                );
                                return (
                                  <span key={date} className="block">
                                    • {date.split('-').reverse().join('/')} (RESERVADO{maintenanceBlock ? ' - Manutenção' : ''})
                                  </span>
                                );
                              })
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    <input type="hidden" required value={newRes.date} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
                    <input type="time" required className="w-full p-2.5 border bg-gray-50 rounded-md font-medium text-sm" value={newRes.time} onChange={(e) => setNewRes({ ...newRes, time: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Roteiro</label>
                    <input type="text" required placeholder="Ex.: Ilhas Cagarras" className="w-full p-2.5 border bg-gray-50 rounded-md font-medium text-sm" value={newRes.route} onChange={(e) => setNewRes({ ...newRes, route: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowResForm(false)} className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 p-2.5 rounded-md font-bold text-sm transition flex items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Voltar
                    </button>
                    <button type="submit" className="flex-[2] bg-blue-600 text-white hover:bg-blue-700 p-2.5 rounded-md font-bold shadow-md text-sm transition">Confirmar</button>
                  </div>
                </form>
              </div>

              {/* Logo à direita */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-8 shadow-2xl">
                  <JetSkiIcon className="w-24 h-24 text-white" />
                </div>
                <p className="mt-4 text-xl font-black text-blue-900 tracking-wide">SEJA BEM VINDO A BORDO</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in duration-500">
          <h3 className="text-base font-bold text-gray-800 mb-1">Histórico</h3>
          {reservations.length > 0 ? (
            sortedReservations.map((res) => (
              <div key={res.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">
                      {res.date.split('-').reverse().join('/')} • {res.time}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900">{res.route}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${res.status === JetStatus.CHECKED_IN ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {StatusLabels[res.status]}
                    </div>
                    {res.status === JetStatus.IN_DOCK && (
                      <button
                        onClick={() => onDeleteReservation(res.id)}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition"
                        title="Excluir agendamento"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-2 space-y-2">
                  {res.clientPhotos && res.clientPhotos.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-teal-700 uppercase mb-1">📸 Fotos do passeio</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {res.clientPhotos.map((photo, i) => (
                          <div key={i} className="aspect-square rounded-md overflow-hidden border border-teal-200">
                            <img src={photo} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {res.fuelReceiptPhoto && (
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded p-2">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-[9px] font-bold text-orange-800 uppercase">⛽ Reembolso</p>
                        <span className="text-[8px] bg-green-200 text-green-800 px-1 py-0.5 rounded font-bold">Recebido</span>
                      </div>
                      <div className="aspect-video rounded overflow-hidden border border-orange-400 mb-1.5 bg-white">
                        <img src={res.fuelReceiptPhoto} alt="Nota fiscal" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-[9px] text-gray-700 space-y-0.5 bg-white rounded p-1.5 border border-orange-200">
                        <p><strong>PIX:</strong> {res.fuelPixName}</p>
                        <p className="break-all"><strong>Chave:</strong> {res.fuelPixNumber}</p>
                      </div>
                    </div>
                  )}

                  {res.photos.length > 0 ? (
                    <div>
                      <p className="text-[9px] font-bold text-blue-700 uppercase mb-1">Check-in</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {res.photos.map((photo, i) => (
                          <div key={i} className="aspect-square rounded-md overflow-hidden border">
                            <img src={photo} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">
                      {res.status === JetStatus.CHECKED_IN ? 'Sem fotos de check-in.' : 'Pendente.'}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-sm text-gray-400 bg-white rounded-2xl border border-dashed">
              Vazio.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
