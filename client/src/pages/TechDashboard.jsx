import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Search, Save, LogOut, Plus, Edit, X, CheckCircle, 
  ArrowLeft, ArrowRight, MapPin, QrCode, WifiOff, User, 
  Smartphone, Image as ImageIcon, Trash2, AlertTriangle, HelpCircle, Clock, FileText, XCircle,
  Wrench, History, PenTool, Eye
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';

// Componente de Ajuda para Câmera em HTTP
const CameraHelpModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6">
    <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X/></button>
      <h3 className="text-lg font-bold text-red-600 flex items-center gap-2 mb-4">
        <AlertTriangle className="w-6 h-6"/> Câmera Bloqueada?
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Navegadores bloqueiam a câmera em sites não seguros (HTTP) por padrão. Para usar pelo IP (ex: 192.168...), siga os passos:
      </p>
      <ol className="text-sm text-gray-700 list-decimal list-inside space-y-2 mb-4 bg-gray-50 p-4 rounded-lg">
        <li>Abra o Chrome no celular.</li>
        <li>Digite na barra de endereço: <br/><code className="bg-yellow-100 px-1 rounded text-xs">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
        <li>Ative a opção (Enabled).</li>
        <li>No campo de texto que aparecer, digite o IP do sistema (ex: <code className="font-bold">http://192.168.250.102:5173</code>).</li>
        <li>Clique em <strong>Relaunch</strong> (Reiniciar) no rodapé.</li>
      </ol>
      <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Entendi</button>
    </div>
  </div>
);

// Helper de Compressão de Imagem (Evita travamentos por memória cheia)
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% qualidade
      };
    };
  });
};

export default function TechDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Estados Globais
  const [view, setView] = useState(() => {
    try { const s = localStorage.getItem('@NetControl:techState'); return s ? JSON.parse(s).view || 'menu' : 'menu'; } catch { return 'menu'; }
  });
  const [step, setStep] = useState(() => {
    try { const s = localStorage.getItem('@NetControl:techState'); return s ? JSON.parse(s).step || 1 : 1; } catch { return 1; }
  });

  const [loading, setLoading] = useState(false);
  const [showCameraHelp, setShowCameraHelp] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [myRequests, setMyRequests] = useState([]);
  const [requestFilter, setRequestFilter] = useState('ALL'); // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Dados da Instalação
  const [installData, setInstallData] = useState(() => {
    try {
      const saved = localStorage.getItem('@NetControl:draftInstall');
      return saved ? JSON.parse(saved) : {
        clientName: '', clientCode: '', address: '', coords: null, items: [], photos: [], observations: '', signature: ''
      };
    } catch {
      return { clientName: '', clientCode: '', address: '', coords: null, items: [], photos: [], observations: '', signature: '' };
    }
  });

  // Estados Auxiliares (Scanner/Formulários)
  const [isScanning, setIsScanning] = useState(null); // null, 'serial', 'mac'
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [newItem, setNewItem] = useState({ brandId: '', modelId: '', serial: '', patrimony: '', mac: '', type: 'onu' });
  const [selectedRequest, setSelectedRequest] = useState(null); // Para modal de detalhes

  // Refs e Lógica de Assinatura
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      setInstallData(prev => ({ ...prev, signature: canvas.toDataURL() }));
    }
  };

  const clearSignature = () => {
    setInstallData(prev => ({ ...prev, signature: '' }));
  };
  
  // Estados Conferência
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    // Carrega configurações
    api.get('/brands').then(r => setBrands(r.data)).catch(() => {});
    api.get('/models').then(r => setModels(r.data)).catch(() => {});

    // Carrega solicitações recentes
    api.get('/my-requests').then(r => setMyRequests(r.data)).catch(() => {});

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // Salva rascunho automaticamente
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('@NetControl:draftInstall', JSON.stringify(installData));
        localStorage.setItem('@NetControl:techState', JSON.stringify({ view, step }));
      } catch (e) { console.error("Erro ao salvar rascunho (Quota Excedida?)", e); }
    }, 800); // Debounce para evitar travamentos
    return () => clearTimeout(timer);
  }, [installData, view, step]);

  // --- AÇÕES ---

  const handleGetLocation = () => {
    if (!navigator.geolocation) return toast.error("GPS não suportado.");
    const toastId = toast.loading("Obtendo localização...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addressText = installData.address;

        // Reverse Geocoding (Preencher endereço automaticamente)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data.address) {
            const road = data.address.road || '';
            const suburb = data.address.suburb || data.address.neighbourhood || '';
            const number = data.address.house_number || '';
            addressText = `${road}, ${number} - ${suburb}`;
          }
        } catch (e) { console.error("Erro GPS Reverso", e); }

        setInstallData(prev => ({ ...prev, address: addressText, coords: { lat: latitude, lng: longitude } }));
        toast.success("Localização capturada!", { id: toastId });
      },
      (err) => {
        console.error(err);
        toast.error("Erro ao obter GPS. Verifique permissões.", { id: toastId });
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAddItem = () => {
    if (!newItem.brandId || !newItem.modelId || !newItem.serial) return toast.error("Preencha os dados do equipamento.");
    if (!newItem.patrimony) return toast.error("O Patrimônio é obrigatório.");
    
    const brandName = brands.find(b => b.id == newItem.brandId)?.name;
    const modelName = models.find(m => m.id == newItem.modelId)?.name;

    setInstallData(prev => ({
      ...prev,
      items: [...prev.items, { ...newItem, brand: brandName, model: modelName, tempId: Date.now() }]
    }));
    
    setNewItem({ brandId: '', modelId: '', serial: '', patrimony: '', mac: '', type: 'onu' }); // Reset form
    toast.success("Equipamento adicionado!");
  };

  const handleRemoveItem = (tempId) => {
    setInstallData(prev => ({ ...prev, items: prev.items.filter(i => i.tempId !== tempId) }));
  };

  const handleAddPhoto = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const toastId = toast.loading("Processando imagem...");
      try {
        const compressed = await compressImage(file);
        setInstallData(prev => ({ ...prev, photos: [...prev.photos, compressed] }));
        toast.dismiss(toastId);
      } catch (err) { toast.error("Erro na imagem", { id: toastId }); }
    }
  };

  const handleRemovePhoto = (index) => {
    setInstallData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  };

  const handleScan = (codes) => {
    if (codes && codes.length > 0) {
      let code = codes[0].rawValue;
      
      if (isScanning === 'search') {
         setSearchTerm(code);
         searchItems(code);
         setIsScanning(null);
         return;
      }

      if (isScanning === 'serial') {
        // Lógica de Ouro: Filtra apenas FHTT se for ONU
        if (newItem.type === 'onu') {
          const fhtt = codes.find(c => c.rawValue.toUpperCase().startsWith('FHTT'));
          if (fhtt) {
            code = fhtt.rawValue;
          } else if (!code.toUpperCase().startsWith('FHTT')) {
            return; // Ignora leitura se não for FHTT
          }
        }
        setNewItem(prev => ({ ...prev, serial: code }));
      } else if (isScanning === 'mac') {
        // Filtro MAC: Apenas hexadecimais válidos (12 chars)
        const clean = code.replace(/[^a-fA-F0-9]/g, '');
        if (clean.length !== 12) return; // Ignora se não for MAC
        setNewItem(prev => ({ ...prev, mac: code.toUpperCase() }));
      }

      setIsScanning(null);
      playBeep();
      toast.success("Lido: " + code);
    }
  };

  const handleSubmit = async () => {
    if (installData.items.length === 0) return toast.error("Adicione pelo menos um equipamento.");
    
    setLoading(true);
    try {
      if (!isOnline) {
        // Lógica Offline: Salva em fila (simplificado aqui para manter no rascunho)
        toast.success("Salvo offline! Envie quando tiver internet.");
        return;
      }

      await api.post('/installations', installData);
      toast.success("Instalação registrada com sucesso!");
      
      // Limpa tudo
      localStorage.removeItem('@NetControl:draftInstall');
      localStorage.removeItem('@NetControl:techState');
      setInstallData({ clientName: '', clientCode: '', address: '', coords: null, items: [], photos: [], observations: '', signature: '' });
      setStep(1);
      setView('menu');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erro ao enviar instalação.");
    } finally {
      setLoading(false);
    }
  };

  // --- AÇÕES CONFERÊNCIA ---
  const searchItems = async (term) => {
    if (!term) return;
    const toastId = toast.loading("Buscando...");
    try {
      const res = await api.get('/items', { params: { search: term, limit: 50 } });
      setSearchResults(res.data.data);
      if (res.data.data.length === 0) toast.error("Nada encontrado.", { id: toastId });
      else toast.dismiss(toastId);
    } catch (e) {
      toast.error("Erro ao buscar.", { id: toastId });
    }
  };

  const loadHistory = async (id) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/items/${id}/history`);
      setHistory(res.data);
    } catch (e) {
      toast.error("Erro ao carregar histórico.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    const toastId = toast.loading("Enviando solicitação...");
    try {
      await api.put(`/items/${selectedItem.id}`, selectedItem);
      toast.success("Solicitação enviada!", { id: toastId });
      setSelectedItem(null);
      searchItems(searchTerm); // Recarrega lista
    } catch (e) {
      toast.error("Erro ao salvar.", { id: toastId });
    }
  };

  // Helpers de Tradução
  const translateType = (type) => {
    const map = {
      'ADD_ITEM': 'Cadastro de Item',
      'EDIT_ITEM': 'Edição de Item',
      'MOVE_ITEM': 'Movimentação',
      'INSTALLATION': 'Instalação'
    };
    return map[type] || type;
  };

  const translateStatus = (status) => {
    const map = {
      'PENDING': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
      'APPROVED': { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
      'REJECTED': { label: 'Recusado', color: 'bg-red-100 text-red-700' }
    };
    return map[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const parseRequestDetails = (req) => {
    try {
      const data = JSON.parse(req.data);
      if (req.type === 'INSTALLATION') return `Cliente: ${data.clientName} (${data.items?.length || 0} itens)`;
      if (req.type === 'ADD_ITEM') return `${data.brand} ${data.model} - SN: ${data.serial}`;
      if (req.type === 'MOVE_ITEM') return `Ação: ${data.action} - ${data.clientName || ''}`;
      return 'Detalhes não disponíveis';
    } catch (e) { return 'Erro ao ler dados'; }
  };

  // --- RENDERIZAÇÃO ---

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 font-sans">
      {showCameraHelp && <CameraHelpModal onClose={() => setShowCameraHelp(false)} />}
      
      {/* Header */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {view !== 'menu' && <button onClick={() => {
            if (view === 'install' && step > 1) setStep(s => s - 1);
            else { setView('menu'); setSelectedItem(null); setSearchResults([]); setSearchTerm(''); }
          }} className="p-2 -ml-2 rounded-full active:bg-slate-100"><ArrowLeft className="w-6 h-6 text-slate-600"/></button>}
          <div>
            <h1 className="font-bold text-slate-800 text-lg">{view === 'menu' ? 'Painel Técnico' : (view === 'conference' ? 'Conferência' : 'Nova Instalação')}</h1>
            {view === 'install' && <p className="text-xs text-slate-500">Passo {step} de 4</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {!window.isSecureContext && (
            <button onClick={() => setShowCameraHelp(true)} className="p-2 text-orange-500 bg-orange-50 rounded-full animate-pulse">
              <HelpCircle className="w-6 h-6"/>
            </button>
          )}
          <button onClick={() => { signOut(); navigate('/tech-login'); }} className="p-2 text-slate-400 hover:text-red-500">
            <LogOut className="w-6 h-6"/>
          </button>
        </div>
      </div>

      {/* Conteúdo do Wizard */}
      <div className="flex-1 p-4 overflow-y-auto">
        
        {view === 'menu' && (
          <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom">
            <button onClick={() => { setView('install'); setStep(1); }} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-4 active:scale-95 transition-transform">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                <Plus className="w-10 h-10"/>
              </div>
              <span className="font-bold text-slate-700 text-xl">Nova Instalação</span>
            </button>

            <button onClick={() => setView('conference')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-4 active:scale-95 transition-transform">
              <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shadow-inner">
                <Wrench className="w-10 h-10"/>
              </div>
              <span className="font-bold text-slate-700 text-xl">Conferência / Manutenção</span>
            </button>
            
            <div className="mt-4">
              <h3 className="font-bold text-slate-500 text-sm uppercase mb-2">Minhas Solicitações Recentes</h3>
              {myRequests.length === 0 ? <p className="text-slate-400 text-sm">Nenhuma solicitação recente.</p> : (
                <div className="space-y-2">
                  {myRequests.slice(0, 3).map(req => (
                    <div key={req.id} onClick={() => setSelectedRequest(req)} className="bg-white p-3 rounded-xl border border-slate-100 text-sm flex justify-between items-center active:bg-slate-50 cursor-pointer">
                      <div>
                        <div className="font-bold text-slate-700">{translateType(req.type)}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{parseRequestDetails(req)}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${translateStatus(req.status).color}`}>{translateStatus(req.status).label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'conference' && (
          <div className="space-y-4 animate-in slide-in-from-right">
            {!selectedItem ? (
              <>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-2">
                  <input className="flex-1 p-3 bg-slate-50 rounded-xl outline-none" placeholder="Buscar Serial, Patrimônio ou Cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchItems(searchTerm)} />
                  <button onClick={() => setIsScanning('search')} className="p-3 bg-slate-200 text-slate-700 rounded-xl"><QrCode className="w-6 h-6"/></button>
                  <button onClick={() => searchItems(searchTerm)} className="p-3 bg-blue-600 text-white rounded-xl"><Search className="w-6 h-6"/></button>
                </div>
                <div className="space-y-2">
                  {searchResults.map(item => (
                    <div key={item.id} onClick={() => { setSelectedItem(item); loadHistory(item.id); }} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:bg-slate-50">
                      <h3 className="font-bold text-slate-800">{item.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">SN: {item.serial}</p>
                      <div className="flex justify-between mt-2 text-xs">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{item.clientName || 'Estoque'}</span>
                        <span className={`px-2 py-1 rounded ${item.status === 'disponivel' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-start">
                  <h2 className="font-bold text-lg text-slate-800">{selectedItem.name}</h2>
                  <button onClick={() => setSelectedItem(null)} className="p-1 bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
                </div>
                <div className="text-sm space-y-1 text-slate-600 bg-slate-50 p-3 rounded-xl">
                  <p><strong>Serial:</strong> {selectedItem.serial}</p>
                  <p><strong>Patrimônio:</strong> {selectedItem.patrimony}</p>
                  <p><strong>Cliente:</strong> {selectedItem.clientName || 'N/A'}</p>
                  <p><strong>Local:</strong> {selectedItem.location}</p>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm"><History className="w-4 h-4"/> Histórico Recente</h3>
                  {loadingHistory ? (
                    <div className="text-center py-4 text-slate-400 text-xs">Carregando histórico...</div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-xs">Nenhum registro encontrado.</div>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {history.map((h, i) => (
                        <div key={i} className="text-xs border-l-2 border-blue-200 pl-3 py-1 relative">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-slate-700">{h.action}</span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(h.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5 leading-tight">{h.details}</p>
                          <p className="text-[10px] text-slate-400 mt-1">Por: {h.user}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Atualizar Foto / Instalação</label>
                  <label className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer mb-3">
                    {selectedItem.photo ? <img src={selectedItem.photo} className="h-full object-contain"/> : <><Camera className="w-8 h-8 mb-1"/><span>Tirar Foto</span></>}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onload = () => setSelectedItem({...selectedItem, photo: r.result}); r.readAsDataURL(f); } }} />
                  </label>
                  <textarea className="w-full p-3 bg-slate-50 rounded-xl outline-none text-sm" rows="2" placeholder="Observações de manutenção..." value={selectedItem.observations || ''} onChange={e => setSelectedItem({...selectedItem, observations: e.target.value})} />
                </div>
                <button onClick={handleSaveEdit} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Save className="w-5 h-5"/> Salvar Alterações</button>
              </div>
            )}
          </div>
        )}

        {/* PASSO 1: CLIENTE */}
        {view === 'install' && step === 1 && (
          <div className="space-y-4 animate-in slide-in-from-right">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="font-bold text-slate-700 flex items-center gap-2"><User className="w-5 h-5 text-blue-600"/> Dados do Cliente</h2>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Ex: João da Silva" value={installData.clientName} onChange={e => setInstallData({...installData, clientName: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código / PPPoE</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Ex: 1234 ou joao.silva" value={installData.clientCode} onChange={e => setInstallData({...installData, clientCode: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Endereço / Local</label>
                <textarea className="w-full p-3 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" rows="2"
                  placeholder="Rua, Número, Bairro..." value={installData.address} onChange={e => setInstallData({...installData, address: e.target.value})} />
              </div>

              <button onClick={handleGetLocation} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${installData.coords ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                <MapPin className="w-5 h-5"/> {installData.coords ? "Localização Salva ✓" : "Pegar GPS Atual"}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: EQUIPAMENTOS */}
        {view === 'install' && step === 2 && (
          <div className="space-y-4 animate-in slide-in-from-right">
            {/* Lista de Itens Adicionados */}
            {installData.items.map(item => (
              <div key={item.tempId} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800">{item.brand} {item.model}</h3>
                  <p className="text-xs text-slate-500 font-mono">SN: {item.serial} {item.mac && `| MAC: ${item.mac}`}</p>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">{item.type}</span>
                </div>
                <button onClick={() => handleRemoveItem(item.tempId)} className="p-2 text-red-400 bg-red-50 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>
            ))}

            {/* Formulário de Adição */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="font-bold text-slate-700 flex items-center gap-2"><Smartphone className="w-5 h-5 text-blue-600"/> Adicionar Equipamento</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <select className="p-3 bg-slate-50 rounded-xl outline-none" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                  <option value="onu">ONU</option><option value="router">Roteador</option>
                </select>
                <select className="p-3 bg-slate-50 rounded-xl outline-none" value={newItem.brandId} onChange={e => setNewItem({...newItem, brandId: e.target.value})}>
                  <option value="">Marca...</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              
              <select className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={newItem.modelId} onChange={e => setNewItem({...newItem, modelId: e.target.value})}>
                <option value="">Modelo...</option>{models.filter(m => m.brandId == newItem.brandId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>

              <div className="flex gap-2">
                <input className="flex-1 p-3 bg-slate-50 rounded-xl outline-none font-mono uppercase" placeholder="Número de Série" value={newItem.serial} onChange={e => setNewItem({...newItem, serial: e.target.value})} />
                <button onClick={() => setIsScanning('serial')} className="p-3 bg-slate-200 text-slate-700 rounded-xl"><QrCode className="w-6 h-6"/></button>
              </div>

              <div className="flex gap-2">
                <input className="flex-1 p-3 bg-slate-50 rounded-xl outline-none font-mono uppercase" placeholder="Endereço MAC" value={newItem.mac} onChange={e => setNewItem({...newItem, mac: e.target.value})} />
                <button onClick={() => setIsScanning('mac')} className="p-3 bg-slate-200 text-slate-700 rounded-xl"><QrCode className="w-6 h-6"/></button>
              </div>

              <input className="w-full p-3 bg-slate-50 rounded-xl outline-none font-mono uppercase" placeholder="Patrimônio (Obrigatório)" value={newItem.patrimony} onChange={e => setNewItem({...newItem, patrimony: e.target.value})} />

              <button onClick={handleAddItem} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <Plus className="w-5 h-5"/> Adicionar à Lista
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: FOTOS */}
        {view === 'install' && step === 3 && (
          <div className="space-y-4 animate-in slide-in-from-right">
            <div className="grid grid-cols-2 gap-3">
              {installData.photos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button onClick={() => handleRemovePhoto(idx)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow"><X className="w-4 h-4"/></button>
                </div>
              ))}
              
              <label className="aspect-square bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 active:bg-slate-50 cursor-pointer">
                <Camera className="w-8 h-8 mb-2"/>
                <span className="text-xs font-bold">TIRAR FOTO</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddPhoto} />
              </label>
            </div>
            <p className="text-center text-xs text-slate-400">Tire fotos do equipamento instalado e do sinal.</p>
          </div>
        )}

        {/* PASSO 4: RESUMO */}
        {view === 'install' && step === 4 && (
          <div className="space-y-4 animate-in slide-in-from-right">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8"/>
              </div>
              <h2 className="text-xl font-bold text-slate-800">Pronto para Enviar?</h2>
              <p className="text-slate-500 text-sm mb-6">Revise os dados da instalação abaixo.</p>
              
              <div className="text-left space-y-3 bg-slate-50 p-4 rounded-xl text-sm mb-6">
                <p><strong>Cliente:</strong> {installData.clientName}</p>
                <p><strong>Código:</strong> {installData.clientCode || '-'}</p>
                <p><strong>Itens:</strong> {installData.items.length} equipamentos</p>
                <p><strong>Fotos:</strong> {installData.photos.length} anexadas</p>
                <p><strong>GPS:</strong> {installData.coords ? 'Capturado' : 'Não capturado'}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 text-left">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-sm">
                  <PenTool className="w-4 h-4"/> Assinatura do Cliente
                </h3>
                
                {installData.signature ? (
                  <div className="relative bg-slate-50 rounded-lg border border-slate-200 p-2">
                    <img src={installData.signature} alt="Assinatura" className="h-32 mx-auto object-contain" />
                    <button onClick={clearSignature} className="absolute top-2 right-2 bg-red-100 text-red-600 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                      <Trash2 className="w-3 h-3"/> Limpar
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden touch-none">
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={160}
                      className="w-full h-40 bg-white cursor-crosshair"
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                    />
                    <div className="bg-slate-100 p-1 text-center text-[10px] text-slate-400 uppercase font-bold">Assine no quadro acima</div>
                  </div>
                )}
              </div>

              <textarea className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm mb-4" rows="3"
                  placeholder="Observações finais da instalação..." value={installData.observations} onChange={e => setInstallData({...installData, observations: e.target.value})} />

              <button onClick={() => setShowConfirmModal(true)} disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? "Enviando..." : <><Save className="w-5 h-5"/> Finalizar Instalação</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer de Navegação */}
      {view === 'install' && <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 flex justify-between items-center z-20">
        {step > 1 ? (
          <button onClick={() => setStep(s => s - 1)} className="text-slate-500 font-bold px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">Voltar</button>
        ) : <div className="w-16"/>}

        <div className="flex gap-1">
          {[1,2,3,4].map(i => (
            <div key={i} className={`h-2 w-2 rounded-full transition-colors ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`}/>
          ))}
        </div>
        
        {step < 4 ? (
          <button onClick={() => {
            if (step === 1 && !installData.clientName) return toast.error("Informe o nome do cliente.");
            setStep(s => s + 1);
          }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">
            Próximo <ArrowRight className="w-5 h-5"/>
          </button>
        ) : <div className="w-24"/>}</div>}

      {/* Modal Scanner */}
      {isScanning && (
        <div className="fixed inset-0 bg-black z-[80] flex flex-col">
          <div className="flex-1 relative">
            <Scanner 
              onScan={handleScan} 
              onError={(e) => console.log(e)} 
              formats={[
                'qr_code', 
                'code_128', 
                'code_39', 
                'ean_13', 
                'ean_8', 
                'codabar'
              ]}
            />
            {/* Overlay Retangular para Código de Barras */}
            <div className="absolute inset-0 border-2 border-blue-500/50 pointer-events-none flex items-center justify-center">
              <div className="w-80 h-32 border-2 border-blue-400 rounded-lg relative shadow-[0_0_0_100vh_rgba(0,0,0,0.6)]">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                <div className="absolute -top-8 left-0 w-full text-center text-white font-bold drop-shadow-md">
                  {isScanning === 'search' ? 'Aponte para buscar...' : (isScanning === 'mac' ? 'Aponte para o MAC Address' : (newItem.type === 'onu' ? 'Aponte para o código FHTT' : 'Aponte para o Serial'))}
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setIsScanning(null)} className="bg-white text-slate-800 py-6 font-bold text-lg">Cancelar Leitura</button>
        </div>
      )}

      {/* Modal Confirmação Final */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8"/>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Confirmar Envio?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Verifique se todos os equipamentos e fotos foram adicionados corretamente. Essa ação não pode ser desfeita.
              </p>
              
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                  Revisar
                </button>
                <button onClick={() => { setShowConfirmModal(false); handleSubmit(); }} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-colors">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes da Solicitação */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Detalhes da Solicitação</h3>
              <button onClick={() => setSelectedRequest(null)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${translateStatus(selectedRequest.status).color}`}>{translateStatus(selectedRequest.status).label}</span>
                <p className="text-xs text-slate-400 mt-1">{new Date(selectedRequest.createdAt).toLocaleString()}</p>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 space-y-1">
                <p><strong>Tipo:</strong> {translateType(selectedRequest.type)}</p>
                <p><strong>Resumo:</strong> {parseRequestDetails(selectedRequest)}</p>
                {selectedRequest.adminNotes && (
                  <p className="text-red-500 mt-2 pt-2 border-t border-slate-200"><strong>Nota do Admin:</strong> {selectedRequest.adminNotes}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
