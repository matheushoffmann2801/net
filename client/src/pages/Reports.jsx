import React, { useState, useEffect } from 'react';
import { FileText, Printer, History, DollarSign, Filter, Calendar, Search, Cable, BarChart3, PieChart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import logo from './logo.png';

const ReportCard = ({ title, description, icon: Icon, color, onClick, buttonText, stats, delay }) => (
  <div 
    className="relative overflow-hidden rounded-[2.5rem] p-8 bg-white border border-slate-100 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-500 group flex flex-col h-full animate-in fade-in slide-in-from-bottom-4"
    style={{ animationFillMode: 'both', animationDelay: `${delay}ms` }}
  >
    <div className={`w-14 h-14 rounded-2xl ${color.bg} ${color.text} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-sm`}>
      <Icon size={28} strokeWidth={2} />
    </div>
    
    <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">{title}</h3>
    <p className="text-slate-500 text-sm mb-8 flex-1 leading-relaxed font-medium">
      {description}
    </p>

    {stats && (
      <div className="mb-8 p-5 bg-slate-50/80 rounded-2xl border border-slate-100 backdrop-blur-sm">
        {stats}
      </div>
    )}

    <button 
      onClick={onClick}
      className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${color.btn} ${color.shadow} group-hover:shadow-xl`}
    >
      {buttonText === 'Ver Relatório' ? <FileText className="w-5 h-5" /> : <Printer className="w-5 h-5" />} {buttonText}
    </button>

    {/* Decorative Icon */}
    <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none rotate-12">
      <Icon size={200} />
    </div>
  </div>
);

export default function Reports() {
  const navigate = useNavigate();
  const { selectedCity } = useAuth();
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros Avançados
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // Busca com limite alto para trazer todo o estoque (paginação server-side)
        const params = { limit: 10000, city: selectedCity };
        
        const [equipRes, matRes, hRes] = await Promise.all([
          api.get('/items', { params: { ...params, type: 'equipamentos' } }),
          api.get('/items', { params: { ...params, type: 'materiais' } }),
          api.get('/history', { params: { limit: 1000 } }) // Solicita mais itens para o relatório
        ]);

        // Combina equipamentos e materiais e extrai dados da paginação
        const allItems = [...(equipRes.data.data || []), ...(matRes.data.data || [])];
        setItems(allItems);
        
        // Backend retorna array direto em /history, mas objeto {data:[]} em /items. Tratamento para ambos:
        setHistory(Array.isArray(hRes.data) ? hRes.data : (hRes.data.data || []));
      } catch (e) { 
        console.error(e);
        toast.error("Erro carregando dados para relatório"); 
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCity]);

  // Cálculos Financeiros (Baseados nos itens filtrados)
  const calculateTotals = (filteredItems) => {
    return {
      inUse: filteredItems.filter(i => i.status === 'em_uso').reduce((acc, cur) => acc + (Number(cur.value) || 0), 0),
      lost: filteredItems.filter(i => i.status === 'extraviado').reduce((acc, cur) => acc + (Number(cur.value) || 0), 0),
      maintenance: filteredItems.filter(i => i.status === 'manutencao').reduce((acc, cur) => acc + (Number(cur.value) || 0), 0),
      total: filteredItems.reduce((acc, cur) => acc + (Number(cur.value) || 0), 0)
    };
  };

  // Lógica de Filtragem
  const getFilteredItems = () => {
    return items.filter(item => {
      // Filtro de Data (Data de Criação)
      if (dateRange.start && new Date(item.createdAt) < new Date(dateRange.start)) return false;
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59);
        if (new Date(item.createdAt) > end) return false;
      }
      // Filtro de Status
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      // Filtro de Tipo
      if (filterType === 'equipamento' && item.isConsumable) return false;
      if (filterType === 'material' && !item.isConsumable) return false;
      
      // Busca Textual
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.name?.toLowerCase().includes(term) ||
          item.serial?.toLowerCase().includes(term) ||
          item.patrimony?.toLowerCase().includes(term) ||
          item.client?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  };

  const getFilteredHistory = () => {
    return history.filter(h => {
      // Filtro de Data (Data do Evento)
      if (dateRange.start && new Date(h.date) < new Date(dateRange.start)) return false;
      if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59);
        if (new Date(h.date) > end) return false;
      }
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          h.itemSerial?.toLowerCase().includes(term) ||
          h.user?.toLowerCase().includes(term) ||
          h.details?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  };

  const handlePrint = (title, columns, data, summaryText = '') => {
    if (!data || !data.length) return toast.error("Sem dados para o relatório.");

    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Pop-up bloqueado. Permita pop-ups para imprimir.");

    // Garante que o caminho da imagem seja absoluto para funcionar na nova janela
    const logoSrc = logo.startsWith('data:') || logo.startsWith('http') ? logo : `${window.location.origin}${logo.startsWith('/') ? '' : '/'}${logo}`;
    
    // Resumo dos filtros para o cabeçalho
    let filterInfo = `Período: ${dateRange.start ? new Date(dateRange.start).toLocaleDateString() : 'Início'} até ${dateRange.end ? new Date(dateRange.end).toLocaleDateString() : 'Hoje'}`;
    if (filterStatus !== 'all') filterInfo += ` • Status: ${filterStatus.toUpperCase().replace('_', ' ')}`;
    if (filterType !== 'all') filterInfo += ` • Tipo: ${filterType.toUpperCase()}`;
    if (searchTerm) filterInfo += ` • Busca: "${searchTerm}"`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
          .logo-section { display: flex; align-items: center; gap: 15px; }
          .logo { height: 60px; width: auto; }
          .company-name { font-size: 24px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
          .report-title { font-size: 18px; color: #2563eb; font-weight: 600; margin-top: 5px; }
          .meta-info { text-align: right; font-size: 12px; color: #64748b; }
          
          .summary-box { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 13px; }
          .summary-item { display: flex; flex-direction: column; }
          .summary-label { font-weight: bold; color: #64748b; font-size: 11px; text-transform: uppercase; }
          .summary-value { font-weight: 600; color: #334155; font-size: 14px; }

          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background-color: #f8fafc; color: #475569; text-align: left; padding: 10px 8px; border-bottom: 2px solid #e2e8f0; font-weight: 700; text-transform: uppercase; }
          td { border-bottom: 1px solid #e2e8f0; padding: 8px; color: #334155; }
          tr:nth-child(even) { background-color: #f9fafb; }
          tr:hover { background-color: #f1f5f9; }
          
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
          
          @media print {
            @page { margin: 1cm; size: A4; }
            body { padding: 0; -webkit-print-color-adjust: exact; }
            button { display: none; }
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="${logoSrc}" class="logo" alt="Logo" onerror="this.style.display='none'"/>
            <div>
              <div class="company-name">MTSpeed Tecnologia</div>
              <div class="report-title">${title.replace(/_/g, ' ')}</div>
            </div>
          </div>
          <div class="meta-info">
            <div>Base Operacional: <strong>${selectedCity}</strong></div>
            <div>Gerado em: ${new Date().toLocaleString()}</div>
            <div>Usuário: Sistema</div>
          </div>
        </div>

        <div class="summary-box">
           <div class="summary-item">
             <span class="summary-label">Filtros Aplicados</span>
             <span class="summary-value">${filterInfo}</span>
           </div>
           ${summaryText ? `<div class="summary-item"><span class="summary-label">Resumo Financeiro</span><span class="summary-value">${summaryText}</span></div>` : ''}
           <div class="summary-item">
             <span class="summary-label">Total de Registros</span>
             <span class="summary-value">${data.length}</span>
           </div>
        </div>

        <table>
          <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${data.map(row => `<tr>${row.map(cell => `<td>${cell || '-'}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>

        <div class="footer">
          <span>MTSpeed Control System v2.1</span>
          <span>Relatório Oficial</span>
        </div>

        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredItems = getFilteredItems();
  const filteredHistory = getFilteredHistory();
  const totals = calculateTotals(filteredItems);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 animate-in fade-in duration-700 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-100/40 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-[1800px] mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight flex items-center gap-3">Relatórios <span className="text-sm font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 align-middle">Gerenciais</span></h1>
                <p className="text-slate-500 font-medium mt-1">Exportação de dados e análises financeiras.</p>
            </div>
        </div>
      
      {/* BARRA DE FILTROS */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-slate-200/60 flex flex-col lg:flex-row gap-6 items-end">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="w-3 h-3"/> Início</label>
            <input type="date" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar className="w-3 h-3"/> Fim</label>
            <input type="date" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Filter className="w-3 h-3"/> Tipo</label>
            <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">Todos</option>
              <option value="equipamento">Equipamentos</option>
              <option value="material">Materiais</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Filter className="w-3 h-3"/> Status</label>
            <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Todos</option>
              <option value="disponivel">Disponível</option>
              <option value="em_uso">Em Uso</option>
              <option value="manutencao">Manutenção</option>
              <option value="extraviado">Extraviado</option>
            </select>
          </div>
        </div>
        
        <div className="w-full lg:w-auto flex flex-col gap-2 min-w-[300px]">
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Search className="w-3 h-3"/> Busca Rápida</label>
           <div className="relative">
             <input 
               type="text" 
               className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
               placeholder="Serial, Nome, Cliente..." 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
             />
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
           </div>
        </div>
        
        <div className="pb-1">
            <button onClick={() => { setDateRange({start:'', end:''}); setFilterType('all'); setFilterStatus('all'); setSearchTerm(''); }} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Limpar Filtros">
              <Filter className="w-5 h-5"/>
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* CARD 1: ESTOQUE */}
          <ReportCard 
            title="Estoque Atual"
            description="Gera uma lista detalhada dos itens atualmente no sistema, respeitando os filtros aplicados."
            icon={BarChart3}
            color={{ bg: 'bg-blue-50', text: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700', shadow: 'shadow-blue-600/20' }}
            buttonText="Imprimir Relatório"
            delay={100}
            stats={
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Itens Listados</span>
                <span className="text-2xl font-bold text-blue-600">{filteredItems.length}</span>
              </div>
            }
            onClick={() => {
              handlePrint('Relatorio_Estoque', ['Nome','Patrimonio','Serial','Status','Cód. Cliente', 'Entrada'], filteredItems.map(i=>[i.name, i.patrimony, i.serial, i.status.toUpperCase().replace('_',' '), i.client || '-', new Date(i.createdAt).toLocaleDateString()]))
            }}
          />

          {/* CARD 2: HISTÓRICO */}
          <ReportCard 
            title="Histórico Geral"
            description="Relatório de movimentações e auditoria. Útil para rastrear alterações e eventos."
            icon={History}
            color={{ bg: 'bg-purple-50', text: 'text-purple-600', btn: 'bg-purple-600 hover:bg-purple-700', shadow: 'shadow-purple-600/20' }}
            buttonText="Imprimir Histórico"
            delay={200}
            stats={
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500">Eventos</span>
                <span className="text-2xl font-bold text-purple-600">{filteredHistory.length}</span>
              </div>
            }
            onClick={() => {
              handlePrint('Relatorio_Historico', ['Data','Usuario','Acao','Serial','Detalhes'], filteredHistory.slice().reverse().slice(0,500).map(h=>[new Date(h.date).toLocaleDateString() + ' ' + new Date(h.date).toLocaleTimeString(), h.user, h.action, h.itemSerial, h.details]))
            }}
          />

          {/* CARD 3: FINANCEIRO */}
          <ReportCard 
            title="Financeiro"
            description="Análise de valor do inventário, incluindo ativos em uso, manutenção e perdas."
            icon={DollarSign}
            color={{ bg: 'bg-emerald-50', text: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700', shadow: 'shadow-emerald-600/20' }}
            buttonText="Imprimir Financeiro"
            delay={300}
            stats={
              <div className="space-y-2">
                 <div className="flex justify-between text-xs"><span className="text-slate-500">Em Uso</span> <span className="font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.inUse)}</span></div>
                 <div className="flex justify-between text-xs"><span className="text-slate-500">Perdas</span> <span className="font-bold text-red-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.lost)}</span></div>
                 <div className="flex justify-between border-t border-slate-200 pt-2 mt-1"><span className="font-bold text-slate-700">Total</span> <span className="font-bold text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}</span></div>
              </div>
            }
            onClick={() => {
              const summary = `Total Geral (Risco/Ativo): ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}`;
              
              handlePrint('Relatorio_Financeiro', 
                ['Nome', 'Patrimonio', 'Status', 'Valor (R$)', 'Cód. Cliente'], 
                filteredItems.map(i => [
                  i.name, 
                  i.patrimony, 
                  i.status.toUpperCase(), 
                  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(i.value || 0),
                  i.client || '-'
                ]),
                summary
              );
            }}
          />

          {/* CARD 4: CONSUMO */}
          <ReportCard 
            title="Consumo"
            description="Relatório detalhado de consumo de cabos e materiais por técnico."
            icon={Cable}
            color={{ bg: 'bg-orange-50', text: 'text-orange-600', btn: 'bg-orange-600 hover:bg-orange-700', shadow: 'shadow-orange-600/20' }}
            buttonText="Ver Relatório"
            delay={400}
            stats={
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                Acompanhamento em tempo real
              </div>
            }
            onClick={() => navigate('/reports/consumption')}
          />
        </div>
      )}
      </div>
    </div>
  );
}