import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function BrandsTab({ brands, setBrands, loadAll }) {
  const [newBrand, setNewBrand] = useState('');

  async function handleAddBrand(e) {
    e.preventDefault();
    if (!newBrand.trim()) {
      toast.error("O nome da marca não pode ser vazio.");
      return;
    }
    try {
      await api.post('/brands', { name: newBrand });
      toast.success("Marca adicionada!");
      setNewBrand('');
      loadAll();
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao adicionar marca.");
    }
  }

  async function handleDeleteBrand(id) {
    if (window.confirm("Tem certeza que deseja apagar esta marca?")) {
      try {
        await api.delete(`/brands/${id}`);
        toast.success("Marca apagada!");
        loadAll();
      } catch (error) {
        toast.error(error.response?.data?.error || "Erro ao apagar marca.");
      }
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
      <form onSubmit={handleAddBrand} className="flex gap-2 h-min">
        <input
          value={newBrand}
          onChange={e => setNewBrand(e.target.value)}
          className="border p-2 rounded flex-1"
          placeholder="Nova Marca"
          required
        />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </form>
      <div className="max-h-64 overflow-auto border rounded-lg bg-white shadow-sm">
        {brands.length === 0 ? (
          <div className="p-4 text-center text-gray-400">Nenhuma marca encontrada.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {brands.map(b => (
              <div key={b.id} className="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors">
                <span className="text-gray-700">{b.name}</span>
                <button
                  onClick={() => handleDeleteBrand(b.id)}
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
