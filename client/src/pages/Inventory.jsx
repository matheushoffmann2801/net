import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Download, Filter, Save,
  Box, Wifi, Activity, MapPin, ArrowRightLeft,
  Trash2, Edit3, History, Package, 
  X, Eye, User, Clock, Image as ImageIcon,
  ChevronDown, ChevronRight, Tag, ChevronLeft, Calendar, Printer
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import onuDefault from './onufiber.png';
import logo from './logo.png';

// ========== COMPONENTES AUXILIARES ==========

const StatusBadge = ({ status }) => {
  const configs = {
    disponivel: { 
      dot: 'bg-emerald-500', 
      bg: 'bg-emerald-50 border-emerald-100', 
      text: 'text-emerald-700',
      label: 'Disponível'
    },
    em_uso: { 
      dot: 'bg-blue-500', 
      bg: 'bg-blue-50 border-blue-100', 
      text: 'text-blue-700',
      label: 'Em Uso'
    },
    manutencao: { 
      dot: 'bg-amber-500', 
      bg: 'bg-amber-50 border-amber-100', 
      text: 'text-amber-700',
      label: 'Manutenção'
    },
    baixado: { 
      dot: 'bg-slate-500', 
      bg: 'bg-slate-50 border-slate-100', 
      text: 'text-slate-700',
      label: 'Baixado'
    },
    extraviado: { 
      dot: 'bg-red-500', 
      bg: 'bg-red-50 border-red-100', 
      text: 'text-red-700',
      label: 'Extraviado'
    }
  };

  const config = configs[status] || configs.baixado;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {config.label}
    </span>
  );
};

// ========== MODAL DE DETALHES ==========

const ItemDetailsModal = ({ item, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    api.get(`/items/${item.id}/history`)
      .then(res => setHistory(res.data))
      .catch(() => toast.error("Erro ao carregar histórico"))
      .finally(() => setLoading(false));
  }, [item]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Simplificado */}
        <div className="relative p-8 border-b bg-gradient-to-br from-slate-900 to-slate-800">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-start gap-4 text-white">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
              {item.type === 'onu' ? <Wifi size={28} /> : <Box size={28} />}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-3 tracking-tight">{item.brand} {item.model}</h2>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-lg font-mono border border-white/10">
                  SN: {item.serial}
                </span>
                <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10">
                  PAT: {item.assetTag}
                </span>
                <StatusBadge status={item.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs de Navegação */}
        <div className="flex border-b bg-slate-50">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === 'info' 
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Informações
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-3 font-semibold text-sm transition-colors ${
              activeTab === 'history' 
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white' 
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Histórico
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {activeTab === 'info' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Foto */}
              <div className="md:col-span-1">
                <div className="aspect-square bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm p-2">
                  {item.photo || (item.type === 'onu' && onuDefault) ? (
                    <img src={item.photo || onuDefault} alt="Item" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <div className="text-center">
                        <ImageIcon size={48} className="mx-auto mb-2" />
                        <p className="text-sm">Sem foto</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Informações */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <MapPin size={20} className="text-blue-600" />
                    Localização
                  </h3>
                  <div className="space-y-3">
                    <InfoRow label="Local" value={item.location} />
                    <InfoRow label="Cidade" value={item.city} />
                    {item.client && (
                      <div className="pt-3 border-t">
                        <InfoRow 
                          label="Cód. Cliente" 
                          value={item.client}
                          icon={<User size={16} className="text-blue-600" />}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Package size={20} className="text-blue-600" />
                    Detalhes do Equipamento
                  </h3>
                  <div className="space-y-3">
                    <InfoRow label="Tipo" value={item.type?.toUpperCase()} />
                    <InfoRow label="Marca" value={item.brand} />
                    <InfoRow label="Modelo" value={item.model} />
                    <InfoRow label="Status" value={<StatusBadge status={item.status} />} />
                    {item.technician && <InfoRow label="Técnico" value={item.technician} />}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                <History size={22} className="text-blue-600" />
                Histórico de Movimentações
              </h3>
              
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
                  <Clock size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500">Nenhum histórico disponível</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((h, i) => (
                    <div 
                      key={i} 
                      className="flex gap-4 p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Activity size={18} className="text-blue-600" />
                        </div>
                        {i < history.length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-200 mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{h.action}</p>
                        {h.clientName && (
                          <p className="text-sm text-slate-600">Cliente: {h.clientName}</p>
                        )}
                        {h.details && <p className="text-xs text-slate-500 mt-0.5">{h.details}</p>}
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-slate-400">{new Date(h.date || h.createdAt || h.timestamp).toLocaleString('pt-BR')}</span>
                          {h.user && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{h.user}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, icon }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-slate-500 font-medium">{label}</span>
    <div className="flex items-center gap-2 font-semibold text-slate-800">
      {icon}
      {typeof value === 'string' ? <span>{value}</span> : value}
    </div>
  </div>
);

// ========== MODAL DE EDIÇÃO / MOVIMENTAÇÃO ==========

const EditItemModal = ({ item, onClose, onSuccess }) => {
  const [technicians, setTechnicians] = useState([]);
  // Define o modo inicial baseado no estado atual do item
  const [mode, setMode] = useState(() => {
    if (item.status === 'em_uso') return 'client';
    if (item.status === 'manutencao') return 'maintenance';
    if (['baixado', 'extraviado'].includes(item.status)) return 'writeoff';
    if (item.technician) return 'tech';
    return 'stock';
  });

  const [formData, setFormData] = useState({
    status: item.status || 'disponivel',
    client: item.client || '',
    technician: item.technician || '',
    location: item.location || '',
    city: item.city || 'Nova Maringá',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Atualiza campos quando o modo muda
  useEffect(() => {
    setFormData(prev => {
      const next = { ...prev };
      if (mode === 'stock') {
        next.status = 'disponivel';
        next.client = '';
        next.technician = '';
      } else if (mode === 'tech') {
        next.status = 'disponivel';
        next.client = '';
        if (!next.location || next.location === 'Estoque') next.location = 'Carro Técnico';
      } else if (mode === 'client') {
        next.status = 'em_uso';
        next.location = 'Instalado';
      } else if (mode === 'maintenance') {
        next.status = 'manutencao';
        next.client = '';
      } else if (mode === 'writeoff') {
        next.status = 'baixado';
        next.client = '';
        next.technician = '';
        next.location = '';
      }
      return next;
    });
  }, [mode]);

  useEffect(() => {
    api.get('/users').then(res => setTechnicians(res.data)).catch(() => {});
  }, []);

  const handlePrintTerm = () => {
    if (!formData.technician) return toast.error("Informe o nome do técnico para gerar o termo.");
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Pop-up bloqueado. Permita pop-ups para imprimir.");

    const logoSrc = logo.startsWith('data:') || logo.startsWith('http') ? logo : `${window.location.origin}${logo.startsWith('/') ? '' : '/'}${logo}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Termo de Responsabilidade - ${item.serial}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
          .logo { height: 60px; margin-bottom: 15px; }
          h1 { font-size: 24px; color: #1e293b; margin: 0; }
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
          <div class="subtitle">Entrega de Equipamento / Material</div>
        </div>

        <p>
          Pelo presente termo, eu, <strong>${formData.technician.toUpperCase()}</strong>, declaro que recebi da empresa 
          <strong>MTSPEED TECNOLOGIA</strong> o equipamento abaixo discriminado, em perfeito estado de conservação e funcionamento.
        </p>
        
        <div class="item-box">
          <div class="item-row"><span class="label">Equipamento</span> <span class="value">${item.brand} ${item.model}</span></div>
          <div class="item-row"><span class="label">Serial Number</span> <span class="value">${item.serial}</span></div>
          <div class="item-row"><span class="label">Patrimônio</span> <span class="value">${item.patrimony || item.assetTag || 'N/A'}</span></div>
          <div class="item-row"><span class="label">Tipo</span> <span class="value">${item.type?.toUpperCase()}</span></div>
        </div>

        <p>
          Assumo total responsabilidade pela guarda e conservação do equipamento, comprometendo-me a utilizá-lo exclusivamente para fins profissionais 
          relacionados às atividades da empresa. Em caso de dano, extravio ou mau uso comprovado, estou ciente das medidas administrativas cabíveis.
        </p>

        <div class="date">
          ${item.city || 'Nova Maringá'}, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>

        <div class="signatures">
          <div class="sig-block">
            <div class="line"></div>
            <strong>MTSPEED TECNOLOGIA</strong><br>
            <span style="font-size: 12px">Expedidor</span>
          </div>
          <div class="sig-block">
            <div class="line"></div>
            <strong>${formData.technician.toUpperCase()}</strong><br>
            <span style="font-size: 12px">Técnico Responsável</span>
          </div>
        </div>
        
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      
      // Limpezas de segurança antes de enviar
      if (payload.status !== 'em_uso') payload.client = null;
      if (mode === 'stock') payload.technician = null;

      await api.put(`/items/${item.id}`, payload);
      toast.success("Item movimentado com sucesso!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar movimentação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Movimentar Item</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full"><X size={20} className="text-slate-400"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          
          {/* SELETOR DE AÇÃO (MODO) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Movimentação</label>
            <select 
              className="w-full p-3 border-2 border-blue-100 rounded-xl bg-blue-50/50 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-700" 
              value={mode} 
              onChange={e => setMode(e.target.value)}
            >
              <option value="stock">📦 Devolver ao Estoque</option>
              <option value="tech">👷 Entregar para Técnico</option>
              <option value="client">🏠 Instalar em Cliente</option>
              <option value="maintenance">🔧 Enviar para Manutenção</option>
              <option value="writeoff">🚫 Dar Baixa / Perda</option>
            </select>
          </div>

          <hr className="border-slate-100"/>

          {/* CAMPOS CONDICIONAIS */}
          
          {mode === 'client' && (
            <>
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente (Obrigatório)</label>
                <input required autoFocus className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} placeholder="Ex: 1234 - João Silva" />
              </div>
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Técnico Instalador</label>
                <input className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" value={formData.technician} onChange={e => setFormData({...formData, technician: e.target.value})} placeholder="Quem realizou a instalação?" />
              </div>
            </>
          )}

          {mode === 'tech' && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Técnico Responsável (Obrigatório)</label>
              <div className="flex gap-2">
                <select 
                  required 
                  autoFocus 
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" 
                  value={formData.technician} 
                  onChange={e => setFormData({...formData, technician: e.target.value})}
                >
                  <option value="">Selecione o técnico...</option>
                  {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
                <button type="button" onClick={handlePrintTerm} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Imprimir Termo de Responsabilidade">
                  <Printer size={20}/>
                </button>
              </div>
            </div>
          )}

          {mode !== 'writeoff' && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Localização Física</label>
              <input className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder={mode === 'stock' ? "Ex: Prateleira A1" : "Ex: Carro, Mochila..."} />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cidade Base</label>
            <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}>
              <option value="Nova Maringá">Nova Maringá</option>
              <option value="Tapurah">Tapurah</option>
              <option value="São José do Rio Claro">São José do Rio Claro</option>
            </select>
          </div>

          {mode === 'writeoff' && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motivo da Baixa</label>
              <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 mb-2" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="baixado">Baixado (Defeito/Obsoleto)</option>
                <option value="extraviado">Extraviado (Perda/Roubo)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observação {mode === 'writeoff' && '(Obrigatório)'}</label>
            <textarea required={mode === 'writeoff'} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Detalhes adicionais..." />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex justify-center items-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Save size={18}/> Confirmar Movimentação</>}
          </button>
        </form>
      </div>
    </div>
  );
};

// ========== COMPONENTE PRINCIPAL ==========

export default function Inventory() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [cityFilter, setCityFilter] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    disponivel: 0,
    em_uso: 0,
    manutencao: 0
  });

  useEffect(() => {
    loadItems();
  }, [page, searchTerm, statusFilter, cityFilter, typeFilter]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        search: searchTerm,
        status: statusFilter === 'Todos' ? undefined : statusFilter,
        city: cityFilter === 'Todas' ? undefined : cityFilter,
        type: typeFilter === 'Todos' ? undefined : typeFilter
      };
      
      const res = await api.get('/items', { params });
      
      // CORREÇÃO: Usar estrutura correta do backend (res.data.data e res.data.meta)
      setItems(res.data.data || []);
      setTotalPages(res.data.meta?.pages || 1);
      
      // CORREÇÃO: Usar stats que já vêm na resposta principal
      if (res.data.stats) setStats(res.data.stats);
    } catch (error) {
      toast.error('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    
    try {
      await api.delete(`/items/${id}`);
      toast.success('Item excluído com sucesso!');
      loadItems();
    } catch (error) {
      toast.error('Erro ao excluir item');
    }
  };

  const handleExport = async () => {
    const toastId = toast.loading('Gerando arquivo...');
    try {
      // CORREÇÃO: Exportação Client-Side (Backend não tem rota de export)
      const res = await api.get('/items', { params: { limit: 10000, city: cityFilter === 'Todas' ? undefined : cityFilter } });
      const data = res.data.data;

      if (!data || data.length === 0) throw new Error("Sem dados");

      const headers = ['ID', 'Serial', 'Patrimonio', 'Marca', 'Modelo', 'Status', 'Cliente', 'Cidade', 'Local'];
      const csvContent = [
        headers.join(';'),
        ...data.map(item => [
          item.id, item.serial, item.assetTag, item.brand, item.model, item.status, item.clientName || '', item.city, item.location
        ].join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventario_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Exportação concluída!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao exportar', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* Header Moderno */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-1">Inventário</h1>
              <p className="text-slate-600">Gerencie seus equipamentos de forma eficiente</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-colors shadow-sm"
              >
                <Download size={18} />
                Exportar
              </button>
              <button
                onClick={() => navigate('/items/new')}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all active:scale-95"
              >
                <Plus size={18} />
                Novo Item
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        
        {/* Barra de Busca e Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Campo de Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por serial, patrimônio ou código do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
              />
            </div>

            {/* Botão de Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${
                showFilters 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Filter size={18} />
              Filtros
              {showFilters ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          {/* Filtros Expansíveis */}
          {showFilters && (
            <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700 cursor-pointer"
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="disponivel">Disponível</option>
                  <option value="em_uso">Em Uso</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="baixado">Baixado</option>
                  <option value="extraviado">Extraviado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cidade</label>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700 cursor-pointer"
                >
                  <option value="Todas">Todas as Cidades</option>
                  <option value="Nova Maringá">Nova Maringá</option>
                  <option value="Tapurah">Tapurah</option>
                  <option value="São José do Rio Claro">São José do Rio Claro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tipo</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-slate-700 cursor-pointer"
                >
                  <option value="Todos">Todos os Tipos</option>
                  <option value="onu">ONU</option>
                  <option value="roteador">Roteador</option>
                  <option value="switch">Switch</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Grid de Itens (Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Skeleton Loading
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded"></div>
                  <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl p-12 text-center border">
              <Package size={64} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum item encontrado</h3>
              <p className="text-slate-500">Tente ajustar os filtros ou adicione novos itens ao inventário</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                {/* Header do Card */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 group-hover:border-blue-200 transition-colors shadow-sm">
                    {item.photo || (item.type === 'onu' && onuDefault) ? (
                      <img src={item.photo || onuDefault} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Box className="text-slate-400" size={24} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-lg truncate group-hover:text-blue-600 transition-colors tracking-tight">
                      {item.brand} {item.model}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{item.type}</p>
                  </div>
                </div>

                {/* Informações */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag size={16} className="text-slate-400" />
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {item.serial}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    {item.client ? (
                      <>
                        <User size={16} className="text-blue-500" />
                        <span className="truncate font-medium">Cód: {item.client}</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={16} className="text-slate-400" />
                        <span className="truncate font-medium">{item.location}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={14} className="text-slate-300" />
                    {item.city}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                    <Calendar size={14} className="text-slate-300" />
                    Cadastrado em: {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                {/* Footer do Card */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <StatusBadge status={item.status} />
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                      className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                      className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex gap-1">
              {(() => {
                // Lógica de Paginação Inteligente (1 ... 4 5 6 ... 10)
                const range = [];
                const delta = 2;
                for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) range.push(i);
                if (page - delta > 2) range.unshift('...');
                if (page + delta < totalPages - 1) range.push('...');
                range.unshift(1);
                if (totalPages > 1) range.push(totalPages);

                return range.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => typeof p === 'number' && setPage(p)}
                    disabled={typeof p !== 'number'}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                      page === p
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : typeof p === 'number' ? 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200' : 'text-slate-400'
                    }`}
                  >
                    {p}
                  </button>
                ));
              })()}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedItem && (
        <ItemDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Modal de Edição */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={loadItems}
        />
      )}
    </div>
  );
}