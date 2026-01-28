import React, { useState, useEffect } from 'react';
import { FileText, Printer, History, DollarSign, Filter, Calendar, Search, Cable } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import logo from './logo.png';

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
          item.clientName?.toLowerCase().includes(term)
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
    <div className="p-6 max-w-6xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Relatórios</h1>
      
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Início</label>
          <input type="date" className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Fim</label>
          <input type="date" className="border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Filter className="w-3 h-3"/> Tipo</label>
          <select className="border p-2 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">Todos</option>
            <option value="equipamento">Equipamentos</option>
            <option value="material">Materiais</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Filter className="w-3 h-3"/> Status</label>
          <select className="border p-2 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Todos</option>
            <option value="disponivel">Disponível</option>
            <option value="em_uso">Em Uso</option>
            <option value="manutencao">Manutenção</option>
            <option value="extraviado">Extraviado</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
           <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Search className="w-3 h-3"/> Busca Rápida</label>
           <input 
             type="text" 
             className="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500" 
             placeholder="Serial, Nome, Cliente..." 
             value={searchTerm} 
             onChange={e => setSearchTerm(e.target.value)} 
           />
        </div>
        <div className="w-full md:w-auto text-right pb-1">
            <button onClick={() => { setDateRange({start:'', end:''}); setFilterType('all'); setFilterStatus('all'); setSearchTerm(''); }} className="text-xs font-bold text-blue-600 hover:underline">Limpar Filtros</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando dados...</div>
      ) : (
        <div className="grid md:grid-cols-4 gap-6">
          {/* CARD 1: ESTOQUE */}
          <div className="bg-white p-6 rounded-xl shadow border transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col">
            <h3 className="font-bold flex gap-2 mb-4 text-blue-700"><Printer/> Estoque Atual</h3>
            <p className="text-sm text-gray-500 mb-4 flex-1">
              Gera uma lista detalhada dos itens atualmente no sistema, respeitando os filtros acima.
              <br/><br/>
              <strong>{filteredItems.length}</strong> itens encontrados.
            </p>
            <button onClick={() => {
                handlePrint('Relatorio_Estoque', ['Nome','Patrimonio','Serial','Status','Cliente', 'Entrada'], filteredItems.map(i=>[i.name, i.patrimony, i.serial, i.status.toUpperCase().replace('_',' '), i.clientName || '-', new Date(i.createdAt).toLocaleDateString()]))
              }} 
              className="w-full bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4"/> Imprimir Relatório
            </button>
          </div>

          {/* CARD 2: HISTÓRICO */}
          <div className="bg-white p-6 rounded-xl shadow border transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col">
            <h3 className="font-bold flex gap-2 mb-4 text-purple-700"><History/> Histórico Geral</h3>
            <p className="text-sm text-gray-500 mb-4 flex-1">
              Relatório de movimentações e auditoria. Útil para rastrear alterações.
              <br/><br/>
              <strong>{filteredHistory.length}</strong> eventos encontrados.
            </p>
            <button onClick={() => {
                handlePrint('Relatorio_Historico', ['Data','Usuario','Acao','Serial','Detalhes'], filteredHistory.slice().reverse().slice(0,500).map(h=>[new Date(h.date).toLocaleDateString() + ' ' + new Date(h.date).toLocaleTimeString(), h.user, h.action, h.itemSerial, h.details]))
              }} 
              className="w-full bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4"/> Imprimir Histórico
            </button>
          </div>

          {/* CARD 3: FINANCEIRO */}
          <div className="bg-white p-6 rounded-xl shadow border transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col">
            <h3 className="font-bold flex gap-2 mb-4 text-red-700"><DollarSign/> Financeiro & Perdas</h3>
            <div className="space-y-2 mb-4 text-sm flex-1">
               <div className="flex justify-between"><span>Em Uso:</span> <span className="font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.inUse)}</span></div>
               <div className="flex justify-between"><span>Manutenção:</span> <span className="font-bold text-orange-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.maintenance)}</span></div>
               <div className="flex justify-between"><span>Extraviados:</span> <span className="font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.lost)}</span></div>
               <div className="flex justify-between border-t pt-2 mt-2"><span>Total Filtrado:</span> <span className="font-bold text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}</span></div>
            </div>
            <button onClick={() => {
              const summary = `Total Geral (Risco/Ativo): ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}`;
              
              handlePrint('Relatorio_Financeiro', 
                ['Nome', 'Patrimonio', 'Status', 'Valor (R$)', 'Cliente'], 
                filteredItems.map(i => [
                  i.name, 
                  i.patrimony, 
                  i.status.toUpperCase(), 
                  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(i.value || 0),
                  i.clientName || '-'
                ]),
                summary
              );
            }} 
              className="w-full bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4"/> Imprimir Financeiro
            </button>
          </div>

          {/* CARD 4: CONSUMO */}
          <div className="bg-white p-6 rounded-xl shadow border transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col">
            <h3 className="font-bold flex gap-2 mb-4 text-orange-700"><Cable/> Consumo</h3>
            <p className="text-sm text-gray-500 mb-4 flex-1">
              Relatório detalhado de consumo de cabos e materiais por técnico.
            </p>
            <button onClick={() => navigate('/reports/consumption')} 
              className="w-full bg-orange-600 text-white px-4 py-2 rounded font-bold hover:bg-orange-700 flex items-center justify-center gap-2">
              <FileText className="w-4 h-4"/> Ver Relatório
            </button>
          </div>
        </div>
      )}
    </div>
  );
}