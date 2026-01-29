import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Wifi, Lock, User, ArrowRight, Activity, HelpCircle, ArrowLeft } from 'lucide-react';
import api from './services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState('login');
  const [forgotUser, setForgotUser] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const success = await login(username, password);
      if (!success) setError('Credenciais inválidas. Verifique e tente novamente.');
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/forgot-password', { username: forgotUser });
      toast.success('Solicitação enviada! Contate o administrador.');
      setView('login');
      setForgotUser('');
    } catch (err) {
      toast.error('Erro ao solicitar recuperação. Verifique o usuário.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-white/20">
        <div className="p-8 md:p-10">
          {view === 'login' ? (
            <div className="animate-in fade-in slide-in-from-left duration-300">
              <div className="text-center mb-10">
            <div className="relative inline-block group">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
              <div className="bg-gradient-to-tr from-blue-600 to-blue-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 relative z-10 transform transition-transform group-hover:scale-105 duration-300">
                <Wifi className="text-white w-10 h-10" />
                <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center">
                  <Activity className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">NetControl <span className="text-blue-600">ISP</span></h1>
            <p className="text-slate-500 text-sm font-medium mt-2">Gestão Inteligente de Redes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Usuário</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                  placeholder="Ex: admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Senha</label>
              <div className="relative group">
                <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setView('forgot')} className="text-sm text-blue-600 hover:text-blue-700 font-bold transition-colors">
                Esqueci minha senha
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Entrar no Sistema <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
          
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} NetControl System v2.0</p>
          </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Recuperar Acesso</h2>
                <p className="text-slate-500 text-sm mt-2 font-medium">Informe seu usuário para notificar o administrador.</p>
              </div>

              <form onSubmit={handleForgot} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Seu Usuário</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                      placeholder="Ex: admin"
                      value={forgotUser}
                      onChange={(e) => setForgotUser(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar Solicitação'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button onClick={() => setView('login')} className="text-sm text-slate-500 hover:text-blue-600 font-bold flex items-center justify-center gap-2 mx-auto transition-colors group">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}