import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ModelsTab({ brands, models, setModels, loadAll }) {
  const [newModel, setNewModel] = useState({ brandId: '', name: '' });

  async function handleAddModel(e) {
    e.preventDefault();
    if (!newModel.brandId || !newModel.name.trim()) {
      toast.error("Selecione uma marca e digite o nome do modelo.");
      return;
    }
    try {
      await api.post('/models', newModel);
      toast.success("Modelo adicionado!");
      setNewModel({ ...newModel, name: '' });
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao adicionar modelo.");
    }
  }

  async function handleDeleteModel(id) {
    if (window.confirm("Tem certeza que deseja apagar este modelo?")) {
      try {
        await api.delete(`/models/${id}`);
        toast.success("Modelo apagado!");
        loadAll();
      } catch (error) {
        toast.error(error.response?.data?.error || "Erro ao apagar modelo.");
      }
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
      <form onSubmit={handleAddModel} className="space-y-2 p-4 bg-gray-50 rounded border h-min">
        <select
          className="w-full border p-2 rounded"
          onChange={e => setNewModel({ ...newModel, brandId: e.target.value })}
          value={newModel.brandId}
          required
        >
          <option value="">Marca...</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          value={newModel.name}
          onChange={e => setNewModel({ ...newModel, name: e.target.value })}
          className="w-full border p-2 rounded"
          placeholder="Nome do Modelo"
          required
        />
        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors">
          Adicionar Modelo
        </button>
      </form>
      <div className="max-h-64 overflow-auto border rounded-lg bg-white shadow-sm">
        {models.length === 0 ? (
          <div className="p-4 text-center text-gray-400">Nenhum modelo encontrado.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {models.map(m => (
              <div key={m.id} className="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors">
                <span className="text-gray-700">{m.name}</span>
                <button
                  onClick={() => handleDeleteModel(m.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  title="Apagar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
