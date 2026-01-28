import React, { useState, useEffect } from 'react';
import { Bell, Check, X, User, FileText, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      toast.error("Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(notif) {
    if (!window.confirm("Tem certeza que deseja APROVAR esta solicitação?")) return;
    
    const toastId = toast.loading("Processando...");
    try {
      if (notif.isPendingRequest) {
        await api.post(`/admin/requests/${notif.id}/approve`);
        toast.success("Solicitação aprovada!", { id: toastId });
      } else if (notif.action === 'SOLICITACAO_EXCLUSAO') {
        // Extrai ID do item da string de detalhes
        const match = notif.details.match(/ID: (\d+)/);
        if (match) {
           await api.delete(`/admin/items/${match[1]}`);
           toast.success("Exclusão aprovada!", { id: toastId });
        } else {
           toast.error("Não foi possível identificar o item.", { id: toastId });
           return;
        }
      }
      loadNotifications();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao processar.", { id: toastId });
    }
  }

  async function handleReject(notif) {
    const reason = prompt("Motivo da rejeição (Obrigatório):");
    if (!reason) return;

    const toastId = toast.loading("Rejeitando...");
    try {
      if (notif.isPendingRequest) {
        await api.post(`/admin/requests/${notif.id}/reject`, { adminNotes: reason });
      } else {
        await api.post(`/notifications/${notif.id}/deny`, { reason });
      }
      toast.success("Solicitação rejeitada.", { id: toastId });
      loadNotifications();
    } catch (error) {
      toast.error("Erro ao rejeitar.", { id: toastId });
    }
  }

  const getIcon = (action) => {
    if (action.includes('CADASTRO')) return <FileText className="w-5 h-5 text-blue-600"/>;
    if (action.includes('EXCLUSAO')) return <AlertTriangle className="w-5 h-5 text-red-600"/>;
    if (action.includes('INSTALACAO')) return <User className="w-5 h-5 text-green-600"/>;
    return <Bell className="w-5 h-5 text-gray-600"/>;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Inbox className="w-7 h-7 text-blue-600"/> Caixa de Entrada
          </h1>
          <p className="text-gray-500 text-sm">Gerencie solicitações pendentes da equipe</p>
        </div>
        <button onClick={loadNotifications} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Atualizar">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}/>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando solicitações...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500"/>
          </div>
          <h3 className="text-lg font-bold text-gray-800">Tudo limpo!</h3>
          <p className="text-gray-500">Não há solicitações pendentes no momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => (
            <div key={`${notif.isPendingRequest ? 'req' : 'log'}-${notif.id}`} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                <div className="p-3 bg-gray-50 rounded-lg h-fit">
                  {getIcon(notif.action)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800 text-sm uppercase tracking-wide">{notif.action.replace('SOLICITACAO_', '').replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">• {new Date(notif.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{notif.details}</p>
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                    <User className="w-3 h-3"/> {notif.user?.name || 'Usuário Desconhecido'}
                  </div>
                </div>
              </div>

              {user?.role === 'admin' && (
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <button onClick={() => handleReject(notif)} className="flex-1 md:flex-none px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                    <X className="w-4 h-4"/> Rejeitar
                  </button>
                  <button onClick={() => handleApprove(notif)} className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors">
                    <Check className="w-4 h-4"/> Aprovar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
