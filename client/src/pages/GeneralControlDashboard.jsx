import React, { useState, useEffect } from 'react';
import { 
  Car, Wrench, HardHat, ClipboardCheck, Camera, FileText, 
  LogOut, Search, CheckCircle, AlertTriangle, X, Save, Printer, User,
  Plus, ArrowRight, ArrowLeft, Fuel, Gauge, Calendar, History, Box, ArrowRightLeft, PenTool, Image as ImageIcon
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from './logo.png';

// Helper de Compressão de Imagem
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
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

// Componente de Card de Estatística
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className={`p-4 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

// Componente de Assinatura
const SignaturePad = ({ onSave }) => {
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    onSave(canvasRef.current.toDataURL());
  };

  return (
    <div className="border-2 border-slate-200 border-dashed rounded-xl overflow-hidden touch-none bg-white cursor-crosshair">
      <canvas ref={canvasRef} width={400} height={200} className="w-full h-48" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
      <div className="bg-slate-50 p-2 text-center text-xs text-slate-400 border-t font-bold uppercase">Assine neste quadro</div>
    </div>
  );
};

export default function GeneralControlDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fleet'); // fleet, tools, epi
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadItems();
  }, [activeTab]);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Mapeia abas para tipos de item no backend
      const typeMap = { fleet: 'veiculo', tools: 'ferramenta', epi: 'epi' };
      const res = await api.get('/general/assets', { params: { type: typeMap[activeTab] } });
      setItems(res.data);
    } catch (error) {
      toast.error("Erro ao carregar itens.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintTerm = (item) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Pop-up bloqueado.");

    const logoSrc = logo.startsWith('data:') || logo.startsWith('http') ? logo : `${window.location.origin}${logo.startsWith('/') ? '' : '/'}${logo}`;
    const technicianName = item.currentHolder || "_______________________";
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Termo de Responsabilidade - ${item.serial || item.patrimony}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
          .logo { height: 60px; margin-bottom: 15px; }
          h1 { font-size: 24px; color: #064e3b; margin: 0; }
          .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
          p { line-height: 1.6; margin-bottom: 20px; text-align: justify; }
          .item-box { border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; background: #f8fafc; margin: 30px 0; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 5px; }
          .item-row:last-child { border-bottom: none; margin-bottom: 0; }
          .label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; }
          .value { font-weight: 600; color: #0f172a; }
          .signatures { margin-top: 80px; display: flex; justify-content: space-between; gap: 40px; }
          .sig-block { flex: 1; text-align: center; }
          .line { border-top: 1px solid #000; margin-bottom: 10px; }
          .date { text-align: center; margin-top: 60px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoSrc}" class="logo" alt="Logo" onerror="this.style.display='none'"/>
          <h1>Termo de Responsabilidade</h1>
          <div class="subtitle">Entrega de Ferramenta / EPI / Veículo</div>
        </div>

        <p>
          Pelo presente termo, eu, <strong>${technicianName.toUpperCase()}</strong>, declaro que recebi da empresa 
          <strong>MTSPEED TECNOLOGIA</strong> o item abaixo discriminado, em perfeito estado de conservação e funcionamento.
        </p>
        
        <div class="item-box">
          <div class="item-row"><span class="label">Item</span> <span class="value">${item.brand} ${item.model}</span></div>
          <div class="item-row"><span class="label">Identificação (Serial/Pat)</span> <span class="value">${item.serial || item.patrimony}</span></div>
          <div class="item-row"><span class="label">Tipo</span> <span class="value">${item.type?.toUpperCase()}</span></div>
          <div class="item-row"><span class="label">Estado</span> <span class="value">${item.status?.toUpperCase()}</span></div>
        </div>

        <p>
          Assumo total responsabilidade pela guarda e conservação do item, comprometendo-me a utilizá-lo exclusivamente para fins profissionais.
        </p>

        <div class="signatures">
          <div class="sig-block"><div class="line"></div><strong>MTSPEED TECNOLOGIA</strong><br><span style="font-size: 12px">Expedidor</span></div>
          <div class="sig-block"><div class="line"></div><strong>${technicianName.toUpperCase()}</strong><br><span style="font-size: 12px">Responsável</span></div>
        </div>
        
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.serial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estados dos Wizards
  const [showNewAsset, setShowNewAsset] = useState(false);
  const [showInspection, setShowInspection] = useState(null); // Item sendo inspecionado
  const [showTransfer, setShowTransfer] = useState(null); // Item sendo transferido
  const [showConference, setShowConference] = useState(false);
  const [showConferenceHistory, setShowConferenceHistory] = useState(false);

  // Stats Calculados
  const stats = {
    total: items.length,
    available: items.filter(i => i.status === 'disponivel').length,
    inUse: items.filter(i => i.status === 'em_uso').length
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><ClipboardCheck size={24}/></div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">Controle Geral</h1>
            <p className="text-xs text-slate-500 font-medium">Olá, {user.name.split(' ')[0]}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewAsset(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-emerald-200">
            <Plus size={18}/> Novo Ativo
          </button>
          <button onClick={() => { signOut(); navigate('/general-login'); }} className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors">
            <LogOut size={20}/>
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="px-6 pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total de Ativos" value={stats.total} icon={Box} color="bg-blue-100" />
        <StatCard title="Em Uso / Campo" value={stats.inUse} icon={User} color="bg-purple-100" />
        <StatCard title="Disponíveis" value={stats.available} icon={CheckCircle} color="bg-emerald-100" />
      </div>

      {/* Tabs */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex p-1 bg-slate-200/50 rounded-xl gap-1">
          {[
            { id: 'fleet', label: 'Frota', icon: Car },
            { id: 'tools', label: 'Ferramentas', icon: Wrench },
            { id: 'epi', label: 'EPIs', icon: HardHat }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18}/> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions & Search */}
      <div className="px-6 py-2 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
          <input 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            placeholder="Buscar item..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {activeTab !== 'fleet' && (
          <div className="flex gap-2">
            <button onClick={() => setShowConferenceHistory(true)} className="px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              <History size={18}/> Histórico
            </button>
            <button onClick={() => setShowConference(true)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
              <ClipboardCheck size={18}/> Realizar Conferência
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{item.brand} {item.model}</h3>
                    <p className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">{item.type === 'ferramenta' ? `PAT: ${item.patrimony || item.assetTag || 'N/A'}` : item.serial}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.status === 'disponivel' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {item.status.replace('_', ' ')}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <User size={14}/> {item.currentHolder || 'Estoque'}
                </div>

                {item.type === 'epi' && item.expiresAt && (() => {
                  const expDate = new Date(item.expiresAt);
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const isExpired = expDate < today;
                  const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                  const isSoon = !isExpired && diffDays <= 30;

                  return (
                    <div className={`flex items-center gap-2 text-xs font-bold mb-4 p-2 rounded-lg border ${
                      isExpired ? 'bg-red-50 text-red-600 border-red-100' :
                      isSoon ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      <Calendar size={14}/>
                      <span>{isExpired ? 'Vencido em: ' : 'Validade: '} {expDate.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                    </div>
                  );
                })()}

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button 
                    onClick={() => setShowTransfer(item)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                    title="Transferir Responsável"
                  >
                    <ArrowRightLeft size={18}/>
                  </button>
                  {activeTab === 'fleet' ? (
                    <button 
                      onClick={() => setShowInspection(item)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <ClipboardCheck size={16}/> Vistoria
                    </button>
                  ) : (
                    <button 
                      onClick={() => handlePrintTerm(item)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <Printer size={16}/> Termo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modais / Wizards */}
      {showNewAsset && <NewAssetWizard onClose={() => setShowNewAsset(false)} onSuccess={loadItems} />}
      {showInspection && <InspectionWizard item={showInspection} onClose={() => setShowInspection(null)} />}
      {showTransfer && <TransferWizard item={showTransfer} onClose={() => setShowTransfer(null)} onSuccess={loadItems} />}
      {showConference && <ConferenceWizard onClose={() => setShowConference(false)} />}
      {showConferenceHistory && <ConferenceHistoryModal onClose={() => setShowConferenceHistory(false)} />}
    </div>
  );
}

// --- WIZARD DE CADASTRO DE ATIVO ---
const NewAssetWizard = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ type: 'veiculo', brand: '', model: '', serial: '', location: 'Estoque', photo: '', expiresAt: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/items', {
        ...data,
        category: 'equipamento', // Força categoria
        status: 'disponivel',
        patrimony: data.type === 'ferramenta' ? data.serial : data.serial, // Usa o input como patrimonio se for ferramenta
        photo: data.photo,
        expiresAt: data.type === 'epi' ? data.expiresAt : null
      });
      toast.success("Ativo cadastrado!");
      onSuccess();
      onClose();
    } catch (e) {
      toast.error("Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Novo Ativo - Passo {step}/3</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          {step === 1 ? (
            <>
              <label className="block text-sm font-bold text-slate-600">Tipo de Ativo</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'veiculo', label: 'Veículo', icon: Car },
                  { id: 'ferramenta', label: 'Ferramenta', icon: Wrench },
                  { id: 'epi', label: 'EPI', icon: HardHat }
                ].map(t => (
                  <button key={t.id} onClick={() => setData({...data, type: t.id})} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${data.type === t.id ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <t.icon size={24}/> <span className="text-xs font-bold">{t.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold mt-4">Próximo <ArrowRight size={18} className="inline"/></button>
            </>
          ) : (
            step === 2 ? (
                <div className="animate-in slide-in-from-right space-y-4">
                <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marca</label>
                <input className="w-full p-3 border rounded-xl" value={data.brand} onChange={e => setData({...data, brand: e.target.value})} placeholder="Ex: Fiat, Makita..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo</label>
                <input className="w-full p-3 border rounded-xl" value={data.model} onChange={e => setData({...data, model: e.target.value})} placeholder="Ex: Uno, Furadeira..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{data.type === 'veiculo' ? 'Placa' : (data.type === 'ferramenta' ? 'Patrimônio' : 'Serial / ID')}</label>
                <input className="w-full p-3 border rounded-xl" value={data.serial} onChange={e => setData({...data, serial: e.target.value})} placeholder={data.type === 'veiculo' ? 'ABC-1234' : (data.type === 'ferramenta' ? 'PAT-001' : 'SN123456')} />
              </div>

              {data.type === 'epi' && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Validade</label>
                  <input type="date" className="w-full p-3 border rounded-xl bg-slate-50" value={data.expiresAt} onChange={e => setData({...data, expiresAt: e.target.value})} />
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="px-4 py-3 border rounded-xl"><ArrowLeft size={20}/></button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">
                  Próximo <ArrowRight size={18} className="inline"/>
                </button>
              </div></div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-right">
                <label className="block w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 relative overflow-hidden">
                  {data.photo ? <img src={data.photo} className="w-full h-full object-cover"/> : <><Camera size={32} className="text-slate-400 mb-2"/><span className="text-xs font-bold text-slate-500">Foto do Ativo</span></>}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { if(e.target.files[0]) setData({...data, photo: await compressImage(e.target.files[0])}); }}/>
                </label>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setStep(2)} className="px-4 py-3 border rounded-xl"><ArrowLeft size={20}/></button>
                  <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">
                    {loading ? 'Salvando...' : 'Finalizar Cadastro'}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE HISTÓRICO DE CONFERÊNCIAS ---
const ConferenceHistoryModal = ({ onClose }) => {
  const [conferences, setConferences] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/general/conferences')
      .then(res => setConferences(res.data))
      .catch(() => toast.error("Erro ao carregar histórico"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Histórico de Conferências</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Lista Lateral */}
          <div className="w-1/3 border-r border-slate-100 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
            {loading ? <div className="p-4 text-center"><div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto"/></div> : 
             conferences.length === 0 ? <div className="p-4 text-center text-slate-400 text-sm">Nenhuma conferência registrada.</div> :
             conferences.map(conf => {
               const data = JSON.parse(conf.data);
               return (
                 <button key={conf.id} onClick={() => setSelected(conf)} className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === conf.id ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                   <div className="flex justify-between items-start mb-1">
                     <span className="font-bold text-slate-700 text-sm">{data.technician}</span>
                     <span className="text-[10px] text-slate-400">{new Date(conf.createdAt).toLocaleDateString()}</span>
                   </div>
                   <div className="flex gap-2 text-xs">
                     <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">OK: {data.itemsOk?.length || 0}</span>
                     <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Ausentes: {data.itemsMissing?.length || 0}</span>
                   </div>
                 </button>
               );
             })}
          </div>

          {/* Detalhes */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {selected ? (() => {
              const data = JSON.parse(selected.data);
              return (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Conferência de {data.technician}</h2>
                      <p className="text-sm text-slate-500">Realizada por {selected.user?.name} em {new Date(selected.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-400 uppercase">ID do Registro</div>
                      <div className="font-mono text-slate-600">#{selected.id}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><CheckCircle size={16}/> Itens Confirmados ({data.itemsOk?.length})</h4>
                      <ul className="text-sm text-emerald-700 list-disc list-inside max-h-32 overflow-y-auto">
                        {data.itemsOk?.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Itens Ausentes ({data.itemsMissing?.length})</h4>
                      <ul className="text-sm text-red-700 list-disc list-inside max-h-32 overflow-y-auto">
                        {data.itemsMissing?.length > 0 ? data.itemsMissing.map((item, i) => <li key={i}>{item}</li>) : <li className="list-none italic opacity-70">Nenhum item ausente</li>}
                      </ul>
                    </div>
                  </div>

                  {data.obs && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Observações</h4>
                      <p className="p-3 bg-slate-50 rounded-xl text-slate-700 text-sm border border-slate-100">{data.obs}</p>
                    </div>
                  )}

                  {data.photos?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Evidências Fotográficas</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {data.photos.map((photo, i) => (
                          <img key={i} src={photo} className="w-full h-32 object-cover rounded-xl border border-slate-200 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(photo, '_blank')}/>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.signature && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Assinatura do Técnico</h4>
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 inline-block">
                        <img src={data.signature} className="h-24 object-contain"/>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <ClipboardCheck size={64} className="mb-4 opacity-50"/>
                <p>Selecione uma conferência para ver os detalhes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- WIZARD DE TRANSFERÊNCIA ---
const TransferWizard = ({ item, onClose, onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/users').then(res => setUsers(res.data));
  }, []);

  const handleTransfer = async () => {
    if (!selectedUser) return toast.error("Selecione o novo responsável.");
    setLoading(true);
    try {
      await api.put(`/items/${item.id}`, {
        client: selectedUser,
        status: 'em_uso',
        location: 'Com Técnico'
      });
      toast.success("Transferência realizada!");
      onSuccess();
      onClose();
    } catch (e) {
      toast.error("Erro ao transferir.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Transferir: {item.model}</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <label className="block text-sm font-bold text-slate-600">Novo Responsável</label>
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
            {users.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u.name)} className={`p-3 border rounded-xl text-left font-medium text-sm flex items-center gap-2 transition-all ${selectedUser === u.name ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'hover:bg-slate-50'}`}>
                <User size={16} className={selectedUser === u.name ? "text-blue-500" : "text-slate-400"}/> {u.name}
              </button>
            ))}
          </div>
          <button onClick={handleTransfer} disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 mt-2">
            {loading ? 'Salvando...' : 'Confirmar Transferência'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- WIZARD DE VISTORIA (FROTA) ---
const InspectionWizard = ({ item, onClose }) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ km: '', fuel: '50', checks: {}, obs: '', photo: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/general/inspection', {
        itemId: item.id,
        checks: data.checks,
        obs: `KM: ${data.km} | Combustível: ${data.fuel}% | ${data.obs}`,
        photo: data.photo
      });
      toast.success("Vistoria salva!");
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Vistoria: {item.model}</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Gauge size={14}/> Hodômetro (KM)</label>
                <input type="number" className="w-full p-3 border rounded-xl text-lg font-mono" value={data.km} onChange={e => setData({...data, km: e.target.value})} placeholder="000000" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Fuel size={14}/> Nível de Combustível ({data.fuel}%)</label>
                <input type="range" className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" min="0" max="100" step="25" value={data.fuel} onChange={e => setData({...data, fuel: e.target.value})} />
                <div className="flex justify-between text-xs text-slate-400 mt-1"><span>Vazio</span><span>1/4</span><span>1/2</span><span>3/4</span><span>Cheio</span></div>
              </div>
              <button onClick={() => setStep(2)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold mt-2">Continuar</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 animate-in slide-in-from-right">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checklist Rápido</h4>
              {['Óleo', 'Água', 'Pneus', 'Luzes', 'Limpeza', 'Lataria'].map(check => (
                <div key={check} className="flex items-center justify-between p-3 border rounded-xl">
                  <span className="font-medium text-slate-700">{check}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setData(p => ({...p, checks: {...p.checks, [check]: 'ok'}}))} className={`p-2 rounded-lg ${data.checks[check] === 'ok' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}><CheckCircle size={20}/></button>
                    <button onClick={() => setData(p => ({...p, checks: {...p.checks, [check]: 'bad'}}))} className={`p-2 rounded-lg ${data.checks[check] === 'bad' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-300'}`}><AlertTriangle size={20}/></button>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(1)} className="px-4 py-3 border rounded-xl"><ArrowLeft size={20}/></button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Próximo</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right">
              <label className="block w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 relative overflow-hidden">
                {data.photo ? <img src={data.photo} className="w-full h-full object-cover"/> : <><Camera size={32} className="text-slate-400 mb-2"/><span className="text-xs font-bold text-slate-500">Foto Geral</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { if(e.target.files[0]) setData({...data, photo: await compressImage(e.target.files[0])}); }}/>
              </label>
              <textarea className="w-full p-3 border rounded-xl text-sm" rows="3" placeholder="Observações finais..." value={data.obs} onChange={e => setData({...data, obs: e.target.value})} />
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-4 py-3 border rounded-xl"><ArrowLeft size={20}/></button>
                <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">{loading ? 'Salvando...' : 'Finalizar'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- WIZARD DE CONFERÊNCIA ---
const ConferenceWizard = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [userItems, setUserItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/users').then(res => setUsers(res.data));
  }, []);

  useEffect(() => {
    if (selectedUser) {
      // Busca itens onde currentHolder contém o nome do usuário (busca simples)
      api.get('/items', { params: { search: selectedUser, limit: 100 } })
         .then(res => setUserItems(res.data.data.filter(i => i.currentHolder === selectedUser)));
    }
  }, [selectedUser]);

  const handleAddPhoto = async (e) => {
    if(e.target.files[0]) setPhotos([...photos, await compressImage(e.target.files[0])]);
  };

  const handleFinish = async () => {
    setLoading(true);
    const itemsOk = userItems.filter(i => checkedItems[i.id]).map(i => i.name);
    const itemsMissing = userItems.filter(i => !checkedItems[i.id]).map(i => i.name);
    
    try {
      await api.post('/general/conference', {
        technician: selectedUser,
        itemsOk,
        itemsMissing,
        obs: itemsMissing.length > 0 ? 'Itens ausentes detectados.' : 'Conferência completa.',
        photos,
        signature
      });
      toast.success("Conferência salva!");
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Conferência - Passo {step}/3</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {step === 1 && (
            <div className="animate-in slide-in-from-right">
              {!selectedUser ? (
              <>
              <label className="block text-sm font-bold text-slate-600">Selecione o Técnico</label>
              <div className="grid grid-cols-2 gap-2">
                {users.map(u => (
                  <button key={u.id} onClick={() => setSelectedUser(u.name)} className="p-3 border rounded-xl hover:bg-slate-50 text-left font-medium text-sm flex items-center gap-2">
                    <User size={16} className="text-slate-400"/> {u.name}
                  </button>
                ))}
              </div>
              </>
              ) : (
              <>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-700">{selectedUser}</span>
                <button onClick={() => setSelectedUser('')} className="text-xs text-blue-600 font-bold">Trocar</button>
              </div>
              
              {userItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Nenhum item vinculado.</div>
              ) : (
                <div className="space-y-2">
                  {userItems.map(item => (
                    <label key={item.id} className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${checkedItems[item.id] ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" className="w-5 h-5 accent-emerald-600 mr-3" checked={!!checkedItems[item.id]} onChange={() => setCheckedItems(p => ({...p, [item.id]: !p[item.id]}))} />
                      <div>
                        <p className="font-bold text-sm text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.serial}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right">
              <div className="bg-blue-50 p-4 rounded-xl text-blue-700 text-sm mb-2 flex items-center gap-2">
                <ImageIcon size={20}/> É obrigatório enviar no mínimo 3 fotos da conferência (Ex: Mala de ferramentas, EPIs, Veículo).
              </div>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border relative">
                    <img src={p} className="w-full h-full object-cover"/>
                    <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition-colors">
                  <Camera size={24} className="text-slate-400"/>
                  <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">Adicionar</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAddPhoto}/>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in slide-in-from-right">
              <label className="block text-sm font-bold text-slate-600 mb-2">Assinatura do Técnico</label>
              <SignaturePad onSave={setSignature} />
              {signature && <div className="text-xs text-emerald-600 font-bold text-center">Assinatura capturada!</div>}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex gap-3">
          {step > 1 && <button onClick={() => setStep(step - 1)} className="px-4 py-3 border rounded-xl"><ArrowLeft size={20}/></button>}
          
          {step < 3 ? (
            <button onClick={() => { if(step === 1 && !selectedUser) return toast.error("Selecione um técnico"); if(step === 2 && photos.length < 3) return toast.error("Envie pelo menos 3 fotos"); setStep(step + 1); }} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Próximo</button>
          ) : (
            <button onClick={() => { if(!signature) return toast.error("Assinatura obrigatória"); handleFinish(); }} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200">
              {loading ? 'Salvando...' : 'Finalizar e Salvar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};