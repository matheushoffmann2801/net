import React, { useState, useEffect } from 'react';
import { Tag, Layers, Shield, FileText, Download, HardDrive, AlertTriangle, Database } from 'lucide-react';
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
function TabBtn({ id, label, icon: Icon, active, set, danger }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => set(id)}
      className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-colors ${
        isActive
          ? danger
            ? 'border-red-600 text-red-600'
            : 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
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
    <div className="p-6 max-w-5xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configurações Gerais</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        <TabBtn id="roles" label="Cargos" icon={Shield} active={activeTab} set={setActiveTab} />
        <TabBtn id="brands" label="Marcas" icon={Tag} active={activeTab} set={setActiveTab} />
        <TabBtn id="models" label="Modelos" icon={Layers} active={activeTab} set={setActiveTab} />
        <TabBtn id="audit" label="Auditoria" icon={FileText} active={activeTab} set={setActiveTab} />
        <TabBtn id="system" label="Sistema & Backup" icon={HardDrive} active={activeTab} set={setActiveTab} />

        {/* Aba Secreta do Admin */}
        {isSuperAdmin && (
          <>
            <TabBtn id="auto_backups" label="Backups Auto" icon={Database} active={activeTab} set={setActiveTab} />
            <TabBtn id="danger" label="Zona de Perigo" icon={AlertTriangle} active={activeTab} set={setActiveTab} danger />
          </>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {activeTab === 'roles' && <RolesTab roles={roles} setRoles={setRoles} loadAll={loadAll} />}
        {activeTab === 'brands' && <BrandsTab brands={brands} setBrands={setBrands} loadAll={loadAll} />}
        {activeTab === 'models' && <ModelsTab brands={brands} models={models} setModels={setModels} loadAll={loadAll} />}
        {activeTab === 'audit' && <AuditTab auditLogs={auditLogs} />}
        {activeTab === 'system' && <SystemBackupTab dbStats={dbStats} roles={roles} loadAll={loadAll} />}
        {activeTab === 'auto_backups' && isSuperAdmin && <AutoBackupsTab autoBackups={autoBackups} loadAll={loadAll} />}
        {activeTab === 'danger' && isSuperAdmin && <DangerZoneTab loadAll={loadAll} />}
      </div>
    </div>
  );
}
