import React from 'react';
import { Database, Download, Upload, HardDrive } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function SystemBackupTab({ dbStats, roles, loadAll }) {
  const { user } = useAuth();

  const handleDownloadBackup = async () => {
    const loadingToast = toast.loading("Gerando e baixando backup...");
    try {
      // Usa o axios configurado (api) para baixar como blob, permitindo tratar erros
      const response = await api.get('/admin/backup', { responseType: 'blob' });
      
      // Cria link temporário para download seguro
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-mtspeed-${Date.now()}.db`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Backup baixado com sucesso!", { id: loadingToast });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao baixar backup. Verifique permissões.", { id: loadingToast });
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validação de segurança
    if (!file.name.endsWith('.db')) {
      return toast.error("Arquivo inválido! Selecione um arquivo .db");
    }

    if (!window.confirm("⚠️ PERIGO: Restaurar um backup substituirá TODOS os dados atuais pelos do arquivo. Continuar?")) {
      e.target.value = ''; // Limpa o input para permitir selecionar o mesmo arquivo depois se quiser
      return;
    }

    const loadingToast = toast.loading("Enviando e restaurando...");
    try {
      await api.post('/admin/restore', file, { headers: { 'Content-Type': 'application/octet-stream' } });
      toast.success("Restaurado! Reiniciando...");
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao restaurar backup.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
        <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" /> Backup do Banco de Dados
        </h3>
        <p className="text-sm text-blue-600 mb-6">
          Faça o download de uma cópia completa do banco de dados (SQLite). Guarde este arquivo em local seguro.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadBackup}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            <Download className="w-5 h-5" /> Baixar Backup
          </button>
          <label className="bg-white text-blue-600 border border-blue-200 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 flex items-center gap-2 shadow-sm cursor-pointer transition-transform active:scale-95">
            <Upload className="w-5 h-5" /> Restaurar <input type="file" accept=".db" className="hidden" onChange={handleRestoreBackup} />
          </label>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5" /> Status do Sistema
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between border-b pb-2">
            <span>Tamanho do Banco:</span> <span className="font-mono font-bold">{(dbStats?.dbSize / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span>Total de Usuários:</span> <span className="font-mono font-bold">{roles.length} perfis ativos</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span>Versão do Sistema:</span> <span className="font-mono font-bold">v2.1 Pro</span>
          </div>
        </div>
      </div>
    </div>
  );
}
