import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Wrench, ArrowRight, Lock, User, ArrowLeft } from 'lucide-react';

export default function TechLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setIsLoading(true);
    
    const response = await signIn(login, password);
    setIsLoading(false);

    if (response) {
      const user = JSON.parse(localStorage.getItem('@NetControl:user'));
      // Redireciona para o dashboard técnico
      navigate('/tech-dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Portal do Técnico</h1>
          <p className="text-slate-400 text-sm mt-1">Acesso rápido para campo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                value={login}
                onChange={e => setLogin(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white pl-10 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Seu usuário"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white pl-10 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Entrar <ArrowRight className="w-5 h-5"/></>}
          </button>
        </form>

        <button onClick={() => navigate('/login')} className="w-full mt-6 text-slate-500 text-sm flex items-center justify-center gap-2 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar ao sistema principal
        </button>

        <div className="mt-8 text-center text-xs text-slate-600">
          <p>© {new Date().getFullYear()} Desenvolvido por Matheus Hoffmann</p>
        </div>
      </div>
    </div>
  );
}