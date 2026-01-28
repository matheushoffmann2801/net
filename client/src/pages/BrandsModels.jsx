import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Layers } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function BrandsModels() {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState({ brandId: '', name: '', type: 'onu' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [b, m] = await Promise.all([api.get('/brands'), api.get('/models')]);
    setBrands(b.data);
    setModels(m.data);
  }

  async function handleAddBrand(e) {
    e.preventDefault();
    if (!newBrand) return;
    await api.post('/brands', { name: newBrand });
    setNewBrand('');
    toast.success("Marca adicionada!");
    loadData();
  }

  async function handleDeleteBrand(id) {
    if(!window.confirm("Isso apagará também os modelos desta marca. Continuar?")) return;
    await api.delete(`/brands/${id}`);
    toast.success("Marca removida.");
    loadData();
  }

  async function handleAddModel(e) {
    e.preventDefault();
    if (!newModel.brandId || !newModel.name) return toast.error("Selecione a marca e digite o nome");
    await api.post('/models', newModel);
    setNewModel({ ...newModel, name: '' });
    toast.success("Modelo adicionado!");
    loadData();
  }

  async function handleDeleteModel(id) {
    if(!window.confirm("Apagar modelo?")) return;
    await api.delete(`/models/${id}`);
    loadData();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Layers className="w-6 h-6 text-blue-600" /> Cadastro de Equipamentos
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* COLUNA MARCAS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4"/> Marcas (Fabricantes)
          </h2>
          
          <form onSubmit={handleAddBrand} className="flex gap-2 mb-4">
            <input 
              placeholder="Ex: Huawei" 
              className="flex-1 border p-2 rounded"
              value={newBrand}
              onChange={e => setNewBrand(e.target.value)}
            />
            <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
              <Plus className="w-5 h-5"/>
            </button>
          </form>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {brands.map(brand => (
              <div key={brand.id} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                <span className="font-medium">{brand.name}</span>
                <button onClick={() => handleDeleteBrand(brand.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA MODELOS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4"/> Modelos
          </h2>

          <form onSubmit={handleAddModel} className="flex flex-col gap-2 mb-4">
            <select 
              className="border p-2 rounded bg-white"
              value={newModel.brandId}
              onChange={e => setNewModel({...newModel, brandId: e.target.value})}
            >
              <option value="">Selecione a Marca...</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            
            <select 
              className="border p-2 rounded bg-white"
              value={newModel.type}
              onChange={e => setNewModel({...newModel, type: e.target.value})}
            >
              <optgroup label="Fibra Óptica">
                <option value="onu">ONU / ONT</option>
                <option value="olt">OLT</option>
              </optgroup>
              <optgroup label="Rede / Rádio">
                <option value="mikrotik">Mikrotik / Rádio</option>
                <option value="router">Roteador Wi-Fi</option>
                <option value="antena">Antena</option>
                <option value="switch">Switch</option>
              </optgroup>
              <optgroup label="Materiais"><option value="cabo">Cabo</option><option value="drop">Drop</option><option value="conector">Conector</option><option value="outros">Outros</option></optgroup>
            </select>

            <div className="flex gap-2">
              <input 
                placeholder="Ex: HG8145V5" 
                className="flex-1 border p-2 rounded"
                value={newModel.name}
                onChange={e => setNewModel({...newModel, name: e.target.value})}
              />
              <button className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
                <Plus className="w-5 h-5"/>
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {models.map(model => {
              const brandName = brands.find(b => b.id == model.brandId)?.name || '?';
              return (
                <div key={model.id} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                  <div>
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({brandName})</span>
                    {model.type && <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded ml-2 uppercase border border-blue-100">{model.type}</span>}
                  </div>
                  <button onClick={() => handleDeleteModel(model.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}