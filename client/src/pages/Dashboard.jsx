import React, { useState, useEffect } from 'react';
import { 
  Server, User, Box, AlertTriangle, Package, Activity, TrendingUp, Zap, BarChart3, Calendar, ArrowUpRight, PieChart, Layers, Wifi, Bell, AlertOctagon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// --- COMPONENTES BENTO GRID ---

const BentoCard = ({ children, className = '', delay = 0, noGlass = false }) => (
  <div 
    className={`relative overflow-hidden rounded-[2.5rem] p-8 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 group ${
      noGlass 
        ? 'bg-white shadow-sm border border-slate-100' 
        : 'bg-white/60 backdrop-blur-2xl border border-white/60 shadow-sm ring-1 ring-white/50'
    } ${className}`}
    style={{ animationFillMode: 'both', animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

const StatItem = ({ title, value, icon: Icon, gradient, subtext, trend }) => (
  <div className="flex flex-col h-full justify-between relative z-10">
    <div className="flex justify-between items-start">
      <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-blue-500/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-emerald-100/50">
          <TrendingUp size={12} /> {trend}
        </div>
      )}
    </div>
    
    <div className="mt-6">
      <h3 className="text-4xl lg:text-5xl font-bold text-slate-800 tracking-tighter mb-1">{value}</h3>
      <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</p>
      {subtext && <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {subtext}</p>}
    </div>

    {/* Decorative Background Icon */}
    <div className="absolute -right-8 -bottom-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500 pointer-events-none rotate-12">
      <Icon size={160} />
    </div>
  </div>
);

export default function Dashboard() {
  const { user, selectedCity } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ total: 0, available: 0, inUse: 0, maintenance: 0, totalValue: 0 });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadData(); // Recarrega quando cidade ou MUNDO mudar
    if (user?.role?.toLowerCase() === 'admin') {
      api.get('/notifications').then(res => setUnreadCount(res.data.length)).catch(()=>{});
    }
  }, [selectedCity]);

  async function loadData() {
    setLoading(true);
    try {
      const response = await api.get('/items', { 
        params: { 
          city: selectedCity, 
          limit: 1000,
          type: 'equipamentos'
        }
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 animate-in fade-in duration-700 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-100/40 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-[1800px] mx-auto space-y-8 relative z-10">
      
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight flex items-center gap-3">Dashboard <span className="text-sm font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 align-middle">v2.0 Pro</span></h1>
                <p className="text-slate-500 font-medium mt-1">Visão geral do sistema e indicadores de performance.</p>
            </div>
            <div className="flex items-center gap-3">
                {user?.role?.toLowerCase() === 'admin' && (
                  <button onClick={() => navigate('/notifications')} className="relative p-3 bg-white/80 backdrop-blur-md rounded-full border border-slate-200 shadow-sm hover:shadow-md hover:bg-white transition-all group" title="Caixa de Entrada">
                    <Bell size={20} className="text-slate-600 group-hover:text-blue-600 transition-colors"/>
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                    )}
                  </button>
                )}
                
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-default">
                <Calendar size={18} className="text-slate-400"/>
                <span className="text-sm font-semibold text-slate-600 capitalize">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                </div>
            </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">

          {/* 1. Welcome Banner (Large - Spans 2 cols, 2 rows on LG) */}
          <BentoCard className="md:col-span-2 lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-900 text-white border-none !bg-opacity-100 relative group overflow-hidden" noGlass>
             <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity duration-700 rotate-12">
                <Activity size={320} />
             </div>
             <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
             
             <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-bold backdrop-blur-md mb-6">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        Sistema Online
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-bold mb-6 tracking-tight leading-tight">
                      Olá, <span className="text-blue-400">{user?.name?.split(' ')[0] || 'Admin'}</span>
                    </h2>
                    <div className="grid grid-cols-2 gap-6 max-w-md">
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                           <p className="text-slate-400 text-xs uppercase font-bold mb-1">Base Operacional</p>
                           <p className="text-white font-bold text-lg flex items-center gap-2"><Wifi size={16} className="text-blue-400"/> {selectedCity}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                           <p className="text-slate-400 text-xs uppercase font-bold mb-1">Disponibilidade</p>
                           <p className="text-white font-bold text-lg flex items-center gap-2"><Box size={16} className="text-emerald-400"/> {stats.available} Itens</p>
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <button onClick={() => navigate('/items/new')} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center gap-3 shadow-lg shadow-blue-900/20 group-hover:shadow-blue-900/40 w-fit">
                        <Zap size={20} className="fill-white" /> Ação Rápida: Novo Item
                    </button>
                </div>
             </div>
          </BentoCard>

          {/* 2. Total Assets */}
          <BentoCard className="md:col-span-1" delay={100}>
             <StatItem
                title="Total de Ativos"
                value={stats.total}
                icon={Server}
                gradient="from-indigo-500 to-purple-600"
             />
          </BentoCard>

          {/* 3. Available */}
          <BentoCard className="md:col-span-1" delay={200}>
             <StatItem
                title="Em Estoque"
                value={stats.available}
                icon={Box}
                gradient="from-emerald-400 to-teal-600"
                trend="Pronto para uso"
             />
          </BentoCard>

          {/* 4. In Use */}
          <BentoCard className="md:col-span-1" delay={300}>
             <StatItem
                title="Em Clientes"
                value={stats.inUse}
                icon={User}
                gradient="from-blue-500 to-cyan-600"
                subtext={`${stats.total > 0 ? ((stats.inUse/stats.total)*100).toFixed(1) : 0}% da base instalada`}
             />
          </BentoCard>

          {/* 5. Maintenance */}
          <BentoCard className="md:col-span-1" delay={400}>
             <StatItem
                title="Manutenção"
                value={stats.maintenance}
                icon={AlertTriangle}
                gradient="from-amber-400 to-orange-600"
                subtext="Requer atenção"
             />
          </BentoCard>

          {/* 6. Distribution Chart (Wide) */}
          <BentoCard className="md:col-span-2 lg:col-span-2" delay={500}>
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <PieChart className="text-blue-500" size={24}/> Distribuição do Estoque
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Visão proporcional dos status</p>
                </div>
                <button onClick={loadData} className="p-3 hover:bg-slate-50 rounded-full text-slate-400 transition-colors hover:rotate-180 duration-500"><Zap size={20}/></button>
             </div>
             
             <div className="space-y-8">
                {[
                  { label: 'Disponível', value: stats.available, total: stats.total, color: 'bg-emerald-500', text: 'text-emerald-600', icon: Box },
                  { label: 'Em Uso (Clientes)', value: stats.inUse, total: stats.total, color: 'bg-blue-500', text: 'text-blue-600', icon: User },
                  { label: 'Manutenção / Defeito', value: stats.maintenance, total: stats.total, color: 'bg-amber-500', text: 'text-amber-600', icon: AlertTriangle }
                ].map((item, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between text-sm mb-3 font-medium items-end">
                      <span className="text-slate-600 font-bold flex items-center gap-2"><item.icon size={16} className={item.text}/> {item.label}</span>
                      <span className={`${item.text} font-bold text-lg`}>{item.value} <span className="text-slate-300 text-xs font-normal">/ {item.total}</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200/50">
                      <div 
                        className={`h-full rounded-full ${item.color} shadow-lg shadow-${item.color.split('-')[1]}-500/30 transition-all duration-1000 ease-out relative group-hover:opacity-90`} 
                        style={{width: `${item.total ? (item.value/item.total)*100 : 0}%`}}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </BentoCard>

          {/* 7. Quick Actions / Links */}
          <BentoCard className="md:col-span-1 lg:col-span-2 flex flex-col justify-center bg-gradient-to-br from-slate-50 to-white" delay={600} noGlass>
             <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-white text-blue-600 rounded-2xl shadow-sm border border-blue-100">
                    <Package size={28} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Gestão Rápida</h3>
                    <p className="text-sm text-slate-500 font-medium">Acessos frequentes</p>
                </div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <button onClick={() => navigate('/inventory')} className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-400 hover:ring-4 hover:ring-blue-50 hover:shadow-xl hover:-translate-y-1 transition-all text-left group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Layers size={80}/></div>
                    <span className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Visualizar</span>
                    <span className="font-bold text-slate-700 text-lg group-hover:text-blue-600 flex items-center gap-2">Inventário <ArrowUpRight size={18}/></span>
                </button>
                <button onClick={() => navigate('/reports')} className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-400 hover:ring-4 hover:ring-purple-50 hover:shadow-xl hover:-translate-y-1 transition-all text-left group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><BarChart3 size={80}/></div>
                    <span className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Gerar</span>
                    <span className="font-bold text-slate-700 text-lg group-hover:text-purple-600 flex items-center gap-2">Relatórios <ArrowUpRight size={18}/></span>
                </button>
                <button onClick={() => navigate('/credit-control')} className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-red-400 hover:ring-4 hover:ring-red-50 hover:shadow-xl hover:-translate-y-1 transition-all text-left group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertOctagon size={80}/></div>
                    <span className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Financeiro</span>
                    <span className="font-bold text-slate-700 text-lg group-hover:text-red-600 flex items-center gap-2">Inadimplência <ArrowUpRight size={18}/></span>
                </button>
             </div>
          </BentoCard>

        </div>
      </div>
    </div>
  );
}