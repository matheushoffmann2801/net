import React, { useState, useEffect } from 'react';
import { 
  Server, User, Box, AlertTriangle, Package, Activity, TrendingUp, Zap, BarChart3, Calendar, ArrowUpRight, PieChart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// --- COMPONENTES BENTO GRID ---

const BentoCard = ({ children, className = '', delay = 0, noGlass = false }) => (
  <div 
    className={`relative overflow-hidden rounded-[2rem] p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${
      noGlass 
        ? 'bg-white shadow-sm border border-slate-100' 
        : 'bg-white/80 backdrop-blur-xl border border-white/40 shadow-sm'
    } ${className}`}
    style={{ animationFillMode: 'both', animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

const StatItem = ({ title, value, icon: Icon, color, subtext, trend }) => (
  <div className="flex flex-col h-full justify-between relative z-10">
    <div className="flex justify-between items-start">
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 transition-transform duration-300 hover:scale-110`}>
        <Icon size={28} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          <TrendingUp size={14} /> {trend}
        </div>
      )}
    </div>
    
    <div className="mt-6">
      <h3 className="text-5xl font-bold text-slate-800 tracking-tighter mb-2">{value}</h3>
      <p className="text-base font-medium text-slate-500">{title}</p>
      {subtext && <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>}
    </div>

    {/* Decorative Background Icon */}
    <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none">
      <Icon size={140} />
    </div>
  </div>
);

export default function Dashboard() {
  const { user, selectedCity } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ total: 0, available: 0, inUse: 0, maintenance: 0, totalValue: 0 });

  useEffect(() => {
    loadData(); // Recarrega quando cidade ou MUNDO mudar
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
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-700">
      <div className="max-w-[1800px] mx-auto space-y-8">
      
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
                <p className="text-slate-500 font-medium mt-1">Visão geral do sistema e indicadores de performance.</p>
            </div>
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-200 shadow-sm">
                <Calendar size={18} className="text-slate-400"/>
                <span className="text-sm font-semibold text-slate-600 capitalize">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">

          {/* 1. Welcome Banner (Large - Spans 2 cols, 2 rows on LG) */}
          <BentoCard className="md:col-span-2 lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-none !bg-opacity-100 relative group" noGlass>
             <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity duration-700 rotate-12">
                <Activity size={320} />
             </div>
             <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-30 animate-pulse"></div>
             
             <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-bold backdrop-blur-md mb-6">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        Sistema Online
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight leading-tight">
                      Olá, <span className="text-blue-400">{user?.name?.split(' ')[0] || 'Admin'}</span>
                    </h2>
                    <p className="text-slate-300 text-lg max-w-lg leading-relaxed font-light">
                        Aqui está o resumo operacional de <strong className="text-white font-semibold border-b border-blue-500/50">{selectedCity}</strong>.
                        Você tem <strong className="text-white font-semibold">{stats.available}</strong> itens disponíveis para instalação hoje.
                    </p>
                </div>
                <div className="mt-8">
                    <button onClick={() => navigate('/items/new')} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 flex items-center gap-3 shadow-lg shadow-blue-900/20 group-hover:shadow-blue-900/40">
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
                color="bg-indigo-500"
             />
          </BentoCard>

          {/* 3. Available */}
          <BentoCard className="md:col-span-1" delay={200}>
             <StatItem
                title="Em Estoque"
                value={stats.available}
                icon={Box}
                color="bg-emerald-500"
                trend="Pronto para uso"
             />
          </BentoCard>

          {/* 4. In Use */}
          <BentoCard className="md:col-span-1" delay={300}>
             <StatItem
                title="Em Clientes"
                value={stats.inUse}
                icon={User}
                color="bg-blue-500"
                subtext={`${stats.total > 0 ? ((stats.inUse/stats.total)*100).toFixed(1) : 0}% da base instalada`}
             />
          </BentoCard>

          {/* 5. Maintenance */}
          <BentoCard className="md:col-span-1" delay={400}>
             <StatItem
                title="Manutenção"
                value={stats.maintenance}
                icon={AlertTriangle}
                color="bg-amber-500"
                subtext="Requer atenção"
             />
          </BentoCard>

          {/* 6. Distribution Chart (Wide) */}
          <BentoCard className="md:col-span-2 lg:col-span-2" delay={500}>
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <BarChart3 className="text-blue-500" size={24}/> Distribuição do Estoque
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Visão proporcional dos status</p>
                </div>
                <button onClick={loadData} className="p-3 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><Zap size={20}/></button>
             </div>
             
             <div className="space-y-8">
                {[
                  { label: 'Disponível', value: stats.available, total: stats.total, color: 'bg-emerald-500', text: 'text-emerald-600' },
                  { label: 'Em Uso (Clientes)', value: stats.inUse, total: stats.total, color: 'bg-blue-500', text: 'text-blue-600' },
                  { label: 'Manutenção / Defeito', value: stats.maintenance, total: stats.total, color: 'bg-amber-500', text: 'text-amber-600' }
                ].map((item, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between text-sm mb-3 font-medium items-end">
                      <span className="text-slate-500 font-semibold">{item.label}</span>
                      <span className={`${item.text} font-bold text-lg`}>{item.value} <span className="text-slate-300 text-xs font-normal">/ {item.total}</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.color} shadow-sm transition-all duration-1000 ease-out relative group-hover:opacity-80`} 
                        style={{width: `${item.total ? (item.value/item.total)*100 : 0}%`}}
                      ></div>
                    </div>
                  </div>
                ))}
             </div>
          </BentoCard>

          {/* 7. Quick Actions / Links */}
          <BentoCard className="md:col-span-1 lg:col-span-2 flex flex-col justify-center bg-gradient-to-br from-blue-50/50 to-white" delay={600} noGlass>
             <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
                    <Package size={28} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Gestão Rápida</h3>
                    <p className="text-sm text-slate-500 font-medium">Acessos frequentes</p>
                </div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <button onClick={() => navigate('/inventory')} className="p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:-translate-y-1 transition-all text-left group">
                    <span className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Visualizar</span>
                    <span className="font-bold text-slate-700 text-lg group-hover:text-blue-600 flex items-center gap-2">Inventário <ArrowUpRight size={18}/></span>
                </button>
                <button onClick={() => navigate('/reports')} className="p-5 bg-white border border-slate-100 rounded-2xl hover:border-purple-200 hover:shadow-lg hover:-translate-y-1 transition-all text-left group">
                    <span className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Gerar</span>
                    <span className="font-bold text-slate-700 text-lg group-hover:text-purple-600 flex items-center gap-2">Relatórios <ArrowUpRight size={18}/></span>
                </button>
             </div>
          </BentoCard>

        </div>
      </div>
    </div>
  );
}