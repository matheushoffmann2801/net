import React, { useState, useEffect } from 'react';
import { 
  Server, User, Box, AlertTriangle, Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const StatCard = ({ title, value, icon: Icon, color, subtext, delay }) => (
  <div 
    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-700"
    style={{ animationFillMode: 'both', animationDelay: `${delay}ms` }}
  >
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    'disponivel': 'bg-green-100 text-green-700 border-green-200',
    'em_uso': 'bg-blue-100 text-blue-700 border-blue-200',
    'manutencao': 'bg-orange-100 text-orange-700 border-orange-200',
    'extraviado': 'bg-red-100 text-red-700 border-red-200',
    'baixado': 'bg-gray-100 text-gray-700 border-gray-200',
  };
  const label = status ? status.replace('_', ' ').toUpperCase() : 'N/A';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
};

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
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
          <p className="text-slate-500 text-sm">Gestão de <strong className="text-blue-600">Equipamentos</strong> em {selectedCity}</p>
        </div>
      </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            <StatCard title="Total de Ativos" value={stats.total} icon={Server} color="bg-slate-500" delay={0} />
            <StatCard title="Em Clientes" value={stats.inUse} icon={User} color="bg-blue-500" subtext={`${stats.total > 0 ? ((stats.inUse/stats.total)*100).toFixed(1) : 0}% da base`} delay={100} />
            <StatCard title="Em Estoque" value={stats.available} icon={Box} color="bg-green-500" delay={200} />
            <StatCard title="Manutenção/Defeito" value={stats.maintenance} icon={AlertTriangle} color="bg-orange-500" delay={300} />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationFillMode: 'both', animationDelay: '400ms' }}>
            <h3 className="font-bold text-slate-700 mb-4">Distribuição do Estoque</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Disponível</span> <span className="font-bold">{stats.available}</span></div>
                <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full" style={{width: `${stats.total ? (stats.available/stats.total)*100 : 0}%`}}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Em Uso</span> <span className="font-bold">{stats.inUse}</span></div>
                <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{width: `${stats.total ? (stats.inUse/stats.total)*100 : 0}%`}}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Manutenção</span> <span className="font-bold">{stats.maintenance}</span></div>
                <div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-orange-500 h-2.5 rounded-full" style={{width: `${stats.total ? (stats.maintenance/stats.total)*100 : 0}%`}}></div></div>
              </div>
            </div>
          </div>
        </div>

    </div>
  );
}