import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wrench, ArrowRight, Lock, User, Wifi, Activity } from 'lucide-react';

export default function TechLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
    setIsLoading(true);
    
    const response = await signIn(login, password);
    setIsLoading(false);

    if (response) {
      navigate('/tech-dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center p-4 font-sans selection:bg-blue-500 selection:text-white">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-sm z-10 relative">
        {/* Header com Logo Animado */}
        <div className="mb-10 text-center relative group">
          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
          <div className="w-20 h-20 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 flex items-center justify-center mx-auto mb-6 shadow-2xl relative z-10 backdrop-blur-xl">
            <Wifi className="w-10 h-10 text-blue-500" />
            <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center">
              <Activity className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NetControl <span className="text-blue-500">Tech</span></h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">Acesso Restrito ao Campo</p>
        </div>

        {/* Card de Login Glassmorphism */}
        <form onSubmit={handleLogin} className="space-y-5 bg-slate-900/60 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Credencial</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                value={login}
                onChange={e => setLogin(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 text-white pl-12 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="Usuário do sistema"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Senha</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 text-white pl-12 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group mt-4"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <>Acessar Painel <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-600 font-medium">© {new Date().getFullYear()} NetControl ISP System</p>
        </div>
      </div>
    </div>
  );
}