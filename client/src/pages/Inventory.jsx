import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Download, 
  Box, Wifi, Activity, 
  MapPin, Trash2, Edit3, 
  History, Package, Cpu, Cable,
  X, Eye, User, Clock, Image as ImageIcon, FileText
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// --- COMPONENTES VISUAIS ---

const StatusBadge = ({ status }) => {
  const styles = {
    disponivel: 'bg-green-100 text-green-700 border-green-200',
    em_uso: 'bg-blue-100 text-blue-700 border-blue-200',
    manutencao: 'bg-orange-100 text-orange-700 border-orange-200',
    baixado: 'bg-gray-100 text-gray-600 border-gray-200',
    extraviado: 'bg-red-100 text-red-700 border-red-200'
  };

  const labels = {
    disponivel: 'Disponível',
    em_uso: 'Em Uso / Cliente',
    manutencao: 'Manutenção',
    baixado: 'Baixado',
    extraviado: 'Extraviado'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.baixado} flex items-center gap-1 w-fit`}>
      <div className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status] || status}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2.5 rounded-xl ${color} shadow-sm`}>
        <Icon size={20} />
      </div>
      {subtext && <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{subtext}</span>}
    </div>
    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
  </div>
);

// --- MODAL DE DETALHES ---
const ItemDetailsModal = ({ item, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/items/${item.id}/history`)
      .then(res => setHistory(res.data))
      .catch(() => toast.error("Erro ao carregar histórico"))
      .finally(() => setLoading(false));
  }, [item]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              {item.type === 'onu' ? <Wifi className="text-blue-500"/> : <Box className="text-slate-500"/>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{item.brand} {item.model}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="font-mono bg-slate-200 px-1.5 rounded text-slate-700">{item.serial}</span>
                <span>•</span>
                <span>{item.assetTag}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-500"/>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Coluna Esquerda: Info e Foto */}
            <div className="space-y-6">
              <div className="aspect-square bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                {item.photo ? (
                  <img src={item.photo} alt="Item" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon size={48} className="mx-auto mb-2 opacity-50"/>
                    <span className="text-sm">Sem foto</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <FileText size={16}/> Detalhes Técnicos
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Status:</span> <StatusBadge status={item.status}/></div>
                  <div className="flex justify-between"><span className="text-slate-500">Local:</span> <span className="font-medium text-slate-700">{item.location}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Cidade:</span> <span className="font-medium text-slate-700">{item.city}</span></div>
                  {item.clientName && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <span className="block text-xs text-slate-400 mb-1">Cliente Atual</span>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <User size={14}/> {item.clientName}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Histórico */}
            <div className="md:col-span-2">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <History size={20} className="text-blue-600"/> Histórico Completo
              </h3>
              
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
              ) : history.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                  Nenhum registro encontrado.
                </div>
              ) : (
                <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
                  {history.map((h, i) => (
                    <div key={i} className="relative animate-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${i*50}ms`}}>
                      <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                        <span className="font-bold text-slate-700 text-sm">{h.action}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={12}/> {new Date(h.date).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {h.details}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <User size={12}/> Responsável: <span className="font-medium text-slate-600">{h.user}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default function Inventory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estados
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, available: 0, inUse: 0, maintenance: 0, totalValue: 0 });
  
  // Filtros
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('equipamentos'); // equipamentos, materiais, cabos
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('Todas');
  const [clientFilter, setClientFilter] = useState('');

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => fetchItems(), 500);
    return () => clearTimeout(timer);
  }, [search, type, statusFilter, cityFilter, clientFilter, page]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/items', {
        params: {
          page,
          limit: 10,
          search,
          type,
          status: statusFilter,
          city: cityFilter,
          client: clientFilter
        }
      });
      setItems(data.data);
      setStats(data.stats);
      setTotalPages(data.meta.pages);
    } catch (error) {
      toast.error('Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      await api.delete(`/items/${id}`, { data: { password: prompt("Confirme sua senha de admin:"), reason: "Exclusão via Web" } });
      toast.success("Item excluído!");
      fetchItems();
    } catch (e) {
      toast.error("Erro ao excluir. Verifique permissões.");
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      
      {selectedItem && <ItemDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
      
      {/* HEADER & STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Ativos</h1>
          <p className="text-slate-500 text-sm">Controle total do inventário da rede.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/import')} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Download size={18}/> Importar
          </button>
          <button onClick={() => navigate('/items/new')} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 active:scale-95">
            <Plus size={18}/> Novo Item
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Itens Disponíveis" 
          value={stats.available} 
          icon={Box} 
          color="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Em Clientes" 
          value={stats.inUse} 
          icon={Wifi} 
          color="bg-purple-100 text-purple-600" 
        />
        <StatCard 
          title="Manutenção" 
          value={stats.maintenance} 
          icon={Activity} 
          color="bg-orange-100 text-orange-600" 
        />
      </div>

      {/* BARRA DE FILTROS E ABAS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Abas Superiores */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {[
            { id: 'equipamentos', label: 'Equipamentos', icon: Cpu },
            { id: 'materiais', label: 'Materiais', icon: Package },
            { id: 'cabos', label: 'Cabos & Drop', icon: Cable },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setType(tab.id); setPage(1); }}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${type === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Barra de Busca e Filtros */}
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center bg-slate-50/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por Serial, Patrimônio, Modelo ou Cliente..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <div className="relative min-w-[180px]">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Filtrar Cliente..." 
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 outline-none focus:border-blue-500"
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
              />
            </div>

            <select 
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 outline-none focus:border-blue-500 cursor-pointer"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos Status</option>
              <option value="disponivel">Disponível</option>
              <option value="em_uso">Em Uso</option>
              <option value="manutencao">Manutenção</option>
            </select>

            <select 
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 outline-none focus:border-blue-500 cursor-pointer"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
            >
              <option value="Todas">Todas Cidades</option>
              <option value="Nova Maringá">Nova Maringá</option>
              <option value="Tapurah">Tapurah</option>
              <option value="São José do Rio Claro">São José do Rio Claro</option>
            </select>
          </div>
        </div>

        {/* TABELA DE DADOS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <th className="px-6 py-4">Identificação</th>
                <th className="px-6 py-4">Localização / Cliente</th>
                <th className="px-6 py-4">Equipamento</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // SKELETON LOADING
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded mb-2"/><div className="h-3 w-16 bg-slate-200 rounded"/></td>
                    <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-200 rounded"/></td>
                    <td className="px-6 py-4"><div className="h-10 w-10 bg-slate-200 rounded-full mb-2"/><div className="h-4 w-32 bg-slate-200 rounded"/></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 rounded-full"/></td>
                    <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-200 rounded ml-auto"/></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="p-4 bg-slate-50 rounded-full mb-3">
                        <Package size={40} className="text-slate-300"/>
                      </div>
                      <p className="text-lg font-medium text-slate-600">Nenhum item encontrado</p>
                      <p className="text-sm text-slate-400">Tente ajustar os filtros ou busque por outro termo.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedItem(item)}>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-fit mb-1 border border-slate-200">
                          {item.serial || 'S/N'}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                          PAT: {item.assetTag || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                        {item.clientName ? <Wifi size={14} className="text-blue-500"/> : <MapPin size={14} className="text-slate-400"/>}
                        <span className="truncate max-w-[200px]">{item.clientName || item.location}</span>
                      </div>
                      <div className="text-xs text-slate-400 ml-5">{item.city}</div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {item.photo ? <img src={item.photo} alt="" className="w-full h-full object-cover"/> : <Box className="text-slate-400" size={18}/>}
                        </div>
                        <div>
                          <div className="font-bold text-slate-700 text-sm">{item.brand} {item.model}</div>
                          <div className="text-xs text-slate-400 capitalize">{item.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                          title="Ver Detalhes" 
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={18}/>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/items/${item.id}/edit`); }} 
                          title="Editar" 
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit3 size={18}/>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          title="Excluir" 
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Anterior
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}