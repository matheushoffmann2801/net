import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, User, Wifi, MapPin, ArrowRight, Server, ShieldCheck, HelpCircle, Key, Wrench, ClipboardCheck } from 'lucide-react';
import api from '../services/api';
import logo from './logo.png';

export default function Login() {
  const [step, setStep] = useState(1);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const [view, setView] = useState('login'); // 'login' | 'forgot'
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotUser, setForgotUser] = useState('');

  const { signIn, setSessionCity } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setIsLoading(true);
    
    // Pequeno delay artificial para sensação de processamento seguro
    setTimeout(async () => {
      const response = await signIn(login, password); // signIn agora retorna o objeto completo ou false
      setIsLoading(false);

      if (response) {
        const user = JSON.parse(localStorage.getItem('@NetControl:user'));
        
        if (response.mustChangePassword) {
          setTempUser(user);
          return setView('changePassword');
        }

        if (user.role?.toLowerCase() === 'admin' || user.allowedCities?.includes('Todas') || user.allowedCities?.length > 1) {
          setTempUser(user);
          setStep(2);
        } else {
          setSessionCity(user.allowedCities?.[0] || 'Nova Maringá');
          navigate('/');
        }
      }
    }, 800);
  }

  function handleCitySelect(city) {
    setSessionCity(city);
    toast.success(`Conectado a ${city}`, { icon: '🚀' });
    navigate('/');
  }

  async function handleForgot(e) {
    e.preventDefault();
    if(!forgotUser) return toast.error("Digite seu usuário.");
    setIsLoading(true);
    try {
      await api.post('/forgot-password', { username: forgotUser });
      toast.success("Solicitação enviada! Contate o administrador para concluir.", { duration: 5000 });
      setView('login');
      setForgotUser('');
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao solicitar.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPassword.length < 4) return toast.error("Senha muito curta.");
    if (newPassword === 'mudar123') return toast.error("Crie uma senha diferente da padrão.");
    if (newPassword !== confirmPassword) return toast.error("As senhas não conferem.");
    
    try {
      await api.put(`/users/${tempUser.id}`, { ...tempUser, password: newPassword });
      toast.success("Senha atualizada! Entre novamente.");
      window.location.reload();
    } catch (error) {
      toast.error("Erro ao atualizar senha.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      <style>{`
        @keyframes shine {
          0% { left: -100%; opacity: 0; }
          10% { left: 100%; opacity: 0.5; }
          20% { left: 100%; opacity: 0; }
          100% { left: 100%; opacity: 0; }
        }
        .logo-shine {
          position: relative;
          overflow: hidden;
          display: inline-block;
        }
        .logo-shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent);
          transform: skewX(-25deg);
          animation: shine 10s infinite;
          pointer-events: none;
        }
      `}</style>
      {/* Elementos de Fundo (Decoração) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-10 relative">
        
        {/* Cabeçalho */}
        <div className="p-8 text-center border-b border-gray-100">
          <div className="logo-shine">
            <img src={logo} alt="MTSpeed Logo" className="w-96 h-auto mx-auto drop-shadow-sm hover:scale-105 transition-transform duration-500 animate-in fade-in zoom-in duration-1000" />
          </div>
        </div>

        <div className="p-8">
          {view === 'changePassword' ? (
            <form onSubmit={handleChangePassword} className="space-y-5 animate-in slide-in-from-right">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Key className="w-6 h-6"/>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Troca Obrigatória</h3>
                <p className="text-sm text-gray-500">Sua senha foi resetada. Crie uma nova para continuar.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nova Senha</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400"/></div>
                  <input autoFocus type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="block w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" placeholder="Nova senha segura" required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Confirmar Senha</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400"/></div>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="block w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" placeholder="Repita a nova senha" required />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2">
                Salvar e Entrar
              </button>
            </form>
          ) : view === 'forgot' ? (
            <form onSubmit={handleForgot} className="space-y-5 animate-in slide-in-from-right">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <HelpCircle className="w-6 h-6"/>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Recuperar Acesso</h3>
                <p className="text-sm text-gray-500">Informe seu usuário para notificar o administrador.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Seu Usuário</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-400"/></div>
                  <input autoFocus type="text" value={forgotUser} onChange={e => setForgotUser(e.target.value)} className="block w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: joao.silva" required />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Enviar Solicitação'}
              </button>
              
              <button type="button" onClick={() => setView('login')} className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium">
                Voltar para Login
              </button>
            </form>
          ) : step === 1 ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Usuário</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input 
                    type="text" 
                    value={login} 
                    onChange={e => setLogin(e.target.value)} 
                    className="block w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all focus:bg-white" 
                    placeholder="Seu usuário de rede" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Senha</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="block w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all focus:bg-white" 
                    placeholder="••••••••" 
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg transform active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button type="button" onClick={() => setView('forgot')} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">Esqueci minha senha</button>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-6">
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => navigate('/tech-login')} className="py-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-blue-100">
                    <Wrench className="w-4 h-4"/> Acesso Técnico
                  </button>
                  <button type="button" onClick={() => navigate('/general-login')} className="py-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-emerald-100">
                    <ClipboardCheck className="w-4 h-4"/> Controle Geral
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3 animate-in slide-in-from-right duration-300">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Onde vamos trabalhar?</h3>
                <p className="text-sm text-gray-500">Selecione a base operacional</p>
              </div>

              {(tempUser?.role?.toLowerCase() === 'admin' || tempUser?.allowedCities?.includes('Todas')) && (
                <button onClick={() => handleCitySelect('Todas')} 
                  className="w-full p-4 bg-purple-50 border border-purple-100 hover:border-purple-300 hover:bg-purple-100 rounded-xl flex items-center justify-between group transition-all hover:translate-x-1">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Server className="w-5 h-5"/></div>
                    <div className="text-left">
                      <p className="font-bold text-gray-800">Matriz (Visão Global)</p>
                      <p className="text-xs text-purple-600">Acesso total ao estoque</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-purple-400 group-hover:text-purple-600"/>
                </button>
              )}

              {["Nova Maringá", "Tapurah", "São José do Rio Claro"].map(city => {
                 if (tempUser?.role?.toLowerCase() !== 'admin' && !tempUser?.allowedCities?.includes('Todas') && !tempUser?.allowedCities?.includes(city)) return null;
                 return (
                  <button key={city} onClick={() => handleCitySelect(city)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 hover:bg-white hover:border-blue-300 hover:shadow-sm rounded-xl flex items-center justify-between transition-all hover:translate-x-1 group">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 group-hover:text-blue-500"/>
                      <span className="font-medium text-gray-700 group-hover:text-blue-700">{city}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500"/>
                  </button>
                 )
              })}
            </div>
          )}
        </div>
        
        {/* Rodapé do Cartão */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Sistema Seguro • MTSpeed v2.1 <br/>
            Dev: Matheus Hoffmann
          </p>
        </div>
      </div>
    </div>
  );
}