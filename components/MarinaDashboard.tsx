
import React, { useState, useRef } from 'react';
import { User, Reservation, JetStatus, StatusLabels } from '../types';
import { toTitleCase, formatCEP, formatPhone } from '../utils';

const JET_NAMES = [
  'Gti170 2022',
  'Gti170 2023',
  'Gti130 2014',
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
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
}

const MarinaDashboard: React.FC<Props> = ({ reservations, users, onUpdateReservation, onUpdateUser, onDeleteUser }) => {
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'CLIENTS' | 'FINANCE'>('OPERATIONS');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const [financeForm, setFinanceForm] = useState({ dueDate: 10, value: 0 });
  const [financeSearch, setFinanceSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // State for calendar date picker (default to today, local time)
  const today = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // State for the full registration edit form
  const [regForm, setRegForm] = useState<Partial<User>>({});

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const updateStatus = (res: Reservation, nextStatus: JetStatus) => {
    onUpdateReservation({ ...res, status: nextStatus });
  };

  const handlePhotoCheckin = (e: React.ChangeEvent<HTMLInputElement>, res: Reservation) => {
    const files = e.target.files;
    if (!files) return;

    const readers = Array.from(files as FileList).slice(0, 8).map((file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(photoUrls => {
      onUpdateReservation({
        ...res,
        photos: photoUrls,
        status: JetStatus.CHECKED_IN
      });
      alert('Check-in finalizado e fotos enviadas ao cliente!');
    });
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

  const toggleBlock = (user: User) => {
    onUpdateUser({ ...user, isBlocked: !user.isBlocked });
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
      <nav className="flex bg-white rounded-xl shadow-sm border p-1 sticky top-4 z-20 overflow-x-auto">
        <button
          onClick={() => setActiveTab('OPERATIONS')}
          className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition ${activeTab === 'OPERATIONS' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Painel Principal
        </button>
        <button
          onClick={() => setActiveTab('CLIENTS')}
          className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition ${activeTab === 'CLIENTS' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Clientes
        </button>
        <button
          onClick={() => setActiveTab('FINANCE')}
          className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition ${activeTab === 'FINANCE' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Financeiro
        </button>
      </nav>

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
                .map(res => (
                  <div key={res.id} className="bg-white p-5 rounded-2xl shadow-lg border-2 border-green-500 flex flex-col items-center gap-4">
                    <div className="text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {renderReservationLine(res)}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">Aguardando finalização do check-in</p>
                    </div>

                    <div className="w-full flex flex-col gap-3">
                      <button
                        onClick={() => fileInputRefs.current[res.id]?.click()}
                        className="w-full bg-green-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2 active:scale-95"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <circle cx="12" cy="13" r="3" strokeWidth="2" />
                        </svg>
                        Na Vaga
                      </button>
                      <p className="text-center text-xs text-gray-500">(Acionar câmera para colocar até 8 fotos)</p>

                      <input
                        ref={el => { fileInputRefs.current[res.id] = el; }}
                        type="file"
                        multiple
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoCheckin(e, res)}
                      />
                    </div>
                  </div>
                ))}
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
                        {regForm.ownerType !== 'UNICO' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Nome do Jet</label>
                            <select name="jetName" className="w-full p-2 border rounded" value={regForm.jetName || ''} onChange={handleRegFormChange}>
                              <option value="">Selecione um jet</option>
                              {JET_NAMES.map((jet) => (
                                <option key={jet} value={jet}>{jet}</option>
                              ))}
                            </select>
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
                          <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-2">Jet-Ski Associado</p>
                          <p className="text-sm text-gray-700"><strong>Nome:</strong> {u.jetName || '---'}</p>
                          <p className="text-sm text-gray-700"><strong>Fab:</strong> {u.jetSkiManufacturer}</p>
                          <p className="text-sm text-gray-700"><strong>Mod:</strong> {u.jetSkiModel} ({u.jetSkiYear})</p>
                          <p className="text-sm text-gray-700"><strong>Proprietário:</strong> {u.ownerType === 'UNICO' ? 'Único' : 'Cotista'}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600 border-t pt-4">
                        <p><strong>📍 Endereço:</strong> {u.address}</p>
                        <p><strong>📮 CEP:</strong> {u.cep}</p>
                        <p><strong>📞 Tel:</strong> {u.phone}</p>
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
                            className={`w-28 py-1.5 rounded-full text-xs font-bold transition shadow-sm active:scale-95 ${u.isBlocked ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                          >
                            {u.isBlocked ? 'BLOQUEADO' : 'LIBERADO'}
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
