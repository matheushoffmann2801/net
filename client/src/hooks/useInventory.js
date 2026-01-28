import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

// Hook de Leitura (Fetch)
export const useInventoryData = (city, type) => {
  return useQuery({
    queryKey: ['inventory', { city, type }],
    queryFn: async () => {
      const response = await api.get('/items', {
        params: {
          city,
          limit: 1000,
          type: type === 'materiais' ? 'consumiveis' : 'equipamentos'
        }
      });
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 Minutos de Cache (Dados considerados frescos)
    refetchOnWindowFocus: false, // Evita refetch ao trocar de aba
  });
};

// Hook de Edição com Optimistic Update
export const useUpdateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updatedItem) => api.put(`/items/${updatedItem.id}`, updatedItem),
    
    // Executado ANTES da requisição ir para o servidor
    onMutate: async (newItem) => {
      // 1. Cancela refetches em andamento para não sobrescrever nosso update otimista
      await queryClient.cancelQueries({ queryKey: ['inventory'] });

      // 2. Tira um "snapshot" do estado anterior
      const previousInventory = queryClient.getQueriesData({ queryKey: ['inventory'] });

      // 3. Atualiza o cache manualmente com o novo valor
      queryClient.setQueriesData({ queryKey: ['inventory'] }, (oldData) => {
        if (!oldData) return [];
        return oldData.map(item => item.id === newItem.id ? { ...item, ...newItem } : item);
      });

      // Retorna o contexto para caso de erro
      return { previousInventory };
    },

    // Se der erro, reverte para o snapshot
    onError: (err, newItem, context) => {
      context.previousInventory.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toast.error("Falha ao atualizar item. As alterações foram revertidas.");
    },

    // Sucesso ou Erro: Invalida para garantir consistência final
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },

    onSuccess: () => {
      toast.success("Item atualizado!");
    }
  });
};

// Hook de Movimentação (Apenas Invalidação)
export const useMoveItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.post(`/items/${id}/move`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success("Movimentação registrada!");
    }
  });
};

// Hook de Exclusão
export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.delete(`/items/${id}`, { data }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      if (res.data.type === 'requested') toast.success("Solicitação de exclusão enviada.");
      else toast.success("Item excluído.");
    }
  });
};