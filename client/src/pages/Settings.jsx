import React, { useState, useEffect } from 'react';
import { Tag, Layers, Shield, FileText, Download, HardDrive, AlertTriangle, Database, Settings as SettingsIcon } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

// Importa os novos componentes de abas
import RolesTab from '../components/Settings/RolesTab';
import BrandsTab from '../components/Settings/BrandsTab';
import ModelsTab from '../components/Settings/ModelsTab';
import AuditTab from '../components/Settings/AuditTab';
import SystemBackupTab from '../components/Settings/SystemBackupTab';
import AutoBackupsTab from '../components/Settings/AutoBackupsTab';
import DangerZoneTab from '../components/Settings/DangerZoneTab';

// Componente para o botão da aba
function TabBtn({ id, label, description, icon: Icon, active, set, danger }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => set(id)}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all duration-200 group ${
        isActive
          ? danger
            ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200'
            : 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-800'
      }`}
    >
      <div className={`p-2 rounded-xl transition-colors ${isActive ? (danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600') : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
        <Icon size={20} />
      </div>
      <div>
        <span className="block font-bold text-sm">{label}</span>
        {description && <span className="block text-xs opacity-70 font-medium mt-0.5">{description}</span>}
      </div>
      {isActive && <div className={`ml-auto w-1.5 h-1.5 rounded-full ${danger ? 'bg-red-500' : 'bg-blue-500'}`} />}
    </button>
  );
}

export default function Settings() {
  const { user } = useAuth(); // Pega o usuário logado
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('roles');

  // Estados de Dados
  const [roles, setRoles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [autoBackups, setAutoBackups] = useState([]);

  useEffect(() => {
    loadAll();
    // Verifica se veio de um redirecionamento com aba específica
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, []);

  async function loadAll() {
    try {
      const [r, b, m, a, s] = await Promise.all([
        api.get('/roles'),
        api.get('/brands'),
        api.get('/models'),
        api.get('/audit'),
        api.get('/admin/stats').catch(() => ({ data: {} })) // Fallback para stats
      ]);
      setRoles(r.data);
      setBrands(b.data);
      setModels(m.data);
      setAuditLogs(a.data || []);
      setDbStats(s.data);

      if (user?.username === 'admin') {
        api.get('/admin/backups/auto')
          .then(res => setAutoBackups(res.data))
          .catch(() => toast.error("Erro ao carregar backups automáticos."));
      }
    } catch (error) {
      toast.error("Erro ao carregar dados das configurações.");
      console.error("Erro ao carregar dados:", error);
    }
  }

  // Verifica se é o Super Admin (username === 'admin')
  const isSuperAdmin = user?.username === 'admin';

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-slate-400"/> Configurações
          </h1>
          <p className="text-slate-500 font-medium mt-2 ml-11">Gerencie permissões, dados e preferências do sistema.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sidebar de Navegação */}
          <nav className="w-full lg:w-80 flex flex-col gap-2 shrink-0 sticky top-8">
            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Geral</div>
            <TabBtn id="roles" label="Cargos e Permissões" description="Gerenciar níveis de acesso" icon={Shield} active={activeTab} set={setActiveTab} />
            <TabBtn id="brands" label="Marcas" description="Fabricantes de equipamentos" icon={Tag} active={activeTab} set={setActiveTab} />
            <TabBtn id="models" label="Modelos" description="Catálogo de hardware" icon={Layers} active={activeTab} set={setActiveTab} />
            
            <div className="px-4 py-2 mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sistema</div>
            <TabBtn id="audit" label="Auditoria" description="Logs de atividades" icon={FileText} active={activeTab} set={setActiveTab} />
            <TabBtn id="system" label="Backup & Dados" description="Manutenção do banco de dados" icon={HardDrive} active={activeTab} set={setActiveTab} />

            {isSuperAdmin && (
              <>
                <div className="px-4 py-2 mt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Administração</div>
                <TabBtn id="auto_backups" label="Backups Automáticos" description="Histórico de segurança" icon={Database} active={activeTab} set={setActiveTab} />
                <TabBtn id="danger" label="Zona de Perigo" description="Ações destrutivas" icon={AlertTriangle} active={activeTab} set={setActiveTab} danger />
              </>
            )}
          </nav>

          {/* Área de Conteúdo */}
          <main className="flex-1 w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm min-h-[600px] relative overflow-hidden">
             {/* Background decoration inside card */}
             <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                <SettingsIcon size={300} />
             </div>

             <div className="relative z-10">
                {activeTab === 'roles' && <RolesTab roles={roles} setRoles={setRoles} loadAll={loadAll} />}
                {activeTab === 'brands' && <BrandsTab brands={brands} setBrands={setBrands} loadAll={loadAll} />}
                {activeTab === 'models' && <ModelsTab brands={brands} models={models} setModels={setModels} loadAll={loadAll} />}
                {activeTab === 'audit' && <AuditTab auditLogs={auditLogs} />}
                {activeTab === 'system' && <SystemBackupTab dbStats={dbStats} roles={roles} loadAll={loadAll} />}
                {activeTab === 'auto_backups' && isSuperAdmin && <AutoBackupsTab autoBackups={autoBackups} loadAll={loadAll} />}
                {activeTab === 'danger' && isSuperAdmin && <DangerZoneTab loadAll={loadAll} />}
             </div>
          </main>
        </div>
      </div>
    </div>
  );
}
