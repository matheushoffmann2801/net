import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function RolesTab({ roles, setRoles, loadAll }) {
  const [newRole, setNewRole] = useState({ name: '', color: 'blue' });
  const [editingRole, setEditingRole] = useState(null);

  const colors = [
    { v: 'blue', bg: 'bg-blue-100 text-blue-800' },
    { v: 'purple', bg: 'bg-purple-100 text-purple-800' },
    { v: 'green', bg: 'bg-green-100 text-green-800' },
    { v: 'orange', bg: 'bg-orange-100 text-orange-800' },
    { v: 'red', bg: 'bg-red-100 text-red-800' }
  ];

  async function handleSaveRole(e) {
    e.preventDefault();
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, newRole);
        toast.success("Cargo atualizado!");
      } else {
        await api.post('/roles', newRole);
        toast.success("Cargo adicionado!");
      }
      loadAll();
      setNewRole({ name: '', color: 'blue' });
      setEditingRole(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao salvar cargo.");
    }
  }

  async function handleDeleteRole(id) {
    if (window.confirm("Tem certeza que deseja apagar este cargo?")) {
      try {
        await api.delete(`/roles/${id}`);
        toast.success("Cargo apagado!");
        loadAll();
      } catch (error) {
        toast.error(error.response?.data?.error || "Erro ao apagar cargo.");
      }
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-fade-in">
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 h-fit">
        <h3 className="font-bold mb-4 text-gray-700 flex items-center gap-2">
          {editingRole ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {editingRole ? 'Editar Cargo' : 'Novo Cargo'}
        </h3>
        <form onSubmit={handleSaveRole} className="space-y-4">
          <input
            value={newRole.name}
            onChange={e => setNewRole({ ...newRole, name: e.target.value })}
            className="w-full border p-2 rounded"
            placeholder="Nome"
            required
          />
          <div>
            <label className="text-xs font-bold text-gray-500 mb-2 block">Cor do Badge</label>
            <div className="flex gap-2">
              {colors.map(c => (
                <button
                  type="button"
                  key={c.v}
                  onClick={() => setNewRole({ ...newRole, color: c.v })}
                  className={`w-8 h-8 rounded-full ${c.bg.split(' ')[0]} border-2 transition-all ${
                    newRole.color === c.v ? 'border-gray-600 scale-110' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {editingRole && (
              <button
                type="button"
                onClick={() => {
                  setEditingRole(null);
                  setNewRole({ name: '', color: 'blue' });
                }}
                className="px-4 py-2 border rounded text-gray-600"
              >
                Cancelar
              </button>
            )}
            <button className="flex-1 bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700 transition-colors">
              Salvar Cargo
            </button>
          </div>
        </form>
      </div>
      <div className="space-y-2">
        {roles.length === 0 ? (
          <div className="p-4 text-center text-gray-400 bg-white rounded-lg shadow-sm">Nenhum cargo encontrado.</div>
        ) : (
          roles.map(r => (
            <div
              key={r.id}
              className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    colors.find(c => c.v === r.color)?.bg || 'bg-gray-100'
                  }`}
                >
                  {r.name}
                </span>
                <span className="text-xs text-gray-400 font-mono">ID: {r.value}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingRole(r);
                    setNewRole({ name: r.name, color: r.color });
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {r.value !== 'admin' && (
                  <button
                    onClick={() => handleDeleteRole(r.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                    title="Apagar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
