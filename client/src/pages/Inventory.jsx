import React, { useRef } from 'react';
import { 
  Server, User, Box, Search, Plus, History, Printer,
  ArrowRightLeft, Edit, Trash2, MapPin, X, Package, Calendar, Loader2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import PermissionGate from '../components/PermissionGate';
import { useInventoryLogic } from '../hooks/useInventoryLogic';

const StatusBadge = ({ status }) => {
  const styles = {
    'disponivel': 'bg-blue-100 text-blue-700 border-blue-200', // Estoque
    'em_uso': 'bg-green-100 text-green-700 border-green-200', // Comodato
    'manutencao': 'bg-red-100 text-red-700 border-red-200', // Defeito
    'extraviado': 'bg-gray-800 text-white border-gray-600',
    'baixado': 'bg-gray-100 text-gray-700 border-gray-200',
  };
  const label = status ? status.replace('_', ' ').toUpperCase() : 'N/A';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
};

const TableSkeleton = () => (
  <>
    {[1, 2, 3, 4, 5].map((i) => (
      <tr key={i} className="animate-pulse border-b border-slate-100">
        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-32 mb-2"></div><div className="h-3 bg-slate-100 rounded w-20"></div></td>
        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
        <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
        <td className="p-4"><div className="h-6 bg-slate-200 rounded-full w-20"></div></td>
        <td className="p-4 text-right"><div className="h-8 bg-slate-200 rounded w-24 ml-auto"></div></td>
      </tr>
    ))}
  </>
);

export default function Inventory() {
  const navigate = useNavigate();
  const {
    filteredItems, loading, history, loadingHistory, currentHistory, totalHistoryPages, historyPage, indexOfFirstHistory, indexOfLastHistory,
    selectedCity, world, setWorld, searchTerm, setSearchTerm, filterStatus, setFilterStatus, setHistoryPage,
    showMoveModal, setShowMoveModal, showEditModal, setShowEditModal, showHistoryModal, setShowHistoryModal,
    selectedItem, setSelectedItem, moveData, setMoveData,
    handleViewHistory, handlePrintHistory, handleMoveItem, handleUpdateItem, handleDeleteItem
  } = useInventoryLogic();

  // --- VIRTUALIZAÇÃO ---
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Altura estimada da linha (px)
    overscan: 10, // Renderiza 10 itens extras fora da tela para scroll suave
  });


  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventário</h1>
          <p className="text-slate-500 text-sm">Gerenciando <strong className="text-blue-600">{world === 'equipamentos' ? 'Equipamentos' : 'Materiais'}</strong> em {selectedCity}</p>
        </div>

        <div className="bg-slate-100 p-1 rounded-lg flex">
          <button onClick={() => setWorld('equipamentos')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${world === 'equipamentos' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}><Server className="w-4 h-4"/> Equipamentos</button>
          <button onClick={() => setWorld('materiais')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${world === 'materiais' ? 'bg-white text-orange-600 shadow' : 'text-slate-500'}`}><Package className="w-4 h-4"/> Materiais</button>
        </div>
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar serial, mac, cliente..." 
                className="w-full pl-9 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="border border-slate-200 rounded-lg text-sm p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos Status</option>
              <option value="disponivel">Disponível</option>
              <option value="em_uso">Em Uso</option>
              <option value="manutencao">Manutenção</option>
            </select>
          </div>
          <button 
            onClick={() => navigate('/new-item')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Novo Item
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Container Scrollável para Virtualização */}
          <div 
            ref={parentRef} 
            className="overflow-auto h-[calc(100vh-240px)] w-full"
          >
            <table className="w-full text-left text-sm whitespace-nowrap relative">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 bg-slate-50">Item</th>
                  <th className="p-4 bg-slate-50">Local / Cliente</th>
                  <th className="p-4 bg-slate-50">{world === 'materiais' ? 'Quantidade' : 'Identificação'}</th>
                  <th className="p-4 bg-slate-50">Status</th>
                  <th className="p-4 text-right bg-slate-50">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <TableSkeleton /> : (
                <>
                {/* Spacer Topo (Simula altura dos itens acima) */}
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr style={{ height: `${rowVirtualizer.getVirtualItems()[0].start}px` }}>
                    <td colSpan={5} style={{ padding: 0, border: 0 }} />
                  </tr>
                )}

                {/* Itens Virtuais */}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = filteredItems[virtualRow.index];
                  return (
                  <tr 
                    key={item.id} 
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="p-4 cursor-pointer group" onClick={() => handleViewHistory(item)}>
                      <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate max-w-[200px]" title={item.name}>{item.name}</div>
                      <div className="text-xs text-slate-500">{item.brand}</div>
                      <div className="text-[10px] text-blue-500 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <History className="w-3 h-3"/> VER HISTÓRICO
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        {item.clientName ? <User className="w-3 h-3"/> : <MapPin className="w-3 h-3"/>}
                        <span className="truncate max-w-[150px]" title={item.clientName || item.location}>{item.clientName || item.location}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs">
                      {world === 'materiais' && item.currentAmount !== null ? (
                        <div className="text-slate-800 font-bold text-sm bg-slate-100 px-2 py-1 rounded w-fit">
                          {item.currentAmount} <span className="text-[10px] font-normal text-slate-500 uppercase">{item.unit || 'un'}</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-slate-700">SN: {item.serial}</div>
                          {item.patrimony && <div className="text-blue-600">PAT: {item.patrimony}</div>}
                        </>
                      )}
                    </td>
                    <td className="p-4"><StatusBadge status={item.status} /></td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setSelectedItem(item); setShowMoveModal(true); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Movimentar"><ArrowRightLeft className="w-4 h-4"/></button>
                        <button onClick={() => { setSelectedItem(item); setShowEditModal(true); }} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded" title="Editar"><Edit className="w-4 h-4"/></button>
                        <PermissionGate permissions={['admin']}>
                          <button onClick={() => { setSelectedItem(item); handleDeleteItem(); }} className="p-1.5 text-red-500 hover:bg-red-100 rounded" title="Excluir"><Trash2 className="w-4 h-4"/></button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                  );
                })}

                {/* Spacer Fundo (Simula altura dos itens abaixo) */}
                {rowVirtualizer.getVirtualItems().length > 0 && (
                  <tr style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1].end}px` }}>
                    <td colSpan={5} style={{ padding: 0, border: 0 }} />
                  </tr>
                )}

                {filteredItems.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-400">Nenhum item encontrado.</td></tr>
                )}
                </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showMoveModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-lg">Movimentar Item</h3>
                <p className="text-xs text-slate-500">{selectedItem.name} - {selectedItem.serial}</p>
              </div>
              <button onClick={() => setShowMoveModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <form onSubmit={handleMoveItem} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Ação</label>
                <select className="w-full border p-2 rounded" value={moveData.action} onChange={e => setMoveData({...moveData, action: e.target.value})}>
                  <option value="TROCA_CLIENTE">Instalar em Cliente</option>
                  <option value="DEVOLUCAO">Devolver ao Estoque</option>
                  <option value="DEFEITO">Reportar Defeito</option>
                  <option value="EXTRAVIO">Reportar Extravio</option>
                  <option value="BAIXA">Baixa (Venda/Lixo)</option>
                </select>
              </div>
              
              {moveData.action === 'TROCA_CLIENTE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Cliente</label>
                  <input required className="w-full border p-2 rounded" placeholder="Ex: João da Silva" value={moveData.clientName} onChange={e => setMoveData({...moveData, clientName: e.target.value})} />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Observações / Motivo</label>
                <textarea className="w-full border p-2 rounded" rows="3" value={moveData.reason} onChange={e => setMoveData({...moveData, reason: e.target.value})}></textarea>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Confirmar Movimentação</button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg">Editar Dados</h3>
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <form onSubmit={handleUpdateItem} className="p-6 space-y-4">
              <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
                Atenção: Use apenas para corrigir erros de cadastro. Para mudar de local, use "Movimentar".
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Serial</label>
                <input className="w-full border p-2 rounded font-mono" value={selectedItem.serial} onChange={e => setSelectedItem({...selectedItem, serial: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Patrimônio</label>
                <input className="w-full border p-2 rounded font-mono" value={selectedItem.patrimony} onChange={e => setSelectedItem({...selectedItem, patrimony: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && selectedItem && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop com Blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowHistoryModal(false)}></div>
          
          {/* Conteúdo do Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl z-10 w-full max-w-3xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            
            {/* Cabeçalho Fixo */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl shrink-0">
              <div>
                <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                  <History className="w-6 h-6 text-blue-600"/> Histórico do Item
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedItem.name} <span className="mx-2">•</span> <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold">{selectedItem.serial}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrintHistory} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Imprimir / PDF">
                  <Printer className="w-5 h-5"/>
                </button>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <X className="w-6 h-6"/>
                </button>
              </div>
            </div>

            {/* Corpo com Rolagem */}
            <div className="p-0 overflow-y-auto flex-1 bg-white">
              {loadingHistory ? (
                <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin mb-3 text-blue-500"/>
                  <p>Carregando histórico...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <History className="w-8 h-8 text-gray-300"/>
                  </div>
                  <p>Nenhum histórico encontrado para este item.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ação</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                  {currentHistory.map((h, i) => (
                    <tr key={i} className="even:bg-gray-50 hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                        <div className="font-medium">{new Date(h.date).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs text-gray-400">{new Date(h.date).toLocaleTimeString('pt-BR')}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {h.action}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-700 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                            {(h.user || 'S').charAt(0)}
                          </div>
                          {h.user || 'Sistema'}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs break-words leading-relaxed">
                        {h.details}
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Paginação */}
            {!loadingHistory && history.length > 0 && (
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-xl shrink-0">
                <span className="text-xs text-gray-500">
                  Mostrando {indexOfFirstHistory + 1} - {Math.min(indexOfLastHistory, history.length)} de {history.length}
                </span>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600"/>
                  </button>
                  <span className="text-xs font-bold text-gray-700">
                    {historyPage} / {totalHistoryPages}
                  </span>
                  <button 
                    onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                    disabled={historyPage === totalHistoryPages}
                    className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600"/>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}