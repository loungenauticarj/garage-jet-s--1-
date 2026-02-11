
import React, { useState } from 'react';
import { User, Reservation, JetStatus, StatusLabels } from '../types';
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
  onAddReservation: (res: Reservation) => void;
  onUpdateReservation: (res: Reservation) => void;
  onDeleteReservation: (reservationId: string) => void;
}

const ClientDashboard: React.FC<Props> = ({ user, reservations, allReservations, onAddReservation, onUpdateReservation, onDeleteReservation }) => {
  const [showResForm, setShowResForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'STATUS' | 'HISTORY' | 'CALENDAR'>('STATUS');
  const [editingResId, setEditingResId] = useState<string | null>(null);
  const [editRes, setEditRes] = useState({ date: '', time: '', route: '' });
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [newRes, setNewRes] = useState({
    date: '',
    time: '',
    route: ''
  });

  const handleSubmitRes = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.isBlocked) {
      alert("USUÁRIO BLOQUEADO, FAVOR ENTRAR EM CONTATO COM ADM");
      return;
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toLocaleDateString('en-CA');

    // Validate: each cotista can have only 1 active reservation at a time
    // But allow new reservation ONLY for today if there's a future reservation
    if (user.ownerType === 'COTISTA') {
      const activeReservations = reservations.filter(r => 
        r.status !== JetStatus.CHECKED_IN
      );
      
      // Check if there's an active reservation for today or later
      const hasFutureReservation = activeReservations.some(r => r.date >= today);
      
      if (hasFutureReservation) {
        // If they have a future reservation, they can only book for today
        if (newRes.date !== today) {
          alert('Você possui um agendamento futuro. Só pode agendar para hoje.');
          return;
        }
      }
      
      // Check if there's an active reservation for today (or past dates)
      const hasTodayOrPastReservation = activeReservations.some(r => r.date <= today);
      if (hasTodayOrPastReservation && newRes.date <= today) {
        alert('Você já possui um agendamento ativo. Aguarde o check-in para fazer novo agendamento.');
        return;
      }
    }

    // Validate: only one departure per jet on the same day (COTISTA only)
    if (user.ownerType === 'COTISTA' && user.jetName) {
      const conflict = allReservations.find(r =>
        r.date === newRes.date &&
        r.status !== JetStatus.CHECKED_IN &&
        r.jetName === user.jetName
      );

      if (conflict) {
        const msg = conflict.userId !== user.id 
          ? `RESERVADO PARA OUTRO CLIENTE: ${conflict.userName}`
          : 'Você já possui um agendamento para este dia com este jet.';
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
      r.jetName === user.jetName &&
      r.id !== excludeId
    );
  };

  const padNumber = (value: number) => value.toString().padStart(2, '0');

  const buildDateString = (year: number, month: number, day: number) => {
    return `${year}-${padNumber(month + 1)}-${padNumber(day)}`;
  };

  const reservedDates = new Set(
    user.jetName
      ? allReservations
          .filter(r => r.status !== JetStatus.CHECKED_IN && r.jetName === user.jetName)
          .map(r => r.date)
      : []
  );

  const handleDateChange = (value: string) => {
    const today = new Date().toLocaleDateString('en-CA');
    
    // Check if cotista has a future reservation
    if (user.ownerType === 'COTISTA') {
      const hasFutureReservation = reservations.some(r => 
        r.status !== JetStatus.CHECKED_IN && r.date >= today
      );
      
      if (hasFutureReservation && value !== today) {
        alert('Você possui um agendamento futuro. Só pode agendar para hoje.');
        return;
      }
    }

    const conflict = findJetDateConflict(value);

    if (conflict) {
      if (conflict.userId !== user.id) {
        alert(`RESERVADO PARA OUTRO CLIENTE: ${conflict.userName}`);
        setNewRes({ ...newRes, date: '' });
        return;
      }

      alert('Você já possui um agendamento para este dia com este jet.');
      setNewRes({ ...newRes, date: value });
      return;
    }

    setNewRes({ ...newRes, date: value });
  };

  const startEditReservation = (res: Reservation) => {
    setEditingResId(res.id);
    setEditRes({ date: res.date, time: res.time, route: res.route });
  };

  const cancelEditReservation = () => {
    setEditingResId(null);
    setEditRes({ date: '', time: '', route: '' });
  };

  const saveEditReservation = (res: Reservation) => {
    const conflict = findJetDateConflict(editRes.date, res.id);

    if (conflict) {
      if (conflict.userId !== user.id) {
        alert(`RESERVADO PARA OUTRO CLIENTE: ${conflict.userName}`);
      } else {
        alert('Você já possui um agendamento para este dia com este jet.');
      }
      return;
    }

    onUpdateReservation({
      ...res,
      date: editRes.date,
      time: editRes.time,
      route: editRes.route,
    });
    cancelEditReservation();
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
                        onClick={() => startEditReservation(currentRes)}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-blue-600 text-white shadow-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDeleteReservation(currentRes.id)}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-red-600 text-white shadow-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>

                {editingResId === currentRes.id && (
                  <div className="p-3 border border-gray-100 rounded-xl bg-white space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data</label>
                        <input
                          type="date"
                          className="w-full p-2 border bg-gray-50 rounded-md text-xs"
                          value={editRes.date}
                          onChange={(e) => setEditRes({ ...editRes, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Hora</label>
                        <input
                          type="time"
                          className="w-full p-2 border bg-gray-50 rounded-md text-xs"
                          value={editRes.time}
                          onChange={(e) => setEditRes({ ...editRes, time: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Roteiro</label>
                        <input
                          type="text"
                          className="w-full p-2 border bg-gray-50 rounded-md text-xs"
                          value={editRes.route}
                          onChange={(e) => setEditRes({ ...editRes, route: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelEditReservation}
                        className="text-xs font-bold px-3 py-1.5 rounded bg-gray-100 text-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEditReservation(currentRes)}
                        className="text-xs font-bold px-3 py-1.5 rounded bg-blue-600 text-white"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                )}

                {currentRes.photos.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-black text-blue-900 uppercase mb-2">Fotos do Check-in</p>
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
              const today = new Date().toLocaleDateString('en-CA');
              const hasActiveReservationToday = user.ownerType === 'COTISTA' && 
                reservations.some(r => r.status !== JetStatus.CHECKED_IN && r.date <= today);
              
              return (
                <button
                  onClick={() => setShowResForm(true)}
                  disabled={hasActiveReservationToday}
                  title={hasActiveReservationToday ? 'Complete seu agendamento atual antes de fazer um novo' : ''}
                  className={`w-full font-black py-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 ${
                    hasActiveReservationToday 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  {hasActiveReservationToday ? 'AGENDAMENTO ATIVO - AGUARDE CHECK-IN' : 'RESERVAR SAÍDA'}
                </button>
              );
            })()
          ) : (
            <div className="flex gap-4 items-start">
              {/* Formulário à esquerda */}
              <div className="bg-white p-3 rounded-lg shadow-lg border border-blue-600 animate-in slide-in-from-bottom-4 duration-300 flex-1 max-w-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-base text-blue-900">Agendar Saída</h4>
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
                          const today = new Date().toLocaleDateString('en-CA');

                          for (let i = 0; i < startDay; i += 1) {
                            cells.push(null);
                          }

                          for (let day = 1; day <= daysInMonth; day += 1) {
                            cells.push(day);
                          }

                          // Check if cotista has a future reservation
                          const hasFutureReservation = user.ownerType === 'COTISTA' && 
                            reservations.some(r => r.status !== JetStatus.CHECKED_IN && r.date >= today);

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
                                title={isReserved ? 'RESERVADO' : isDisabledForFutureRes ? 'Só pode agendar para hoje' : ''}
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
                          <p className="font-bold text-red-700 mb-1">📌 Datas Bloqueadas:</p>
                          <div className="space-y-1">
                            {Array.from(reservedDates)
                              .sort()
                              .map(date => {
                                const blockingRes = allReservations.find(r => 
                                  r.date === date && 
                                  r.status !== JetStatus.CHECKED_IN && 
                                  r.jetName === user.jetName
                                );
                                return (
                                  <span key={date} className="block">
                                    • {date.split('-').reverse().join('/')}
                                    {blockingRes && blockingRes.userId !== user.id && ` (${blockingRes.userName})`}
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
                    <input type="text" required placeholder="Ex: Ilhas Cagarras" className="w-full p-2.5 border bg-gray-50 rounded-md font-medium text-sm" value={newRes.route} onChange={(e) => setNewRes({ ...newRes, route: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowResForm(false)} className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 p-2.5 rounded-md font-bold text-sm transition flex items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      VOLTAR
                    </button>
                    <button type="submit" className="flex-[2] bg-blue-600 text-white hover:bg-blue-700 p-2.5 rounded-md font-bold shadow-md text-sm transition">CONFIRMAR</button>
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
                    {res.status !== JetStatus.CHECKED_IN && (
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

                {res.photos.length > 0 ? (
                  <div className="p-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {res.photos.map((photo, i) => (
                        <div key={i} className="aspect-square rounded-md overflow-hidden border">
                          <img src={photo} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 text-xs text-gray-400 italic">
                    {res.status === JetStatus.CHECKED_IN ? 'Sem fotos.' : 'Pendente.'}
                  </div>
                )}
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
