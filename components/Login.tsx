
import React, { useState } from 'react';

const JetSkiLogo = ({ className = "w-24 h-24" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 20C4 18.5 6 20 8 20C10 20 12 18.5 14 18.5C16 18.5 18 20 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    <path d="M4 16L18 13.5L22 16L21 17.5H5L4 16Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M12 13.5L14 10H17L18 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15 10C15 10 15.5 8 16.5 8C17.5 8 18 10 18 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 15C1 15 0 14 0 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

interface Props {
  onLogin: (email: string, password: string, role: 'CLIENT' | 'MARINA') => void;
  onGoToRegister: () => void;
}

const Login: React.FC<Props> = ({ onLogin, onGoToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@marina.com') {
      onLogin(email, password, 'MARINA');
    } else {
      onLogin(email, password, 'CLIENT');
    }
  };

  return (
    <div className="flex justify-center items-center py-10 animate-in fade-in zoom-in duration-500">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-blue-50 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 p-8 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-[2.5rem] shadow-2xl transform hover:scale-105 transition-transform duration-500">
            <JetSkiLogo className="w-20 h-20" />
          </div>
          
          <h2 className="text-4xl font-black text-center text-blue-900 mb-8 tracking-tighter uppercase italic">GARAGE JET´S</h2>
          
          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">E-mail de Acesso</label>
              <input
                type="email"
                required
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 font-medium"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
              <input
                type="password"
                required
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all duration-300 shadow-lg shadow-blue-200 transform active:scale-95 uppercase tracking-wider mt-4"
            >
              Entrar
            </button>
          </form>

          <div className="mt-10 text-center w-full">
            <p className="text-gray-500 text-sm font-medium">
              Não tem uma conta?{' '}
              <button onClick={onGoToRegister} className="text-blue-600 font-black hover:text-blue-800 transition-colors">
                Cadastre-se
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
