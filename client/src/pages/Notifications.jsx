import React, { useState, useEffect } from 'react';
import { Bell, Check, X, User, FileText, AlertTriangle, Inbox, RefreshCw, Eye, CheckCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// --- MODAL DE DETALHES (Reutilizado) ---
const RequestDetailsModal = ({ request, onClose }) => {
  if (!request) return null;
  let data = {};
  try {
    data = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
  } catch(e) {}
  
  const isInstall = request.action === 'SOLICITACAO_INSTALACAO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Detalhes da Solicitação #{request.id}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Status Banner */}
          <div className={`p-3 rounded-xl border flex items-start gap-3 ${
            request.status === 'REJECTED' ? 'bg-red-50 border-red-100 text-red-700' : 
            request.status === 'APPROVED' ? 'bg-green-50 border-green-100 text-green-700' : 
            'bg-yellow-50 border-yellow-100 text-yellow-700'
          }`}>
            {request.status === 'REJECTED' ? <AlertTriangle className="shrink-0 mt-0.5"/> : <CheckCircle className="shrink-0 mt-0.5"/>}
            <div>
              <p className="font-bold text-sm uppercase">{request.status === 'PENDING' ? 'Em Análise' : request.status === 'APPROVED' ? 'Aprovado' : 'Recusado'}</p>
              {request.status === 'REJECTED' && request.adminNotes && (
                <p className="text-sm mt-1"><strong>Motivo:</strong> {request.adminNotes}</p>
              )}
            </div>
          </div>

          {/* Installation Details */}
          {isInstall ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Cliente</h4>
                <p className="font-medium text-slate-800">{data.clientName}</p>
                <p className="text-sm text-slate-500">{data.address}</p>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Equipamentos ({data.items?.length})</h4>
                <div className="space-y-2">
                  {data.items?.map((item, i) => (
                    <div key={i} className="bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                      <p className="font-bold text-slate-700">{item.brand} {item.model}</p>
                      <div className="flex gap-2 text-xs text-slate-500">
                        <span>SN: {item.serial}</span>
                        {item.patrimony && <span>PAT: {item.patrimony}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data.photos?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Fotos</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {data.photos.map((photo, i) => (
                      <img key={i} src={photo} className="w-full h-20 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(photo, '_blank')} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Generic Details
            <div className="space-y-2">
               <h4 className="text-xs font-bold text-slate-400 uppercase">Dados da Solicitação</h4>
               <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-mono overflow-x-auto">
                 <pre>{JSON.stringify(data, null, 2)}</pre>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
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
      {selectedRequest && <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}

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
                  {notif.isPendingRequest && (
                    <button onClick={() => setSelectedRequest(notif)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium text-sm flex items-center justify-center gap-2 transition-colors" title="Ver Detalhes">
                      <Eye className="w-4 h-4"/>
                    </button>
                  )}
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
