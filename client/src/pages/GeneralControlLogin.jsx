import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ArrowRight, Lock, User, Shield } from 'lucide-react';

export default function GeneralControlLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    if (navigator.vibrate) navigator.vibrate(50);
    setIsLoading(true);
    
    const response = await signIn(login, password);
    setIsLoading(false);

    if (response) {
      navigate('/general-dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center p-4 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-teal-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-sm z-10 relative">
        <div className="mb-10 text-center relative group">
          <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
          <div className="w-20 h-20 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 flex items-center justify-center mx-auto mb-6 shadow-2xl relative z-10 backdrop-blur-xl">
            <ClipboardCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Controle <span className="text-emerald-500">Geral</span></h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">Gestão de Frota e Ferramentas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Usuário</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors"><User className="w-5 h-5" /></div>
              <input 
                type="text" value={login} onChange={e => setLogin(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 text-white pl-12 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="Seu usuário" required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Senha</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-emerald-400 transition-colors"><Lock className="w-5 h-5" /></div>
              <input 
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 text-white pl-12 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="••••••••" required
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group mt-4">
            {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Acessar Painel <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></>}
          </button>
        </form>
        <div className="mt-8 text-center"><p className="text-xs text-slate-600 font-medium">MTSpeed Tecnologia • Módulo de Controle</p></div>
      </div>
    </div>
  );
}