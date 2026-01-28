import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function DangerZoneTab({ loadAll }) {
  const { user } = useAuth();
  const [resetPassword, setResetPassword] = useState('');

  // Lógica de Reset (Super Admin)
  async function handleSystemReset() {
    if (!resetPassword) {
      toast.error("Digite a senha para confirmar.");
      return;
    }
    if (!window.confirm("ATENÇÃO: ISSO APAGARÁ TUDO! TODOS OS EQUIPAMENTOS, HISTÓRICO E USUÁRIOS (Exceto Admin). TEM CERTEZA ABSOLUTA?")) {
      return;
    }

    try {
      const response = await api.post('/admin/reset', {
        username: user.username,
        password: resetPassword
      });
      toast.success(response.data.message);
      setResetPassword('');
      loadAll(); // Recarrega as listas vazias
      window.location.reload(); // Recarrega a página para limpar estados
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Erro ao resetar. Senha incorreta?");
    }
  }

  // Limpar Apenas Estoque
  async function handleClearInventory() {
    if (!resetPassword) {
      toast.error("Digite a senha para confirmar.");
      return;
    }
    if (!window.confirm("Isso apagará TODOS os equipamentos e histórico, mas manterá os usuários. Continuar?")) {
      return;
    }

    try {
      const response = await api.post('/admin/clear-inventory', { password: resetPassword });
      toast.success(response.data.message);
      setResetPassword('');
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao limpar estoque.");
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-xl font-bold text-red-700 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-6 h-6" /> Limpeza Total do Sistema
        </h3>
        <p className="text-red-600 mb-6">
          Esta ação é <strong>IRREVERSÍVEL</strong>. Ela apagará:
          <ul className="list-disc list-inside mt-2 ml-2 font-medium">
            <li>Todos os equipamentos do estoque</li>
            <li>Todo o histórico de movimentação</li>
            <li>Todos os usuários (exceto você)</li>
            <li>Marcas e modelos personalizados</li>
          </ul>
        </p>

        <div className="bg-white p-4 rounded border border-red-100 mb-6">
          <h4 className="font-bold text-red-800 mb-2">Opções de Limpeza:</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="text-sm text-gray-600 border-l-4 border-orange-400 pl-3">
              <strong>Limpar Estoque:</strong> Remove apenas equipamentos e histórico. Mantém usuários, marcas e modelos.
            </div>
            <div className="text-sm text-gray-600 border-l-4 border-red-600 pl-3">
              <strong>Reset Total:</strong> Apaga TUDO. O sistema volta ao estado inicial (apenas Admin).
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <label className="block text-sm font-bold text-gray-700 mb-1">Confirme sua senha de Admin:</label>
          <div className="flex gap-2">
            <input
              type="password"
              className="flex-1 border border-red-300 rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Sua senha..."
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              required
            />
            <button
              onClick={handleClearInventory}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded shadow whitespace-nowrap"
              title="Mantém usuários"
            >
              Limpar Estoque
            </button>
            <button
              onClick={handleSystemReset}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded shadow-lg flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" /> LIMPAR TUDO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
