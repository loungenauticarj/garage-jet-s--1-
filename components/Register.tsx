
import React, { useState } from 'react';
import { User } from '../types';
import { formatCEP, formatCPF, formatPhone, generateId, isValidCPF, toTitleCase } from '../utils';

const JetSkiLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 20C4 18.5 6 20 8 20C10 20 12 18.5 14 18.5C16 18.5 18 20 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <path d="M4 16L18 13.5L22 16L21 17.5H5L4 16Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 13.5L14 10H17L18 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 10C15 10 15.5 8 16.5 8C17.5 8 18 10 18 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 15C1 15 0 14 0 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
  </svg>
);

interface Props {
  onRegister: (user: User) => void;
  onBack: () => void;
}

const Register: React.FC<Props> = ({ onRegister, onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    address: '',
    cep: '',
    phone: '',
    password: ''
  });
  const [cpfError, setCpfError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'name' || name === 'address') {
      formattedValue = toTitleCase(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
    } else if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    }

    if (name === 'cpf' && cpfError) {
      setCpfError('');
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cpfDigits = formData.cpf.replace(/\D/g, '');
    if (cpfDigits.length > 0 && !isValidCPF(cpfDigits)) {
      setCpfError('CPF inválido. Verifique os dígitos.');
      return;
    }

    const newUser: User = {
      id: generateId(),
      registrationCode: 'JET-' + generateId().slice(0, 4),
      name: formData.name,
      email: formData.email,
      cpf: cpfDigits.length === 0 ? undefined : cpfDigits,
      password: formData.password,
      address: formData.address,
      cep: formData.cep,
      phone: formData.phone,
      monthlyDueDate: 10,
      monthlyValue: 850,
      isBlocked: false,
      role: 'CLIENT',
      // Default values - Marina admin will configure these
      jetSkiManufacturer: '',
      jetSkiModel: '',
      jetSkiYear: '',
      ownerType: 'UNICO',
      jetName: ''
    };
    onRegister(newUser);
  };

  return (
    <div className="flex justify-center items-center py-6 animate-in slide-in-from-right duration-300">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-blue-50">
        <div className="flex flex-col items-center mb-10">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl mb-4 shadow-inner">
            <JetSkiLogo />
          </div>
          <h2 className="text-3xl font-black text-blue-900 tracking-tighter uppercase italic">GARAGE JET´S</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Informações pessoais</h3>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Nome Completo</label>
              <input
                name="name"
                required
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                placeholder="Digite seu nome completo"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">E-mail</label>
              <input
                name="email"
                type="email"
                required
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">CPF</label>
              <input
                name="cpf"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleChange}
                aria-invalid={cpfError ? 'true' : 'false'}
                aria-describedby={cpfError ? 'cpf-error' : undefined}
              />
              {cpfError ? (
                <p id="cpf-error" className="mt-2 text-xs font-semibold text-red-600">
                  {cpfError}
                </p>
              ) : null}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Endereço Completo</label>
              <input
                name="address"
                required
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                placeholder="Rua, número, bairro, cidade"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">CEP</label>
                <input
                  name="cep"
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                  placeholder="00.000-00"
                  value={formData.cep}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">Telefone</label>
                <input
                  name="phone"
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                  placeholder="(21) 00000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-2 ml-1">Senha de Acesso</label>
            <input
              name="password"
              type="password"
              required
              className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black transition-all"
              placeholder="Sua senha"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
            >
              Voltar
            </button>
            <button
              type="submit"
              className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 uppercase tracking-wider"
            >
              Cadastrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
