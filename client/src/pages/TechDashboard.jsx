import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, Search, Save, LogOut, Plus, Edit, X, CheckCircle, 
  ArrowLeft, ArrowRight, MapPin, QrCode, User, Key,
  Smartphone, Trash2, AlertTriangle, History, 
  Home, Wrench, Signal, Zap, Check, FilePlus, ImagePlus, Pen
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
    className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 active:scale-90 ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
  > 
    <Icon className={`w-6 h-6 transition-all duration-300 ${active ? 'stroke-blue-600 -translate-y-1' : 'stroke-current'}`} strokeWidth={active ? 2.5 : 2} />
    <span className={`text-[10px] font-bold tracking-wide mt-1.5 transition-all duration-300 ${active ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
    {active && <div className="absolute -bottom-2 w-1.5 h-1.5 bg-blue-600 rounded-full animate-in fade-in"></div>}
  </button>
);

const StepIndicator = ({ current, total }) => (
  <div className="w-full px-6 mb-8">
    <div className="flex justify-between items-center relative">
      {/* Background Line */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 rounded-full -z-10"></div>
      
      {/* Progress Line */}
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 rounded-full -z-10 transition-all duration-700 ease-out"
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
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-110' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {isActive && stepNum < current ? <CheckCircle size={14} /> : stepNum}
            </div>
            {isCurrent && <span className="absolute -bottom-7 text-[10px] font-bold text-blue-600 whitespace-nowrap animate-in fade-in slide-in-from-top-2 tracking-wider uppercase">
                {stepNum === 1 ? 'Cliente' : stepNum === 2 ? 'Itens' : stepNum === 3 ? 'Fotos' : 'Fim'}
            </span>}
          </div>
        );
      })}
    </div>
  </div>
);

// Helper de vibração
const vibrate = (pattern = 50) => { if (navigator.vibrate) navigator.vibrate(pattern); };

// Helper de Compressão (Inalterado, lógica essencial)
const compressImage = (file, quality = 0.7) => {
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
        resolve(canvas.toDataURL('image/jpeg', quality));
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
  const [torchSupported, setTorchSupported] = useState(false);
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
        const track = s.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        if (capabilities.torch) setTorchSupported(true);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => { toast.error("Câmera não acessível."); onClose(); });

    // Limpeza ao desmontar
    return () => streamRef.current?.getTracks().forEach(track => track.stop());
  }, [onClose]);

  const toggleTorch = async (state) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && track.getCapabilities().torch) {
      await track.applyConstraints({ advanced: [{ torch: state }] }).catch(() => {});
    } else if (state) {
      toast.error("Flash não disponível");
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
    const cropHeight = height * 0.20; // Reduzido para focar melhor em uma linha
    const startX = (width - cropWidth) / 2;
    const startY = (height - cropHeight) / 2;

    // UPSCALE: Aumenta a resolução para ajudar o OCR
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
      // Adiciona whitelist para forçar apenas números
      const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', {
        tessedit_char_whitelist: '0123456789'
      });
      
      // Limpeza básica de erros comuns de OCR em números (O -> 0, I/l -> 1)
      const cleanText = text.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');

      // Procura por qualquer sequência numérica
      const matches = cleanText.match(/\d+/g);

      if (matches && matches.length > 0) {
        // Filtra candidatos: Patrimônios geralmente são curtos (até 4 dígitos)
        const candidates = matches.filter(m => m.length >= 1 && m.length <= 5);

        if (candidates.length > 0) {
           // Pega o maior número dentro do range aceitável (ex: prefere 1234 a 1)
           const foundPatrimony = candidates.sort((a,b) => b.length - a.length)[0];
           onScanSuccess(foundPatrimony, evidenceUrl);
           toast.success(`Patrimônio: ${foundPatrimony}`, { id: 'ocr' });
           vibrate(100);
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
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4/5 h-1/5 border-2 border-white/30 rounded-xl relative overflow-hidden bg-white/5 backdrop-blur-[2px]">
             <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,1)] animate-scan"></div>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden"></canvas>
      </div>
      <div className="p-4 bg-slate-950/80 backdrop-blur-lg flex gap-4 items-center justify-between border-t border-white/10">
        <button onClick={onClose} className="px-6 py-4 rounded-2xl font-bold text-white/70 bg-white/5 border border-white/10">Cancelar</button>
        
        <button onClick={handleCapture} disabled={processing} className="w-20 h-20 bg-blue-600 text-white rounded-full font-bold disabled:bg-slate-500 flex items-center justify-center border-4 border-slate-900 shadow-2xl">
          {processing ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Camera size={32} />}
        </button>

        {torchSupported ? (
          <button onTouchStart={() => toggleTorch(true)} onTouchEnd={() => toggleTorch(false)} onMouseDown={() => toggleTorch(true)} onMouseUp={() => toggleTorch(false)} className="px-6 py-4 rounded-2xl font-bold text-white/70 bg-white/5 border border-white/10 active:bg-yellow-400 active:text-black">
            <Zap size={24} />
          </button>
        ) : <div className="w-[88px]"></div>}
      </div>
    </div>
  );
};

// --- MODAL DE QR SCANNER ---
const QrScannerModal = ({ onClose, onScanSuccess, scanType }) => {
  const lastScanErrorRef = useRef(0);

  const handleScan = (results) => {
    // A API antiga retorna um array de resultados
    if (results && results.length > 0) {
      const code = results[0]?.rawValue;
      if (code) {
        vibrate();
        onScanSuccess(code);
      }
    }
  };

  const handleError = (error) => {
    if (error && Date.now() - lastScanErrorRef.current > 3000) {
      if (error.name === 'NotAllowedError') {
        toast.error("Acesso à câmera negado.");
        onClose();
      }
      lastScanErrorRef.current = Date.now();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-in fade-in duration-300">
      <Scanner
        onScan={handleScan}
        onError={handleError}
        constraints={{ facingMode: 'environment' }}
        scanDelay={500}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 border-4 border-white/50 rounded-3xl relative shadow-[0_0_0_200vh_rgba(0,0,0,0.7)]">
          <div className="absolute -top-12 left-0 w-full text-center text-white font-bold drop-shadow-md text-lg">
            Aponte para o {scanType === 'mac' ? 'MAC Address' : 'Serial Number'}
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
        <button onClick={onClose} className="w-full bg-white/10 backdrop-blur-md text-white py-4 rounded-2xl font-bold border border-white/10">Cancelar</button>
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
  
  const isInstall = request.action === 'SOLICITACAO_INSTALACAO';

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

const HomeView = ({ user, onNewInstall, onConference }) => {
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  useEffect(() => { // eslint-disable-line react-hooks/exhaustive-deps
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
                  vibrate([100, 50, 100]); // Vibração de festa
                } else if (newReq.status === 'REJECTED') {
                  toast.error((t) => (
                    <div onClick={() => { setSelectedRequest(newReq); toast.dismiss(t.id); }} className="cursor-pointer">
                      <p className="font-bold">Solicitação #{newReq.id} Recusada</p>
                      <p className="text-xs">Toque para ver o motivo</p>
                    </div>
                  ), { duration: 8000 });
                  vibrate([200, 100, 200]); // Vibração de alerta
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

  return (
    <div className="p-6 space-y-8 pb-32 animate-in fade-in duration-700 max-w-2xl mx-auto relative z-10">
      
      {selectedRequest && <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}

      {/* Welcome Card */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500"><Signal size={180} /></div>
        
        <div className="relative z-10 flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Online</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Olá, {user?.name?.split(' ')[0] || 'Técnico'}</h2>
            <p className="text-slate-500 text-sm flex items-center gap-2 mt-1 font-medium"><MapPin size={14}/> {user?.allowedCities?.[0] || 'Em Campo'}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <User size={24} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => { onNewInstall(); vibrate(); }} className="bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-[0.96] shadow-lg shadow-blue-200 group/btn">
              <div className="p-3 bg-white/20 rounded-full"><Plus size={24} /></div>
              <span className="font-bold text-sm tracking-wide">Nova Instalação</span>
           </button>
           <button onClick={() => { onConference(); vibrate(); }} className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-5 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-[0.96] border border-slate-100 group/btn">
              <div className="p-3 bg-white rounded-full border border-slate-200 shadow-sm"><Search size={24} /></div>
              <span className="font-bold text-sm tracking-wide text-slate-500 group-hover/btn:text-slate-700">Consultar</span>
           </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Instalações', value: myRequests.filter(r => r.action === 'SOLICITACAO_INSTALACAO').length, color: 'text-blue-600' },
          { label: 'Pendentes', value: myRequests.filter(r => r.status === 'PENDING').length, color: 'text-amber-500' },
          { label: 'Aprovados', value: myRequests.filter(r => r.status === 'APPROVED').length, color: 'text-emerald-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
             <p className={`text-3xl font-bold ${stat.color} tracking-tighter`}>{stat.value}</p>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="font-bold text-slate-800 text-lg tracking-tight">Atividade Recente</h3>
        </div>
        
        {myRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
            <History size={32} className="mb-3 opacity-50"/>
            <p className="text-sm font-medium">Nenhuma atividade registrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.slice(0, 10).map((req, i) => (
              <div key={req.id} onClick={() => setSelectedRequest(req)} className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group" style={{animationDelay: `${i * 50}ms`}}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${req.action === 'SOLICITACAO_INSTALACAO' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {req.action === 'SOLICITACAO_INSTALACAO' ? <Home size={18}/> : <Wrench size={18}/>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{req.action?.replace('SOLICITACAO_', '').replace('_', ' ')}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                       <History size={10}/> {new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • ID #{req.id}
                    </p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                  req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                  req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  'bg-red-50 text-red-600 border-red-100'
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
};

const InstallWizard = ({ onExit }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [installData, setInstallData] = useState(() => {
    try {
      const saved = localStorage.getItem('@NetControl:draftInstall');
      return saved ? JSON.parse(saved) : {
        client: '', address: '', coords: null, items: [], photos: [], observations: '', signature: ''
      };
    } catch { return { client: '', address: '', coords: null, items: [], photos: [], observations: '', signature: '' }; }
  });

  // Estados dos Modais e Formulários
  const [isScanning, setIsScanning] = useState(null);
  const [isOcrActive, setIsOcrActive] = useState(false);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [newItem, setNewItem] = useState({ brandId: '', modelId: '', serial: '', patrimony: '', mac: '', type: 'onu' });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Referência para a assinatura
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    api.get('/brands').then(r => setBrands(r.data)).catch(() => {});
    api.get('/models').then(r => setModels(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('@NetControl:draftInstall', JSON.stringify(installData));
    }, 800);
    return () => clearTimeout(timer);
  }, [installData]);

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
      setInstallData({ client: '', address: '', coords: null, items: [], photos: [], observations: '', signature: '' });
      onExit();
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

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white relative z-20">
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-20 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : onExit()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/70"><ArrowLeft size={20}/></button>
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
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><User size={20}/></div> <h3 className="font-bold text-slate-800 text-lg">Dados do Cliente</h3></div>
              
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Código do Cliente</span>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl pt-7 pb-3 px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-800 placeholder-slate-300" 
                    placeholder="Ex: 12345" value={installData.client} onChange={e => setInstallData({...installData, client: e.target.value})} />
                </div>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[120px] text-slate-800 placeholder-slate-400" 
                  placeholder="Endereço Completo..." value={installData.address} onChange={e => setInstallData({...installData, address: e.target.value})} />
              </div>

              <button onClick={handleGetLocation} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all active:scale-95 ${installData.coords ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                <MapPin size={20} className={installData.coords ? "text-emerald-600" : "text-slate-400"}/> 
                {installData.coords ? "Localização Salva" : "Capturar GPS"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: EQUIPAMENTOS */}
        {step === 2 && (
          <div className="px-4 space-y-4 animate-in slide-in-from-right duration-300">
            {installData.items.length > 0 && installData.items.map(item => (
              <div key={item.tempId} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center animate-in zoom-in-95">
                <div>
                  <h4 className="font-bold text-slate-800">{item.brand} {item.model}</h4>
                  <div className="flex gap-2 text-xs text-slate-500 mt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{item.serial}</span>
                    {item.mac && <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">MAC: {item.mac.slice(-4)}</span>}
                  </div>
                </div>
                <button onClick={() => setInstallData(prev => ({ ...prev, items: prev.items.filter(i => i.tempId !== item.tempId) }))} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors border border-red-100 active:scale-90">
                  <Trash2 size={18}/>
                </button>
              </div>
            ))}

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Smartphone size={20}/></div> <h3 className="font-bold text-slate-800 text-lg">Novo Equipamento</h3></div>
              
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700 appearance-none" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                  <option value="onu">ONU</option><option value="router">Roteador</option>
                </select>
                <select className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700 appearance-none" value={newItem.brandId} onChange={e => setNewItem({...newItem, brandId: e.target.value})}>
                  <option value="">Marca</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              
              <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700 appearance-none" value={newItem.modelId} onChange={e => setNewItem({...newItem, modelId: e.target.value})}>
                <option value="">Selecione o Modelo...</option>{models.filter(m => m.brandId == newItem.brandId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>

              <div className="relative">
                <input id="serialInput" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-14 outline-none font-mono uppercase placeholder:normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400" placeholder="Serial Number" value={newItem.serial} onChange={e => setNewItem({...newItem, serial: e.target.value})} />
                <button onClick={() => setIsScanning('serial')} className="absolute right-2 top-2 p-2 bg-white rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 active:scale-90 transition-transform"><QrCode size={20}/></button>
              </div>

              <div className="relative">
                <input id="macInput" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-14 outline-none font-mono uppercase placeholder:normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400" placeholder="MAC (Opcional)" value={newItem.mac} onChange={e => setNewItem({...newItem, mac: e.target.value})} />
                <button onClick={() => setIsScanning('mac')} className="absolute right-2 top-2 p-2 bg-white rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 active:scale-90 transition-transform"><QrCode size={20}/></button>
              </div>

              <div className="relative">
                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-14 outline-none font-mono uppercase placeholder:normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400" placeholder="Patrimônio (Obrigatório)" value={newItem.patrimony} onChange={e => setNewItem({...newItem, patrimony: e.target.value})} />
                <button onClick={() => setIsOcrActive(true)} className="absolute right-2 top-2 p-2 bg-white rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 active:scale-90 transition-transform"><Camera size={20}/></button>
              </div>
              
              <button onClick={handleAddItem} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-blue-200">
                <Plus size={18}/> Adicionar Item
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FOTOS */}
        {step === 3 && (
          <div className="px-4 animate-in slide-in-from-right duration-300">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {installData.photos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => setInstallData(prev => ({...prev, photos: prev.photos.filter((_, i) => i !== idx)}))} className="bg-red-500 text-white p-2 rounded-full active:scale-90 transition-transform"><Trash2 size={20}/></button>
                  </div>
                </div>
              ))}
              <label className="aspect-square bg-white border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 active:bg-slate-50 transition-colors cursor-pointer hover:border-blue-400 hover:text-blue-600">
                <ImagePlus size={32} className="mb-2"/>
                <span className="text-xs font-bold uppercase">Adicionar Foto</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                  const file = e.target.files[0];
                  if(file) {
                    const compressed = await compressImage(file, 0.8);
                    setInstallData(prev => ({...prev, photos: [...prev.photos, compressed]}));
                  }
                }} />
              </label>
            </div>
            <div className="bg-blue-50 border border-blue-100 text-blue-700 p-5 rounded-2xl flex gap-3 items-start">
              <AlertTriangle className="shrink-0 mt-0.5 text-blue-500" size={20}/>
              <p className="text-xs leading-relaxed">Tire fotos legíveis dos equipamentos instalados, do nível de sinal na ONU e da organização do cabeamento.</p>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMAÇÃO E ASSINATURA */}
        {step === 4 && (
          <div className="px-4 space-y-4 animate-in slide-in-from-right duration-300">
            <div className="bg-white p-0 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-6">
              <div className="bg-slate-50 p-5 text-center border-b border-slate-100">
                 <h3 className="font-bold text-slate-800 text-lg flex items-center justify-center gap-2"><CheckCircle size={20} className="text-emerald-500"/> Revisão Final</h3>
                 <p className="text-slate-500 text-xs mt-1 font-medium">Confira os dados antes de enviar</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="space-y-3 text-sm bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="text-slate-500 font-medium">Cód. Cliente</span> <span className="font-bold text-slate-800 text-right">{installData.client}</span></div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="text-slate-500 font-medium">Equipamentos</span> <span className="font-bold text-slate-800">{installData.items.length} un.</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Geolocalização</span> <span className={`font-bold px-2 py-0.5 rounded text-xs ${installData.coords ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{installData.coords ? 'OK' : 'Pendente'}</span></div>
                </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assinatura do Cliente</label>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white touch-none relative h-40 shadow-inner">
                  {installData.signature ? (
                    <>
                      <img src={installData.signature} alt="Assinatura" className="w-full h-full object-contain p-2" />
                      <button onClick={() => setInstallData(prev => ({...prev, signature: ''}))} className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg"><X size={16}/></button>
                    </>
                  ) : (
                    <>
                      <canvas ref={canvasRef} width={320} height={160} className="w-full h-full cursor-crosshair"
                        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                      <div className="absolute inset-0 flex items-center justify-center text-slate-200 pointer-events-none"><Pen size={24}/></div>
                    </>
                  )}
                </div>
              </div>

              <textarea className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 placeholder-slate-400" rows="3" 
                placeholder="Observações finais..." value={installData.observations} onChange={e => setInstallData({...installData, observations: e.target.value})} />

              <button onClick={handleSubmit} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><CheckCircle size={20}/> Confirmar e Enviar</>}
              </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 z-30 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
         <button disabled={step === 1} onClick={() => setStep(s => s - 1)} className="px-6 py-3 text-slate-400 font-bold disabled:opacity-30 hover:text-slate-600 transition-colors">Voltar</button>
         {step < 4 && (
           <button onClick={() => {
             if (step === 1 && !installData.client) return toast.error("Informe o código do cliente.");
             if (step === 2 && installData.items.length === 0) return toast.error("Adicione equipamentos.");
             setStep(s => s + 1); vibrate();
           }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">
             Próximo <ArrowRight size={18}/>
           </button>
         )}
      </div>
    </div>
  );  
};

const ConferenceView = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const res = await api.get('/items', { params: { search: searchTerm, limit: 20 } });
      setSearchResults(res.data.data);
      if (res.data.data.length === 0) toast('Nenhum item encontrado.');
    } catch {
      toast.error('Erro ao buscar item.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  return (
    <div className="h-full flex flex-col bg-transparent">
       <div className="flex gap-3 p-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-10">
         <button onClick={onBack} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-slate-800 transition-colors shadow-sm"><ArrowLeft size={20}/></button>
         <input 
           className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 placeholder:text-slate-400 shadow-sm" 
           placeholder="Buscar Serial, Patrimônio..." 
           value={searchTerm} 
           onChange={e => setSearchTerm(e.target.value)}
           onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
         <button onClick={handleSearch} disabled={loading} className="bg-blue-600 text-white px-5 rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-50">
           {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Search/>}
          </button>
       </div>
       <div className="flex-1 overflow-y-auto space-y-3 p-4 pb-24">
         {searchResults.map(item => (
           <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
             <h3 className="font-bold text-slate-800 text-lg">{item.name}</h3>
             <p className="text-xs text-slate-500 font-mono mt-1">SN: {item.serial}</p>
             <div className="mt-3 text-xs flex justify-between items-center">
               <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200">{item.location}</span>
               <span className={`font-bold ${item.status === 'disponivel' ? 'text-emerald-600' : 'text-blue-600'}`}>{item.status.replace('_', ' ').toUpperCase()}</span>
             </div>
           </div>
         ))}
       </div>
    </div>
  );
};

const ProfileView = ({ user }) => {
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0, rate: 0 });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await api.get('/my-requests');
        const total = data.length;
        const approved = data.filter(r => r.status === 'APPROVED').length;
        const rejected = data.filter(r => r.status === 'REJECTED').length;
        const pending = data.filter(r => r.status === 'PENDING').length;
        const rate = (approved + rejected) > 0 ? (approved / (approved + rejected)) * 100 : 0;
        setStats({ total, approved, rejected, pending, rate: rate.toFixed(0) });
      } catch (e) {
        toast.error("Erro ao carregar estatísticas.");
      }
    };
    fetchRequests();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("A nova senha deve ter no mínimo 6 caracteres.");
    if (newPassword !== confirmPassword) return toast.error("As senhas não conferem.");
    
    setLoading(true);
    try {
      await api.put('/users/change-password', { currentPassword, newPassword });
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-32 animate-in fade-in duration-700 max-w-2xl mx-auto relative z-10">
      {/* User Card */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shadow-lg shadow-blue-100 text-blue-600">
          <User size={40} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{user?.name}</h2>
          <p className="text-blue-600 font-bold uppercase text-sm tracking-wider">{user?.role}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 text-center shadow-sm">
          <p className="text-4xl font-bold text-blue-600 tracking-tighter">{stats.total}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Solicitações</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 text-center shadow-sm">
          <p className="text-4xl font-bold text-emerald-500 tracking-tighter">{stats.rate}%</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Aprovação</p>
        </div>
      </div>

      {/* Change Password Form */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Key size={20} className="text-blue-600"/> Alterar Senha</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <input 
            type="password"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400"
            placeholder="Senha Atual"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
          <input 
            type="password"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400"
            placeholder="Nova Senha"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <input 
            type="password"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400"
            placeholder="Confirmar Nova Senha"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-blue-200">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>

      {/* Logout Button */}
      <button onClick={() => { signOut(); navigate('/tech-login'); }} className="w-full bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        <LogOut size={18}/> Sair do Aplicativo
      </button>
    </div>
  );
};

export default function TechDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState(() => {
    try { const s = localStorage.getItem('@NetControl:techState'); return s ? JSON.parse(s).view || 'home' : 'home'; } catch { return 'home'; }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('@NetControl:techState', JSON.stringify({ view }));
    }, 500);
    return () => clearTimeout(timer);
  }, [view]);

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-600 flex flex-col font-sans overflow-hidden selection:bg-blue-100 selection:text-blue-700">
      {/* Background Ambient Light */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-blue-100/40 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-purple-100/40 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>
      
      <style>{globalStyles}</style>
      
      {/* HEADER GERAL */}
      {view !== 'install' && (
        <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-2 rounded-xl shadow-lg shadow-blue-200"><Wrench className="text-white w-5 h-5"/></div>
            <h1 className="font-bold text-slate-800 text-lg tracking-tight">NetControl <span className="text-blue-600 font-light">Tech</span></h1>
          </div>
          <button onClick={() => { signOut(); navigate('/tech-login'); }} className="p-2.5 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-slate-200 shadow-sm"><LogOut size={20}/></button>
        </header>
      )}

      {/* BODY CONTENT */}
      <main className="flex-1 overflow-hidden relative z-10">
        {view === 'home' && <HomeView user={user} onNewInstall={() => setView('install')} onConference={() => setView('conference')} />}
        {view === 'install' && <InstallWizard onExit={() => setView('home')} />}
        {view === 'conference' && <ConferenceView onBack={() => setView('home')} />}
        {view === 'profile' && <ProfileView user={user} />}
      </main>

      {/* BOTTOM NAVIGATION */}
      {view !== 'install' && (
        <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex justify-around items-center h-20 max-w-md mx-auto">
            <TabButton active={view === 'home'} icon={Home} label="Início" onClick={() => setView('home')} />
            <TabButton active={view === 'conference'} icon={Search} label="Consultar" onClick={() => { setView('conference'); vibrate(); }} />
            <TabButton active={view === 'profile'} icon={User} label="Perfil" onClick={() => { setView('profile'); vibrate(); }} />
          </div>
        </nav>
      )}
    </div>
  );
}