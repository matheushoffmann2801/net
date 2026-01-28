import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useInventoryData, useUpdateItem, useMoveItem, useDeleteItem } from './useInventory';
import { usePermission } from './usePermission';

export function useInventoryLogic() {
  const { selectedCity, user } = useAuth();
  const [world, setWorld] = useState('equipamentos');

  // React Query Hooks
  const { data: items = [], isLoading: loading } = useInventoryData(selectedCity, world);
  const updateItemMutation = useUpdateItem();
  const moveItemMutation = useMoveItem();
  const deleteItemMutation = useDeleteItem();
  const canDelete = usePermission(['admin']);

  // Local State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modais
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Formulários
  const [moveData, setMoveData] = useState({ action: 'TROCA_CLIENTE', clientName: '', reason: '' });

  // Derived State (History Pagination)
  const indexOfLastHistory = historyPage * ITEMS_PER_PAGE;
  const indexOfFirstHistory = indexOfLastHistory - ITEMS_PER_PAGE;
  const currentHistory = history.slice(indexOfFirstHistory, indexOfLastHistory);
  const totalHistoryPages = Math.ceil(history.length / ITEMS_PER_PAGE);

  // Handlers
  const handleViewHistory = async (item) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setHistory([]);
    setHistoryPage(1);
    try {
      const res = await api.get(`/items/${item.id}/history`);
      setHistory(res.data);
    } catch (error) {
      toast.error("Erro ao buscar histórico.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePrintHistory = () => {
    if (!selectedItem) return toast.error("Erro: Nenhum item selecionado.");
    if (!history || history.length === 0) return toast.error("Aviso: Este item não possui histórico para exportar.");

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return toast.error("Erro: Pop-up bloqueado. Permita pop-ups para imprimir.");

      const title = `Histórico - ${selectedItem.name}`;
      const date = new Date().toLocaleString();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 24px; font-weight: 800; color: #1e293b; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 5px; }
            .card { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
            .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .card-label { font-weight: bold; color: #64748b; font-size: 11px; text-transform: uppercase; }
            .card-value { font-weight: 600; color: #334155; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f1f5f9; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-weight: 700; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 10px; color: #334155; vertical-align: top; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><div class="title">Relatório de Histórico</div><div class="subtitle">MTSpeed Tecnologia</div></div>
            <div class="subtitle" style="text-align: right">Gerado em: ${date}<br/>Por: ${user?.name || 'Sistema'}</div>
          </div>
          <div class="card">
            <div class="card-row">
              <div><div class="card-label">Item</div><div class="card-value">${selectedItem.name}</div></div>
              <div><div class="card-label">Marca</div><div class="card-value">${selectedItem.brand || '-'}</div></div>
            </div>
            <div class="card-row">
              <div><div class="card-label">Serial</div><div class="card-value">${selectedItem.serial || 'N/A'}</div></div>
              <div><div class="card-label">Patrimônio</div><div class="card-value">${selectedItem.patrimony || 'N/A'}</div></div>
            </div>
          </div>
          <table>
            <thead><tr><th>Data</th><th>Ação</th><th>Responsável</th><th>Detalhes</th></tr></thead>
            <tbody>
              ${history.map(h => `
                <tr>
                  <td>${new Date(h.date).toLocaleString()}</td>
                  <td><strong>${h.action}</strong></td>
                  <td>${h.user || 'Sistema'}</td>
                  <td>${h.details || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Documento gerado automaticamente pelo sistema NetControl.</div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (error) {
      console.error(error);
      toast.error("Erro crítico ao gerar PDF.");
    }
  };

  const handleMoveItem = (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    moveItemMutation.mutate(
      { id: selectedItem.id, data: moveData },
      { onSuccess: () => setShowMoveModal(false) }
    );
  };

  const handleUpdateItem = (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    updateItemMutation.mutate(selectedItem, {
      onSuccess: () => setShowEditModal(false)
    });
  };

  const handleDeleteItem = () => {
    if (!canDelete) return toast.error("Apenas administradores podem excluir itens.");
    if (!selectedItem) return;
    if (!window.confirm(`Excluir ${selectedItem.name}?`)) return;
    
    const reason = prompt("Motivo da exclusão:");
    if (!reason) return;

    const password = prompt("Confirme sua senha:");
    deleteItemMutation.mutate(
      { id: selectedItem.id, data: { password, reason } },
      { onSuccess: () => setSelectedItem(null) }
    );
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.patrimony?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, filterStatus]);

  return {
    // Data
    items,
    filteredItems,
    loading,
    history,
    loadingHistory,
    currentHistory,
    totalHistoryPages,
    historyPage,
    indexOfFirstHistory,
    indexOfLastHistory,
    selectedCity,
    canDelete,
    
    // State
    world, setWorld,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    setHistoryPage,
    
    // Modals
    showMoveModal, setShowMoveModal,
    showEditModal, setShowEditModal,
    showHistoryModal, setShowHistoryModal,
    selectedItem, setSelectedItem,
    
    // Forms
    moveData, setMoveData,
    
    // Actions
    handleViewHistory,
    handlePrintHistory,
    handleMoveItem,
    handleUpdateItem,
    handleDeleteItem
  };
}
