import React from 'react';
import { Download, Database } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AutoBackupsTab({ autoBackups, loadAll }) {
  const handleDownloadAutoBackup = async (filename) => {
    try {
      const token = localStorage.getItem('@NetControl:token');
      window.open(`${process.env.REACT_APP_API_URL}/admin/backups/auto/${filename}?token=${token}`, '_blank');
      toast.success("Download iniciado!");
    } catch (e) {
      toast.error("Erro ao baixar backup automático.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2 mb-2">
          <Database className="w-6 h-6" /> Backups Automáticos
        </h3>
        <p className="text-blue-700 mb-4 text-sm">
          O sistema gera automaticamente um backup antes de operações críticas (Reset Total ou Limpeza de Estoque). Os
          <strong>5 últimos arquivos</strong> são mantidos para economizar espaço.
        </p>

        <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
          {autoBackups.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Nenhum backup automático encontrado.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {autoBackups.map(file => (
                <div key={file.name} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-bold text-gray-700 text-sm">{file.name}</div>
                    <div className="text-xs text-gray-500 flex gap-2 mt-1">
                      <span>{new Date(file.date).toLocaleString()}</span>
                      <span>•</span>
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadAutoBackup(file.name)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Baixar"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
