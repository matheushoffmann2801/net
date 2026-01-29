import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Search, Save, LogOut, Plus, Edit, X, CheckCircle, 
  ArrowLeft, ArrowRight, MapPin, QrCode, User, 
  Smartphone, Trash2, AlertTriangle, History, 
  PenTool, Home, Wrench, ChevronRight, Signal, Zap, Eye
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import Tesseract from 'tesseract.js';

// --- COMPONENTES AUXILIARES ---

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 active:scale-90 ${active ? 'text-blue-400' : 'text-white/40 hover:text-white/80'}`}
  >
    <div className={`p-2 rounded-2xl transition-all duration-500 ${active ? 'bg-white/10 shadow-[0_0_20px_rgba(59,130,246,0.4)] -translate-y-1' : ''}`}>
      <Icon className={`w-6 h-6 ${active ? 'stroke-blue-400' : 'stroke-current'}`} strokeWidth={active ? 2.5 : 2} />
    </div>
    {active && <span className="text-[10px] font-medium tracking-wide mt-1 animate-in fade-in slide-in-from-bottom-1 absolute -bottom-2">{label}</span>}
  </button>
);

const StepIndicator = ({ current, total }) => (
  <div className="w-full px-6 mb-8">
    <div className="flex justify-between items-center relative">
      {/* Background Line */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/10 rounded-full -z-10"></div>
      
      {/* Progress Line */}
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 rounded-full -z-10 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
        style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
      ></div>

      {Array.from({ length: total }).map((_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum <= current;
        const isCurrent = stepNum === current;
        
        return (
          <div key={i} className="flex flex-col items-center gap-2 relative">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-500 ${
                isActive 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' 
                  : 'bg-black/40 border-white/10 text-slate-600 backdrop-blur-md'
              }`}
            >
              {isActive && stepNum < current ? <CheckCircle size={14} /> : stepNum}
            </div>
            {isCurrent && <span className="absolute -bottom-6 text-[10px] font-bold text-blue-400 whitespace-nowrap animate-in fade-in slide-in-from-top-2 tracking-wider uppercase">
                {stepNum === 1 ? 'Cliente' : stepNum === 2 ? 'Itens' : stepNum === 3 ? 'Fotos' : 'Fim'}
            </span>}
          </div>
        );
      })}
    </div>
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

// Estilos globais para animações avançadas
const globalStyles = `
  @keyframes scan-line {
    0% { top: 0%; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  .animate-scan { animation: scan-line 2s linear infinite; }
`;

// --- COMPONENTE DE OCR ---
const OcrScannerModal = ({ onClose, onScanSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Câmera bloqueada! Use HTTPS ou localhost.");
      onClose();
      return;
    }
    // Inicia a câmera com resolução melhor para OCR
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment', 
        width: { ideal: 1920 }, 
        height: { ideal: 1080 },
        focusMode: 'continuous'
      } 
    })
      .then(s => {
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => { toast.error("Câmera não acessível."); onClose(); });

    // Limpeza ao desmontar
    return () => streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const toggleTorch = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      const capabilities = track.getCapabilities();
      if (capabilities.torch) {
        track.applyConstraints({ advanced: [{ torch: !torchOn }] })
          .then(() => setTorchOn(!torchOn))
          .catch(() => toast.error("Erro ao alternar flash"));
      } else {
        toast.error("Flash não disponível");
      }
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setProcessing(true);
    toast.loading('Analisando imagem...', { id: 'ocr' });

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Dimensões do vídeo
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0) {
        setProcessing(false);
        return;
    }

    // CROP: Foca apenas na área central (onde está o retângulo guia)
    // O guia visual é w-4/5 (80%) e h-1/4 (25%)
    const cropWidth = width * 0.8;
    const cropHeight = height * 0.25;
    const startX = (width - cropWidth) / 2;
    const startY = (height - cropHeight) / 2;

    // UPSCALE: Aumenta a resolução para ajudar o OCR em textos manuscritos
    const scale = 2.0; // Ajustado para 2.0 para ganhar performance sem perder precisão
    canvas.width = cropWidth * scale;
    canvas.height = cropHeight * scale;

    // Desenha apenas a parte recortada no canvas
    context.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth * scale, cropHeight * scale);
    
    // Salva a imagem original (colorida) para evidência antes de aplicar filtros
    const evidenceUrl = canvas.toDataURL('image/jpeg', 0.8);

    // PRÉ-PROCESSAMENTO AVANÇADO: Normalização de Histograma (Contrast Stretching)
    const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    
    // 1. Encontrar Min e Max de luminosidade na imagem (para esticar o contraste)
    let min = 255;
    let max = 0;
    const grayBuffer = new Uint8Array(d.length / 4); // Buffer auxiliar

    for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i+1];
        const b = d[i+2];
        // Luminosidade
        const v = 0.2126*r + 0.7152*g + 0.0722*b;
        grayBuffer[i/4] = v;
        if (v < min) min = v;
        if (v > max) max = v;
    }

    // Evita divisão por zero
    if (max === min) max = min + 1;

    // 2. Aplicar Normalização e Binarização Suave
    for (let i = 0; i < d.length; i += 4) {
        let v = grayBuffer[i/4];
        
        // Estica o contraste: O pixel mais escuro vira 0, o mais claro vira 255
        v = ((v - min) * 255) / (max - min);
        
        // Binarização Suave (Mantém bordas para o OCR entender melhor o traço)
        if (v < 80) v = 0;         // Preto absoluto para tinta forte
        else if (v > 180) v = 255; // Branco absoluto para fundo
        // Valores entre 80 e 180 mantêm tons de cinza (anti-aliasing natural)

        d[i] = d[i+1] = d[i+2] = v;
    }
    context.putImageData(imgData, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/png');

    try {
      // Usa 'eng' pois é mais leve e números são universais.
      // Adiciona whitelist para forçar apenas números (ajuda a não confundir I com 1, etc)
      const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', {
        tessedit_char_whitelist: '0123456789'
      });
      
      // Limpeza básica de erros comuns de OCR em números (O -> 0, I/l -> 1)
      const cleanText = text.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');

      // Procura por qualquer sequência numérica
      const matches = cleanText.match(/\d+/g);

      if (matches && matches.length > 0) {
        // Filtra candidatos: Patrimônios geralmente são curtos (até 4 dígitos)
        // Ignora números muito longos que provavelmente são Seriais ou Telefones
        const candidates = matches.filter(m => m.length >= 1 && m.length <= 4);

        if (candidates.length > 0) {
           // Pega o maior número dentro do range aceitável (ex: prefere 1234 a 1)
           const foundPatrimony = candidates.sort((a,b) => b.length - a.length)[0];
           onScanSuccess(foundPatrimony, evidenceUrl);
           toast.success(`Patrimônio: ${foundPatrimony}`, { id: 'ocr' });
        } else {
           toast.error("Nenhum número curto (até 5 dígitos) encontrado.", { id: 'ocr' });
        }
      } else {
        toast.error("Texto não reconhecido. Tente focar melhor ou aproximar.", { id: 'ocr' });
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar imagem.", { id: 'ocr' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in fade-in duration-300">
      <style>{globalStyles}</style>
      <div className="flex-1 relative bg-black">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain"></video>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4/5 h-1/4 border-2 border-white/30 rounded-xl relative overflow-hidden bg-white/5 backdrop-blur-[2px]">
             <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,1)] animate-scan"></div>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
      <div className="p-4 bg-slate-900 flex gap-4 items-center">
        <button onClick={toggleTorch} className={`p-4 rounded-lg font-bold transition-colors ${torchOn ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'}`}>
          <Zap size={24} className={torchOn ? "fill-black" : ""} />
        </button>
        <button onClick={onClose} className="flex-1 bg-slate-700 text-white py-4 rounded-lg font-bold">Cancelar</button>
        <button onClick={handleCapture} disabled={processing} className="flex-1 bg-blue-600 text-white py-4 rounded-lg font-bold disabled:bg-slate-500">{processing ? 'Analisando...' : 'Capturar'}</button>
      </div>
    </div>
  );
};

// --- MODAL DE DETALHES DA SOLICITAÇÃO ---
const RequestDetailsModal = ({ request, onClose }) => {
  if (!request) return null;
  let data = {};
  try {
    data = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
  } catch(e) {}
  
  const isInstall = request.type === 'INSTALLATION';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Solicitação #{request.id}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Status Banner */}
          <div className={`p-3 rounded-xl border flex items-start gap-3 ${
            request.status === 'REJECTED' ? 'bg-red-50 border-red-100 text-red-700' : 
            request.status === 'APPROVED' ? 'bg-green-50 border-green-100 text-green-700' : 
            'bg-yellow-50 border-yellow-100 text-yellow-700'
          }`}>
            {request.status === 'REJECTED' ? <AlertTriangle className="shrink-0 mt-0.5"/> : <CheckCircle className="shrink-0 mt-0.5"/>}
            <div>
              <p className="font-bold text-sm uppercase">{request.status === 'PENDING' ? 'Em Análise' : request.status === 'APPROVED' ? 'Aprovado' : 'Recusado'}</p>
              {request.status === 'REJECTED' && request.adminNotes && (
                <p className="text-sm mt-1"><strong>Motivo:</strong> {request.adminNotes}</p>
              )}
            </div>
          </div>

          {/* Installation Details */}
          {isInstall ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Cliente</h4>
                <p className="font-medium text-slate-800">{data.clientName}</p>
                <p className="text-sm text-slate-500">{data.address}</p>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Equipamentos ({data.items?.length})</h4>
                <div className="space-y-2">
                  {data.items?.map((item, i) => (
                    <div key={i} className="bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                      <p className="font-bold text-slate-700">{item.brand} {item.model}</p>
                      <div className="flex gap-2 text-xs text-slate-500">
                        <span>SN: {item.serial}</span>
                        {item.patrimony && <span>PAT: {item.patrimony}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data.photos?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Fotos</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {data.photos.map((photo, i) => (
                      <img key={i} src={photo} className="w-full h-20 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(photo, '_blank')} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Generic Details
            <div className="space-y-2">
               <h4 className="text-xs font-bold text-slate-400 uppercase">Dados da Solicitação</h4>
               <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-mono overflow-x-auto">
                 <pre>{JSON.stringify(data, null, 2)}</pre>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
  const lastScanErrorRef = useRef(0);
  
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
  const [isOcrActive, setIsOcrActive] = useState(false);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [newItem, setNewItem] = useState({ brandId: '', modelId: '', serial: '', patrimony: '', mac: '', type: 'onu' });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  // Assinatura
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // --- EFEITOS ---
  useEffect(() => {
    api.get('/brands').then(r => setBrands(r.data)).catch(() => {});
    api.get('/models').then(r => setModels(r.data)).catch(() => {});
    
    // Polling para notificações de status (Verifica atualizações a cada 15s)
    const fetchRequests = async () => {
      try {
        const { data: newRequests } = await api.get('/my-requests');
        setMyRequests(prev => {
          // Se já existiam dados, compara para achar mudanças de status
          if (prev.length > 0) {
            newRequests.forEach(newReq => {
              const oldReq = prev.find(p => p.id === newReq.id);
              // Detecta mudança de PENDENTE para FINALIZADO
              if (oldReq && oldReq.status === 'PENDING' && newReq.status !== 'PENDING') {
                if (newReq.status === 'APPROVED') {
                  toast.success((t) => (
                    <div onClick={() => { setSelectedRequest(newReq); toast.dismiss(t.id); }} className="cursor-pointer">
                      <p className="font-bold">Solicitação #{newReq.id} Aprovada!</p>
                      <p className="text-xs">Toque para ver detalhes</p>
                    </div>
                  ), { duration: 6000, icon: '🎉' });
                  if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Vibração de festa
                } else if (newReq.status === 'REJECTED') {
                  toast.error((t) => (
                    <div onClick={() => { setSelectedRequest(newReq); toast.dismiss(t.id); }} className="cursor-pointer">
                      <p className="font-bold">Solicitação #{newReq.id} Recusada</p>
                      <p className="text-xs">Toque para ver o motivo</p>
                    </div>
                  ), { duration: 8000 });
                  if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // Vibração de alerta
                }
              }
            });
          }
          return newRequests;
        });
      } catch (e) { console.error("Erro no polling", e); }
    };

    fetchRequests(); // Carga inicial
    const interval = setInterval(fetchRequests, 15000); // Polling ativo
    return () => clearInterval(interval);
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
    <div className="p-6 space-y-8 pb-32 animate-in fade-in duration-700 max-w-2xl mx-auto relative z-10">
      
      {selectedRequest && <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}

      {/* Welcome Card - Minimal Glass */}
      <div className="bg-white/5 backdrop-blur-2xl rounded-[2rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-500"><Signal size={180} /></div>
        
        <div className="relative z-10 flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
               <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Online</span>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Olá, {user?.name?.split(' ')[0] || 'Técnico'}</h2>
            <p className="text-white/50 text-sm flex items-center gap-2 mt-1 font-medium"><MapPin size={14}/> {user?.allowedCities?.[0] || 'Em Campo'}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-inner">
            <User className="text-white/80" size={24} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => { setView('install'); setStep(1); vibrate(); }} className="bg-blue-600/80 hover:bg-blue-600 text-white p-5 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-[0.96] shadow-lg shadow-blue-900/20 border border-white/10 backdrop-blur-md group/btn">
              <div className="p-3 bg-white/20 rounded-full"><Plus size={24} /></div>
              <span className="font-bold text-sm tracking-wide">Nova Instalação</span>
           </button>
           <button onClick={() => { setView('conference'); vibrate(); }} className="bg-white/5 hover:bg-white/10 text-white p-5 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-[0.96] backdrop-blur-md border border-white/10 group/btn">
              <div className="p-3 bg-white/5 rounded-full border border-white/5"><Search size={24} /></div>
              <span className="font-bold text-sm tracking-wide text-white/70 group-hover/btn:text-white">Consultar</span>
           </button>
        </div>
      </div>

      {/* Stats Row - Minimal */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Instalações', value: myRequests.filter(r => r.type === 'INSTALLATION').length, color: 'text-blue-400' },
          { label: 'Pendentes', value: myRequests.filter(r => r.status === 'PENDING').length, color: 'text-yellow-400' },
          { label: 'Aprovados', value: myRequests.filter(r => r.status === 'APPROVED').length, color: 'text-emerald-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 text-center hover:bg-white/10 transition-colors">
             <p className={`text-3xl font-bold ${stat.color} tracking-tighter`}>{stat.value}</p>
             <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity - Clean List */}
      <div>
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="font-bold text-white/90 text-lg tracking-tight">Atividade Recente</h3>
        </div>
        
        {myRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/30 bg-white/5 rounded-3xl border border-dashed border-white/10 backdrop-blur-sm">
            <History size={32} className="mb-3 opacity-50"/>
            <p className="text-sm font-medium">Nenhuma atividade registrada hoje.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.slice(0, 10).map((req, i) => (
              <div key={req.id} onClick={() => setSelectedRequest(req)} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 backdrop-blur-md flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group" style={{animationDelay: `${i * 50}ms`}}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${req.type === 'INSTALLATION' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {req.type === 'INSTALLATION' ? <Home size={18}/> : <Wrench size={18}/>}
                  </div>
                  <div>
                    <p className="font-bold text-white/90 text-sm">{req.type === 'INSTALLATION' ? 'Instalação' : 'Movimentação'}</p>
                    <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1 font-medium">
                       <History size={10}/> {new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • ID #{req.id}
                    </p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                  req.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                  req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {req.status === 'PENDING' ? 'Análise' : req.status === 'APPROVED' ? 'Feito' : 'Negado'}
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
    <div className="flex flex-col h-full bg-[#050505] text-white relative z-20">
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-20 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : setView('home')} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/70"><ArrowLeft size={20}/></button>
        <div className="flex-1">
          <h2 className="font-bold text-white text-lg">Nova Instalação</h2>
          <p className="text-xs text-white/40 font-medium">Passo {step} de 4</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-32 pt-6">
        <StepIndicator current={step} total={4} />

        {/* STEP 1: CLIENTE */}
        {step === 1 && (
          <div className="px-4 space-y-4 animate-in slide-in-from-right duration-300">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-md space-y-6">
              <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-500/20 rounded-xl"><User className="text-blue-400" size={20}/></div> <h3 className="font-bold text-white text-lg">Informações</h3></div>
              
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-3 text-white/40 text-[10px] font-bold uppercase tracking-wider">Nome Completo</span>
                  <input className="w-full bg-black/20 border border-white/10 rounded-2xl pt-7 pb-3 px-4 outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all font-medium text-white placeholder-white/20" 
                    placeholder="Ex: João Silva" value={installData.clientName} onChange={e => setInstallData({...installData, clientName: e.target.value})} />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-white/40 text-[10px] font-bold uppercase tracking-wider">Usuário PPPoE</span>
                  <input className="w-full bg-black/20 border border-white/10 rounded-2xl pt-7 pb-3 px-4 outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all font-medium text-white placeholder-white/20" 
                    placeholder="Ex: joao.silva" value={installData.clientCode} onChange={e => setInstallData({...installData, clientCode: e.target.value})} />
                </div>
                <textarea className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all min-h-[120px] text-white placeholder-white/40" 
                  placeholder="Endereço Completo..." value={installData.address} onChange={e => setInstallData({...installData, address: e.target.value})} />
              </div>

              <button onClick={handleGetLocation} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all active:scale-95 ${installData.coords ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>
                <MapPin size={20} className={installData.coords ? "text-emerald-400" : "text-white/50"}/> 
                {installData.coords ? "Localização Salva" : "Capturar GPS"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: EQUIPAMENTOS */}
        {step === 2 && (
          <div className="px-4 space-y-4 animate-in slide-in-from-right duration-300">
            {installData.items.map(item => (
              <div key={item.tempId} className="bg-white/5 p-5 rounded-3xl border border-white/5 shadow-lg flex justify-between items-center animate-in zoom-in-95 backdrop-blur-md">
                <div>
                  <h4 className="font-bold text-white">{item.brand} {item.model}</h4>
                  <div className="flex gap-2 text-xs text-white/50 mt-1">
                    <span className="bg-white/10 px-2 py-0.5 rounded border border-white/5">{item.serial}</span>
                    {item.mac && <span className="bg-white/10 px-2 py-0.5 rounded border border-white/5">MAC: {item.mac.slice(-4)}</span>}
                  </div>
                </div>
                <button onClick={() => setInstallData(prev => ({ ...prev, items: prev.items.filter(i => i.tempId !== item.tempId) }))} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/10 active:scale-90">
                  <Trash2 size={18}/>
                </button>
              </div>
            ))}

            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-md space-y-5">
              <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-500/20 rounded-xl"><Smartphone className="text-blue-400" size={20}/></div> <h3 className="font-bold text-white text-lg">Novo Equipamento</h3></div>
              
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-black/20 border border-white/10 rounded-2xl p-3.5 outline-none focus:border-blue-500/50 text-white appearance-none" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                  <option value="onu">ONU</option><option value="router">Roteador</option>
                </select>
                <select className="bg-black/20 border border-white/10 rounded-2xl p-3.5 outline-none focus:border-blue-500/50 text-white appearance-none" value={newItem.brandId} onChange={e => setNewItem({...newItem, brandId: e.target.value})}>
                  <option value="">Marca</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              
              <select className="w-full bg-black/20 border border-white/10 rounded-2xl p-3.5 outline-none focus:border-blue-500/50 text-white appearance-none" value={newItem.modelId} onChange={e => setNewItem({...newItem, modelId: e.target.value})}>
                <option value="">Selecione o Modelo...</option>{models.filter(m => m.brandId == newItem.brandId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>

              <div className="relative">
                <input id="serialInput" className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 pr-14 outline-none font-mono uppercase placeholder:normal-case focus:border-blue-500/50 text-white placeholder-white/30" placeholder="Serial Number" value={newItem.serial} onChange={e => setNewItem({...newItem, serial: e.target.value})} />
                <button onClick={() => setIsScanning('serial')} className="absolute right-2 top-2 p-2 bg-white/10 rounded-xl text-white/70 hover:bg-white/20"><QrCode size={20}/></button>
              </div>

              <div className="relative">
                <input id="macInput" className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 pr-14 outline-none font-mono uppercase placeholder:normal-case focus:border-blue-500/50 text-white placeholder-white/30" placeholder="MAC (Opcional)" value={newItem.mac} onChange={e => setNewItem({...newItem, mac: e.target.value})} />
                <button onClick={() => setIsScanning('mac')} className="absolute right-2 top-2 p-2 bg-white/10 rounded-xl text-white/70 hover:bg-white/20"><QrCode size={20}/></button>
              </div>

              <div className="relative">
                <input className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 pr-14 outline-none font-mono uppercase placeholder:normal-case focus:border-blue-500/50 text-white placeholder-white/30" placeholder="Patrimônio (Obrigatório)" value={newItem.patrimony} onChange={e => setNewItem({...newItem, patrimony: e.target.value})} />
                <button onClick={() => setIsOcrActive(true)} className="absolute right-2 top-2 p-2 bg-white/10 rounded-xl text-white/70 hover:bg-white/20"><Camera size={20}/></button>
              </div>
              
              <button onClick={handleAddItem} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-blue-900/30">
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
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-lg group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => setInstallData(prev => ({...prev, photos: prev.photos.filter((_, i) => i !== idx)}))} className="bg-red-500 text-white p-2 rounded-full"><Trash2 size={20}/></button>
                  </div>
                </div>
              ))}
              <label className="aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-white/40 active:bg-white/10 transition-colors cursor-pointer hover:border-blue-500/30 hover:text-blue-400">
                <Camera size={32} className="mb-2 opacity-60"/>
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
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 p-5 rounded-2xl flex gap-3 items-start backdrop-blur-md">
              <AlertTriangle className="shrink-0 mt-0.5" size={20}/>
              <p className="text-xs leading-relaxed">Tire fotos legíveis dos equipamentos instalados, do nível de sinal na ONU e da organização do cabeamento.</p>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMAÇÃO E ASSINATURA */}
        {step === 4 && (
          <div className="px-4 space-y-4 animate-in slide-in-from-right duration-300">
            <div className="bg-white/5 p-0 rounded-3xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-xl">
              <div className="bg-white/5 p-5 text-center border-b border-white/5">
                 <h3 className="font-bold text-white text-lg flex items-center justify-center gap-2"><CheckCircle size={20} className="text-emerald-400"/> Revisão Final</h3>
                 <p className="text-white/50 text-xs mt-1 font-medium">Confira os dados antes de enviar</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-3 text-sm bg-black/20 p-5 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-white/50 font-medium">Cliente</span> <span className="font-bold text-white text-right">{installData.clientName}</span></div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-2"><span className="text-white/50 font-medium">Equipamentos</span> <span className="font-bold text-white">{installData.items.length} un.</span></div>
                  <div className="flex justify-between items-center"><span className="text-white/50 font-medium">Geolocalização</span> <span className={`font-bold px-2 py-0.5 rounded text-xs ${installData.coords ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{installData.coords ? 'Capturado' : 'Pendente'}</span></div>
                </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">Assinatura do Cliente</label>
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/80 touch-none relative h-40">
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

              <textarea className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 outline-none text-sm focus:border-blue-500/50 transition-all text-white placeholder-white/30" rows="3" 
                placeholder="Observações finais..." value={installData.observations} onChange={e => setInstallData({...installData, observations: e.target.value})} />

              <button onClick={handleSubmit} disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><CheckCircle size={20}/> Confirmar e Enviar</>}
              </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-black/60 backdrop-blur-xl border-t border-white/5 p-4 z-30 flex justify-between items-center safe-area-pb">
         <button disabled={step === 1} onClick={() => setStep(s => s - 1)} className="px-6 py-3 text-white/50 font-bold disabled:opacity-30 hover:text-white transition-colors">Voltar</button>
         {step < 4 && (
           <button onClick={() => {
             if (step === 1 && !installData.clientName) return toast.error("Informe o nome.");
             if (step === 2 && installData.items.length === 0) return toast.error("Adicione equipamentos.");
             setStep(s => s + 1); vibrate();
           }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-transform">
             Próximo <ArrowRight size={18}/>
           </button>
         )}
      </div>
    </div>
  );

  // --- RENDER PRINCIPAL ---
  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-[#0a0a0a] to-slate-900 text-slate-200 flex flex-col font-sans overflow-hidden selection:bg-blue-500/30">
      {/* Background Ambient Light */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-blue-900/10 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-purple-900/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      {/* HEADER GERAL */}
      {view !== 'install' && (
        <div className="bg-white/5 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-2 rounded-xl shadow-lg shadow-blue-900/20"><Wrench className="text-white w-5 h-5"/></div>
            <h1 className="font-bold text-white text-lg tracking-tight">NetControl <span className="text-blue-500 font-light">Tech</span></h1>
          </div>
          <button onClick={() => { signOut(); navigate('/tech-login'); }} className="p-2.5 bg-white/5 rounded-full text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors border border-white/5"><LogOut size={20}/></button>
        </div>
      )}

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-hidden relative z-10">
        {view === 'home' && renderHome()}
        {view === 'install' && renderInstallWizard()}
        {view === 'conference' && (
          <div className="h-full overflow-y-auto animate-in fade-in bg-transparent">
             <div className="flex gap-3 p-4 bg-white/5 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10">
               <button onClick={() => setView('home')} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:text-white transition-colors"><ArrowLeft size={20}/></button>
               <input className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white placeholder:text-white/30" placeholder="Buscar Serial..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
               <button onClick={async () => {
                 if(!searchTerm) return;
                 const res = await api.get('/items', { params: { search: searchTerm } });
                 setSearchResults(res.data.data);
               }} className="bg-blue-600 text-white px-5 rounded-2xl shadow-lg shadow-blue-900/20"><Search/></button>
             </div>
             <div className="space-y-3 p-4">
               {searchResults.map(item => (
                 <div key={item.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-md">
                   <h3 className="font-bold text-white text-lg">{item.name}</h3>
                   <p className="text-xs text-white/50 font-mono mt-1">SN: {item.serial}</p>
                   <div className="mt-3 text-xs flex justify-between items-center">
                     <span className="bg-white/10 px-3 py-1 rounded-full text-white/70 border border-white/5">{item.location}</span>
                     <span className={`font-bold ${item.status === 'disponivel' ? 'text-emerald-400' : 'text-blue-400'}`}>{item.status}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAVIGATION */}
      {view === 'home' && (
        <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-2 flex justify-between items-center z-30 shadow-2xl shadow-black/50 h-20">
          <TabButton active={view === 'home'} icon={Home} label="Início" onClick={() => setView('home')} />
          <TabButton active={false} icon={Search} label="Buscar" onClick={() => { setView('conference'); vibrate(); }} />
          <TabButton active={false} icon={User} label="Perfil" onClick={() => toast("Em breve!")} />
        </div>
      )}

      {/* OCR SCANNER MODAL */}
      {isOcrActive && (
        <OcrScannerModal 
          onClose={() => setIsOcrActive(false)}
          onScanSuccess={(patrimony, evidencePhoto) => {
            setNewItem(prev => ({...prev, patrimony: patrimony.toUpperCase()}));
            if (evidencePhoto) {
               setInstallData(prev => ({...prev, photos: [...prev.photos, evidencePhoto]}));
               toast.success("Foto salva como evidência!");
            }
            setIsOcrActive(false);
          }}
        />
      )}

      {/* SCANNER OVERLAY */}
      {isScanning && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in fade-in duration-300">
          <div className="flex-1 relative">
            <Scanner 
              formats={
                (isScanning === 'mac') 
                  ? ['code_128', 'code_39', 'code_93', 'codabar', 'itf', 'ean_13'] 
                  : ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix', 'codabar', 'code_93', 'itf']
              }
              components={{ torch: true, audio: false }}
              constraints={{ facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 }, focusMode: 'continuous' }}
              scanDelay={200}
              onError={(error) => console.warn("Erro Scanner:", error)}
              onScan={(res) => {
              if (res && res.length > 0) {
                 const code = res[0].rawValue;
                 
                 // Validação Inteligente
                 if (isScanning === 'mac') {
                    // Remove separadores e valida hex
                    const clean = code.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
                    if (clean.length === 12) {
                       const formatted = clean.match(/.{1,2}/g).join(':');
                       vibrate();
                       setNewItem(prev => ({...prev, mac: formatted}));
                       setIsScanning(null);
                       toast.success("MAC lido com sucesso!");
                    }
                 } 
                 else if (isScanning === 'serial') {
                    const clean = code.trim().toUpperCase();
                    
                    // Verifica se parece MAC (12 hex) para evitar leitura errada
                    // Heurística: É MAC se tem 12 chars hex E contém letras (A-F). Se for só números, assumimos que é Serial.
                    const hexOnly = clean.replace(/[^0-9A-F]/g, '');
                    const isMacLike = /^[0-9A-F]{12}$/.test(hexOnly) && /[A-F]/.test(hexOnly);
                    
                    // Prefixos comuns de ONU
                    const isKnownSerial = clean.includes('FHTT') || clean.includes('ZTEG') || clean.includes('ALCL') || clean.includes('HWTC');

                    if (isKnownSerial) {
                       vibrate();
                       setNewItem(prev => ({...prev, serial: clean}));
                       setIsScanning(null);
                       toast.success("Serial identificado!");
                       return;
                    }

                    // Se parece MAC e não é serial conhecido, avisa o usuário (Feedback visual)
                    if (isMacLike) {
                       const now = Date.now();
                       if (now - lastScanErrorRef.current > 2000) {
                          toast.error("Parece um MAC. Aponte para o Serial.", { id: 'scan-warn' });
                          lastScanErrorRef.current = now;
                       }
                       return;
                    }

                    // Caso genérico
                    if (clean.length > 5) {
                       vibrate();
                       setNewItem(prev => ({...prev, serial: clean}));
                       setIsScanning(null);
                       toast.success("Serial lido!");
                    }
                 }
              }
            }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-80 h-32 border-2 border-blue-500 rounded-xl relative shadow-[0_0_0_100vh_rgba(0,0,0,0.7)]">
                <div className="absolute -top-16 left-0 w-full text-center text-white font-bold drop-shadow-md text-lg">
                   {isScanning === 'mac' ? 'Aponte para o MAC' : 'Aponte para o Serial'}
                </div>
                <div className="absolute -bottom-8 left-0 w-full text-center text-white/80 text-xs animate-pulse">Lendo câmera...</div>
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              </div>
            </div>
          </div>
          <div className="flex bg-slate-900">
            <button onClick={() => setIsScanning(null)} className="flex-1 text-white py-6 font-bold border-r border-slate-800">Cancelar</button>
            <button onClick={() => { 
              const type = isScanning; setIsScanning(null); 
              setTimeout(() => document.getElementById(type === 'mac' ? 'macInput' : 'serialInput')?.focus(), 100); 
            }} className="flex-1 text-blue-400 py-6 font-bold">Digitar Manual</button>
          </div>
        </div>
      )}
    </div>
  );
}