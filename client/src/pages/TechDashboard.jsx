import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Search, Save, LogOut, Plus, Edit, X, CheckCircle, 
  ArrowLeft, ArrowRight, MapPin, QrCode, User, 
  Smartphone, Trash2, AlertTriangle, History, 
  PenTool, Home, Wrench, ChevronRight, Signal
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';

// --- COMPONENTES AUXILIARES ---

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-3 transition-all duration-300 ${active ? 'text-blue-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <div className={`p-1.5 rounded-full mb-1 transition-all ${active ? 'bg-blue-100' : 'bg-transparent'}`}>
      <Icon className={`w-6 h-6 ${active ? 'fill-blue-600 text-blue-600' : ''}`} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[10px] font-bold">{label}</span>
  </button>
);

const StepIndicator = ({ current, total }) => (
  <div className="flex items-center gap-1 w-full px-4 mb-6">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div 
          className={`h-full bg-blue-600 transition-all duration-500 ease-out ${i + 1 <= current ? 'w-full' : 'w-0'}`}
        />
      </div>
    ))}
  </div>
);

// Helper de vibração
const vibrate = () => { if (navigator.vibrate) navigator.vibrate(50); };

// Helper de Compressão (Inalterado, lógica essencial)
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024; const MAX_HEIGHT = 1024;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};

export default function TechDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // --- ESTADOS ---
  const [view, setView] = useState(() => {
    try { const s = localStorage.getItem('@NetControl:techState'); return s ? JSON.parse(s).view || 'home' : 'home'; } catch { return 'home'; }
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  
  // Formulários e Dados
  const [installData, setInstallData] = useState(() => {
    try {
      const saved = localStorage.getItem('@NetControl:draftInstall');
      return saved ? JSON.parse(saved) : {
        clientName: '', clientCode: '', address: '', coords: null, items: [], photos: [], observations: '', signature: ''
      };
    } catch { return { clientName: '', clientCode: '', address: '', coords: null, items: [], photos: [], observations: '', signature: '' }; }
  });

  // Auxiliares
  const [isScanning, setIsScanning] = useState(null);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [newItem, setNewItem] = useState({ brandId: '', modelId: '', serial: '', patrimony: '', mac: '', type: 'onu' });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Assinatura
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // --- EFEITOS ---
  useEffect(() => {
    api.get('/brands').then(r => setBrands(r.data)).catch(() => {});
    api.get('/models').then(r => setModels(r.data)).catch(() => {});
    api.get('/my-requests').then(r => setMyRequests(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('@NetControl:draftInstall', JSON.stringify(installData));
      localStorage.setItem('@NetControl:techState', JSON.stringify({ view }));
    }, 800);
    return () => clearTimeout(timer);
  }, [installData, view]);

  // --- LÓGICA DE INSTALAÇÃO ---
  const handleGetLocation = () => {
    vibrate();
    if (!navigator.geolocation) return toast.error("GPS não suportado.");
    const toastId = toast.loading("Buscando satélites...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addressText = installData.address;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data.address) {
            addressText = `${data.address.road || ''}, ${data.address.house_number || ''} - ${data.address.suburb || ''}`;
          }
        } catch (e) { console.error("Erro GPS", e); }
        setInstallData(prev => ({ ...prev, address: addressText, coords: { lat: latitude, lng: longitude } }));
        toast.success("Localização fixada!", { id: toastId });
      },
      (err) => toast.error("Erro ao obter GPS.", { id: toastId }),
      { enableHighAccuracy: true }
    );
  };

  const handleAddItem = () => {
    if (!newItem.brandId || !newItem.modelId || !newItem.serial || !newItem.patrimony) return toast.error("Preencha todos os campos obrigatórios.");
    const brandName = brands.find(b => b.id == newItem.brandId)?.name;
    const modelName = models.find(m => m.id == newItem.modelId)?.name;
    setInstallData(prev => ({ ...prev, items: [...prev.items, { ...newItem, brand: brandName, model: modelName, tempId: Date.now() }] }));
    setNewItem({ brandId: '', modelId: '', serial: '', patrimony: '', mac: '', type: 'onu' });
    toast.success("Equipamento adicionado!");
    vibrate();
  };

  const handleSubmit = async () => {
    vibrate();
    setLoading(true);
    try {
      await api.post('/installations', installData);
      toast.success("Instalação enviada com sucesso!");
      localStorage.removeItem('@NetControl:draftInstall');
      setInstallData({ clientName: '', clientCode: '', address: '', coords: null, items: [], photos: [], observations: '', signature: '' });
      setStep(1);
      setView('home');
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao enviar.");
    } finally { setLoading(false); }
  };

  // --- LÓGICA DE ASSINATURA ---
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#020617';
    ctx.beginPath(); ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };
  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top); ctx.stroke();
  };
  const stopDrawing = () => { if (isDrawing) { setIsDrawing(false); setInstallData(prev => ({ ...prev, signature: canvasRef.current.toDataURL() })); } };

  // --- RENDERERS ---

  // 1. HOME VIEW
  const renderHome = () => (
    <div className="p-4 space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Signal size={120} /></div>
        <div className="relative z-10">
          <p className="text-blue-100 text-sm font-medium mb-1">Bem-vindo,</p>
          <h2 className="text-2xl font-bold mb-4">{user?.name || 'Técnico'}</h2>
          <div className="flex gap-3">
            <button onClick={() => { setView('install'); setStep(1); vibrate(); }} className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95">
              <Plus size={20} /> Nova Instalação
            </button>
            <button onClick={() => { setView('conference'); vibrate(); }} className="flex-1 bg-white text-blue-700 p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95 shadow-lg">
              <Search size={20} /> Consultar
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Atividades Recentes</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{myRequests.length} total</span>
        </div>
        {myRequests.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2"/>
            <p className="text-slate-400 text-sm">Nenhuma atividade hoje.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.slice(0, 5).map(req => (
              <div key={req.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${req.type === 'INSTALLATION' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {req.type === 'INSTALLATION' ? <Home size={18}/> : <Wrench size={18}/>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{req.type === 'INSTALLATION' ? 'Instalação' : 'Movimentação'}</p>
                    <p className="text-xs text-slate-400">ID: #{req.id}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-bold ${req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {req.status === 'PENDING' ? 'Pendente' : req.status === 'APPROVED' ? 'Aprovado' : 'Recusado'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // 2. INSTALLATION WIZARD
  const renderInstallWizard = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : setView('home')} className="p-2 rounded-full hover:bg-slate-100"><ArrowLeft size={20} className="text-slate-600"/></button>
        <div className="flex-1">
          <h2 className="font-bold text-slate-800">Nova Instalação</h2>
          <p className="text-xs text-slate-400">Passo {step} de 4</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-24 pt-4">
        <StepIndicator current={step} total={4} />

        {/* STEP 1: CLIENTE */}
        {step === 1 && (
          <div className="px-4 space-y-4 animate-in slide-in-from-right duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-2"><User className="text-blue-500" size={20}/> <h3 className="font-bold text-slate-700">Dados do Cliente</h3></div>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                placeholder="Nome Completo" value={installData.clientName} onChange={e => setInstallData({...installData, clientName: e.target.value})} />
              <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                placeholder="Código PPPoE / Cliente" value={installData.clientCode} onChange={e => setInstallData({...installData, clientCode: e.target.value})} />
              <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                rows="3" placeholder="Endereço Completo" value={installData.address} onChange={e => setInstallData({...installData, address: e.target.value})} />
              
              <button onClick={handleGetLocation} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${installData.coords ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                <MapPin size={20} className={installData.coords ? "text-green-600" : "text-slate-400"}/> 
                {installData.coords ? "Localização Salva" : "Capturar GPS"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: EQUIPAMENTOS */}
        {step === 2 && (
          <div className="px-4 space-y-4 animate-in slide-in-from-right duration-300">
            {installData.items.map(item => (
              <div key={item.tempId} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center animate-in zoom-in-95">
                <div>
                  <h4 className="font-bold text-slate-800">{item.brand} {item.model}</h4>
                  <div className="flex gap-2 text-xs text-slate-500 mt-1">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{item.serial}</span>
                    {item.mac && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">MAC: {item.mac.slice(-4)}</span>}
                  </div>
                </div>
                <button onClick={() => setInstallData(prev => ({ ...prev, items: prev.items.filter(i => i.tempId !== item.tempId) }))} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                  <Trash2 size={18}/>
                </button>
              </div>
            ))}

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-2"><Smartphone className="text-blue-500" size={20}/> <h3 className="font-bold text-slate-700">Novo Equipamento</h3></div>
              
              <div className="grid grid-cols-2 gap-3">
                <select className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                  <option value="onu">ONU</option><option value="router">Roteador</option>
                </select>
                <select className="bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" value={newItem.brandId} onChange={e => setNewItem({...newItem, brandId: e.target.value})}>
                  <option value="">Marca</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" value={newItem.modelId} onChange={e => setNewItem({...newItem, modelId: e.target.value})}>
                <option value="">Selecione o Modelo...</option>{models.filter(m => m.brandId == newItem.brandId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>

              <div className="relative">
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-12 outline-none font-mono uppercase placeholder:normal-case" placeholder="Serial Number" value={newItem.serial} onChange={e => setNewItem({...newItem, serial: e.target.value})} />
                <button onClick={() => setIsScanning('serial')} className="absolute right-2 top-2 p-1.5 bg-slate-200 rounded-lg text-slate-600"><QrCode size={18}/></button>
              </div>

              <div className="relative">
                <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-12 outline-none font-mono uppercase placeholder:normal-case" placeholder="MAC (Opcional)" value={newItem.mac} onChange={e => setNewItem({...newItem, mac: e.target.value})} />
                <button onClick={() => setIsScanning('mac')} className="absolute right-2 top-2 p-1.5 bg-slate-200 rounded-lg text-slate-600"><QrCode size={18}/></button>
              </div>

              <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none font-mono uppercase placeholder:normal-case" placeholder="Patrimônio (Obrigatório)" value={newItem.patrimony} onChange={e => setNewItem({...newItem, patrimony: e.target.value})} />
              
              <button onClick={handleAddItem} className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Plus size={18}/> Adicionar Item
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FOTOS */}
        {step === 3 && (
          <div className="px-4 animate-in slide-in-from-right duration-300">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {installData.photos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => setInstallData(prev => ({...prev, photos: prev.photos.filter((_, i) => i !== idx)}))} className="bg-red-500 text-white p-2 rounded-full"><Trash2 size={20}/></button>
                  </div>
                </div>
              ))}
              <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 active:bg-slate-100 transition-colors cursor-pointer">
                <Camera size={32} className="mb-2"/>
                <span className="text-xs font-bold uppercase">Adicionar Foto</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                  const file = e.target.files[0];
                  if(file) {
                    const compressed = await compressImage(file);
                    setInstallData(prev => ({...prev, photos: [...prev.photos, compressed]}));
                  }
                }} />
              </label>
            </div>
            <div className="bg-blue-50 text-blue-700 p-4 rounded-xl flex gap-3 items-start">
              <AlertTriangle className="shrink-0 mt-0.5" size={20}/>
              <p className="text-xs leading-relaxed">Tire fotos legíveis dos equipamentos instalados, do nível de sinal na ONU e da organização do cabeamento.</p>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMAÇÃO E ASSINATURA */}
        {step === 4 && (
          <div className="px-4 space-y-4 animate-in slide-in-from-right duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg mb-4 text-center">Revisão Final</h3>
              
              <div className="space-y-3 text-sm bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
                <div className="flex justify-between"><span className="text-slate-500">Cliente:</span> <span className="font-bold text-slate-800">{installData.clientName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Itens:</span> <span className="font-bold text-slate-800">{installData.items.length} un.</span></div>
                <div className="flex justify-between"><span className="text-slate-500">GPS:</span> <span className={`font-bold ${installData.coords ? 'text-green-600' : 'text-red-500'}`}>{installData.coords ? 'OK' : 'Pendente'}</span></div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Assinatura do Cliente</label>
                <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50 touch-none relative h-40">
                  {installData.signature ? (
                    <>
                      <img src={installData.signature} className="w-full h-full object-contain p-2" />
                      <button onClick={() => setInstallData(prev => ({...prev, signature: ''}))} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg"><X size={16}/></button>
                    </>
                  ) : (
                    <>
                      <canvas ref={canvasRef} width={320} height={160} className="w-full h-full cursor-crosshair"
                        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                      <div className="absolute inset-x-0 bottom-2 text-center text-[10px] text-slate-300 pointer-events-none uppercase tracking-widest">Assine aqui</div>
                    </>
                  )}
                </div>
              </div>

              <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-sm mb-4" rows="3" 
                placeholder="Observações finais..." value={installData.observations} onChange={e => setInstallData({...installData, observations: e.target.value})} />

              <button onClick={handleSubmit} disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><CheckCircle size={20}/> Finalizar Instalação</>}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-20 flex justify-between items-center">
         <button disabled={step === 1} onClick={() => setStep(s => s - 1)} className="px-6 py-2 text-slate-500 font-bold disabled:opacity-30">Voltar</button>
         {step < 4 && (
           <button onClick={() => {
             if (step === 1 && !installData.clientName) return toast.error("Informe o nome.");
             if (step === 2 && installData.items.length === 0) return toast.error("Adicione equipamentos.");
             setStep(s => s + 1); vibrate();
           }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">
             Próximo <ArrowRight size={18}/>
           </button>
         )}
      </div>
    </div>
  );

  // --- RENDER PRINCIPAL ---
  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* HEADER GERAL (Só aparece se não estiver no Wizard) */}
      {view !== 'install' && (
        <div className="bg-white border-b border-slate-100 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Wrench className="text-white w-5 h-5"/></div>
            <h1 className="font-bold text-slate-800 text-lg tracking-tight">NetControl</h1>
          </div>
          <button onClick={() => { signOut(); navigate('/tech-login'); }} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
        </div>
      )}

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        {view === 'home' && renderHome()}
        {view === 'install' && renderInstallWizard()}
        {view === 'conference' && (
          <div className="p-4 h-full overflow-y-auto animate-in fade-in">
             <div className="flex gap-2 mb-4">
               <button onClick={() => setView('home')} className="p-3 bg-white border border-slate-200 rounded-xl"><ArrowLeft size={20}/></button>
               <input className="flex-1 bg-white border border-slate-200 rounded-xl px-4 outline-none focus:border-blue-500" placeholder="Buscar Serial..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
               <button onClick={async () => {
                 if(!searchTerm) return;
                 const res = await api.get('/items', { params: { search: searchTerm } });
                 setSearchResults(res.data.data);
               }} className="bg-blue-600 text-white px-4 rounded-xl"><Search/></button>
             </div>
             <div className="space-y-3">
               {searchResults.map(item => (
                 <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                   <h3 className="font-bold text-slate-800">{item.name}</h3>
                   <p className="text-xs text-slate-500">SN: {item.serial}</p>
                   <div className="mt-2 text-xs flex justify-between items-center">
                     <span className="bg-slate-100 px-2 py-1 rounded">{item.location}</span>
                     <span className={`font-bold ${item.status === 'disponivel' ? 'text-green-600' : 'text-blue-600'}`}>{item.status}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAVIGATION (Só na Home) */}
      {view === 'home' && (
        <div className="bg-white border-t border-slate-100 pb-safe pt-2 px-6 flex justify-between items-center z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
          <TabButton active={view === 'home'} icon={Home} label="Início" onClick={() => setView('home')} />
          <div className="w-px h-8 bg-slate-100 mx-2"></div>
          <TabButton active={false} icon={Search} label="Buscar" onClick={() => { setView('conference'); vibrate(); }} />
          <div className="w-px h-8 bg-slate-100 mx-2"></div>
          <TabButton active={false} icon={User} label="Perfil" onClick={() => toast("Em breve!")} />
        </div>
      )}

      {/* SCANNER OVERLAY */}
      {isScanning && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in fade-in duration-300">
          <div className="flex-1 relative">
            <Scanner onScan={(res) => {
              if (res && res.length > 0) {
                 const code = res[0].rawValue;
                 vibrate();
                 if (isScanning === 'serial') setNewItem(prev => ({...prev, serial: code}));
                 if (isScanning === 'mac') setNewItem(prev => ({...prev, mac: code}));
                 setIsScanning(null);
                 toast.success("Código lido!");
              }
            }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-blue-500 rounded-2xl relative shadow-[0_0_0_100vh_rgba(0,0,0,0.7)]">
                <div className="absolute top-2 left-0 w-full text-center text-white font-bold drop-shadow-md">
                   {isScanning === 'mac' ? 'Aponte para o MAC' : 'Aponte para o Serial'}
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setIsScanning(null)} className="bg-slate-900 text-white py-6 font-bold">Cancelar</button>
        </div>
      )}
    </div>
  );
}