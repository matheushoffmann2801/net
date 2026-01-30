import React, { useState, useEffect } from 'react';
import { AlertOctagon, Search, Plus, Filter, CheckCircle, Clock, FileText, DollarSign, X, Save, User } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
    ACTIVE: "bg-red-100 text-red-700 border-red-200",
    NEGOTIATING: "bg-blue-100 text-blue-700 border-blue-200",
    CLEARED: "bg-green-100 text-green-700 border-green-200"
  };
  const labels = {
    PENDING: "Pré-Negativação",
    ACTIVE: "Negativado",
    NEGOTIATING: "Em Acordo",
    CLEARED: "Baixado / Pago"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.PENDING}`}>
      {labels[status] || status}
    </span>
  );
};

export default function CreditControl() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('ALL');
  
  // Form State
  const [formData, setFormData] = useState({
    clientName: '', clientCode: '', document: '', contractId: '', 
    amount: '', dueDate: '', platform: 'SERASA', notes: ''
  });

  useEffect(() => { loadRecords(); }, [filter]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/credit-records', { params: { status: filter } });
      setRecords(res.data);
    } catch (e) { toast.error("Erro ao carregar registros."); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/credit-records', formData);
      toast.success("Registro criado com sucesso!");
      setShowModal(false);
      setFormData({ clientName: '', clientCode: '', document: '', contractId: '', amount: '', dueDate: '', platform: 'SERASA', notes: '' });
      loadRecords();
    } catch (e) { toast.error("Erro ao salvar."); }
  };

  const handleStatusChange = async (id, newStatus) => {
    if(!window.confirm(`Alterar status para ${newStatus}?`)) return;
    try {
      await api.put(`/credit-records/${id}`, { status: newStatus });
      toast.success("Status atualizado!");
      loadRecords();
    } catch (e) { toast.error("Erro ao atualizar."); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <AlertOctagon className="text-red-600" size={32}/> Controle de Inadimplência
          </h1>
          <p className="text-slate-500 mt-1">Gestão de negativações e recuperação de crédito.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-200 flex items-center gap-2 transition-transform active:scale-95">
          <Plus size={20}/> Nova Inclusão
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['ALL', 'PENDING', 'ACTIVE', 'NEGOTIATING', 'CLEARED'].map(st => (
          <button key={st} onClick={() => setFilter(st)} 
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === st ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {st === 'ALL' ? 'Todos' : <StatusBadge status={st}/>}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="grid gap-4">
        {loading ? <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full mx-auto"/></div> : 
         records.length === 0 ? <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed">Nenhum registro encontrado.</div> :
         records.map(rec => (
          <div key={rec.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-bold text-slate-800 text-lg">{rec.clientName}</h3>
                <StatusBadge status={rec.status}/>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1"><FileText size={14}/> CPF/CNPJ: {rec.document}</span>
                <span className="flex items-center gap-1"><Clock size={14}/> Vencimento: {new Date(rec.dueDate).toLocaleDateString()}</span>
                <span className="flex items-center gap-1 font-medium text-slate-700"><DollarSign size={14}/> {new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(rec.amount)}</span>
              </div>
              {rec.notes && <p className="text-xs text-slate-400 mt-2 bg-slate-50 p-2 rounded border border-slate-100 inline-block">{rec.notes}</p>}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {rec.status === 'PENDING' && (
                <button onClick={() => handleStatusChange(rec.id, 'ACTIVE')} className="flex-1 px-4 py-2 bg-red-50 text-red-700 border border-red-100 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors">
                  NEGATIVAR
                </button>
              )}
              {rec.status === 'ACTIVE' && (
                <button onClick={() => handleStatusChange(rec.id, 'NEGOTIATING')} className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors">
                  ACORDO
                </button>
              )}
              {rec.status !== 'CLEARED' && (
                <button onClick={() => handleStatusChange(rec.id, 'CLEARED')} className="flex-1 px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg font-bold text-xs hover:bg-green-100 transition-colors">
                  BAIXAR (PAGO)
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Nova Inclusão de Dívida</h3>
              <button onClick={() => setShowModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                <input required className="w-full p-3 border rounded-xl" placeholder="Nome Completo" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF / CNPJ</label>
                  <input required className="w-full p-3 border rounded-xl" placeholder="Documento" value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                  <input required type="number" step="0.01" className="w-full p-3 border rounded-xl" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimento Original</label>
                  <input required type="date" className="w-full p-3 border rounded-xl" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plataforma</label>
                  <select className="w-full p-3 border rounded-xl bg-white" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}>
                    <option value="SERASA">Serasa</option>
                    <option value="SPC">SPC</option>
                    <option value="BOA_VISTA">Boa Vista</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                <textarea className="w-full p-3 border rounded-xl" rows="2" placeholder="Detalhes do contrato ou motivo..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                <Save size={18}/> Registrar Dívida
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}