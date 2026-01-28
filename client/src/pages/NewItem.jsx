import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Package, Server, Camera, Image as ImageIcon, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function NewItem() {
  const navigate = useNavigate();
  const { selectedCity } = useAuth();

  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  
  const [formData, setFormData] = useState({
    category: 'equipamento',
    type: 'onu',
    patrimony: '',
    serial: '',
    mac: '',
    brandId: '', 
    modelId: '', 
    status: 'disponivel',
    photo: '',
    value: '',
    observations: '',
    initialAmount: '',
    unit: 'metros'
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [b, m] = await Promise.all([api.get('/brands'), api.get('/models')]);
        setBrands(b.data);
        setModels(m.data);
      } catch (error) {
        console.error("Erro ao carregar marcas/modelos");
      }
    }
    loadData();
  }, []);

  // Limpa campos específicos quando a categoria ou tipo muda para evitar dados sujos
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      // Se mudou para material, limpa serial/patrimonio para o backend gerar (exceto se for cabo/drop que exige)
      serial: '',
      patrimony: '',
      initialAmount: '',
      unit: ['cabo', 'drop'].includes(prev.type) ? 'metros' : ''
    }));
  }, [formData.category, formData.type]);

  // Filtra modelos pelo tipo selecionado (ex: 'onu', 'router')
  // !m.type garante compatibilidade com modelos antigos sem tipo definido
  const filteredModels = models.filter(m => m.brandId == formData.brandId && (!m.type || m.type === formData.type));

  // Filtra marcas que possuem modelos do tipo selecionado
  const filteredBrands = brands.filter(b => 
    models.some(m => m.brandId === b.id && (!m.type || m.type === formData.type))
  );

  const handleMacChange = (e) => {
    // Remove caracteres não hexadecimais e força maiúsculas
    let v = e.target.value.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
    // Limita a 12 caracteres (sem contar os dois pontos)
    v = v.slice(0, 12);
    // Adiciona os dois pontos a cada 2 caracteres
    const formatted = v.match(/.{1,2}/g)?.join(":") || v;
    setFormData(prev => ({ ...prev, mac: formatted }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const brandName = brands.find(b => b.id == formData.brandId)?.name;
    const modelName = models.find(m => m.id == formData.modelId)?.name;
    
    if (!brandName || !modelName) {
      return toast.error("Erro: Marca ou Modelo inválidos. Recarregue a página.");
    }

    // Validação: Equipamentos e Cabos/Drops precisam de Patrimônio/Serial
    const requiresIdentity = formData.category === 'equipamento' || ['cabo', 'drop'].includes(formData.type);
    if(requiresIdentity && !formData.patrimony) {
      return toast.error("Patrimônio é obrigatório!");
    }

    // Validação de Duplicidade (Serial e Patrimônio)
    if (requiresIdentity) {
      try {
        const { data: allItems } = await api.get('/items');
        
        if (formData.serial) {
          const duplicateSerial = allItems.find(item => item.serial?.toLowerCase() === formData.serial.toLowerCase());
          if (duplicateSerial) return toast.error(`Serial já cadastrado! (Patrimônio: ${duplicateSerial.patrimony})`);
        }

        if (formData.patrimony) {
          const duplicatePatrimony = allItems.find(item => item.patrimony?.toLowerCase() === formData.patrimony.toLowerCase());
          if (duplicatePatrimony) return toast.error(`Patrimônio já cadastrado! (Serial: ${duplicatePatrimony.serial || 'N/A'})`);
        }
      } catch (error) {
        console.error("Erro ao validar duplicidade", error);
      }
    }

    const itemToSend = {
      ...formData,
      brand: brandName,
      serial: formData.serial?.trim().toUpperCase(), // Padronização
      patrimony: formData.patrimony?.trim().toUpperCase(), // Padronização
      model: modelName,
      name: `${brandName} ${modelName}`,
      city: (selectedCity === 'Todas' || !selectedCity) ? 'Nova Maringá' : selectedCity,
      location: 'Estoque',
      entryDate: new Date()
    };

    try {
      await api.post('/items', itemToSend);
      toast.success('Cadastrado com sucesso!');
      navigate('/');
    } catch (error) {
      // Exibe a mensagem específica do backend (ex: Serial duplicado)
      if (!error.handled) {
        toast.error(error.response?.data?.error || 'Erro ao salvar item.');
      }
    }
  };

  // Verifica se é um item que precisa de metragem (Bobinas)
  const isCableOrDrop = ['cabo', 'drop'].includes(formData.type);

  const world = formData.category === 'equipamento' ? 'equipamentos' : 'materiais';

  const setWorld = (mode) => {
    const isEquip = mode === 'equipamentos';
    setFormData(prev => ({
      ...prev,
      category: isEquip ? 'equipamento' : 'material',
      type: isEquip ? 'onu' : 'cabo'
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-200 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Novo Cadastro</h1>
            <p className="text-gray-500">Adicionando em: <strong className="text-blue-600">{selectedCity}</strong></p>
          </div>
        </div>

        <div className="bg-slate-100 p-1 rounded-lg flex w-fit">
          <button onClick={() => setWorld('equipamentos')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${world === 'equipamentos' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>
            <Server className="w-4 h-4"/> Equipamentos
          </button>
          <button onClick={() => setWorld('materiais')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${world === 'materiais' ? 'bg-white text-orange-600 shadow' : 'text-slate-500'}`}>
            <Package className="w-4 h-4"/> Materiais
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Item</label>
            <select 
              name="type" 
              value={formData.type} 
              onChange={e => setFormData({...formData, type: e.target.value})} 
              className="w-full p-3 border rounded-lg bg-blue-50/50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {world === 'equipamentos' ? (
                <>
                  <optgroup label="Fibra Óptica">
                    <option value="onu">ONU / ONT</option>
                    <option value="olt">OLT</option>
                  </optgroup>
                  <optgroup label="Rede / Rádio">
                    <option value="mikrotik">Mikrotik / RouterBoard</option>
                    <option value="router">Roteador Wi-Fi</option>
                    <option value="antena">Antena / Rádio</option>
                    <option value="switch">Switch</option>
                  </optgroup>
                </>
              ) : (
                <optgroup label="Materiais">
                  <option value="cabo">Cabo de Rede</option>
                  <option value="drop">Cabo Drop</option>
                  <option value="conector">Conector</option>
                  <option value="outros">Outros</option>
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
            <select required className="w-full p-2 border rounded" onChange={e => setFormData({...formData, brandId: e.target.value})}>
              <option value="">Selecione...</option>
              {filteredBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
            <select required className="w-full p-2 border rounded" disabled={!formData.brandId} onChange={e => setFormData({...formData, modelId: e.target.value})}>
              <option value="">Selecione...</option>
              {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* CAMPOS DE METRAGEM (Apenas para Cabos/Drop) */}
          {isCableOrDrop && (
            <>
              <div className="md:col-span-2 border-t pt-4 font-bold text-gray-400 text-xs uppercase">Controle de Metragem</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metragem Inicial</label>
                <input type="number" required className="w-full p-2 border rounded" placeholder="Ex: 1000" 
                  value={formData.initialAmount} onChange={e => setFormData({...formData, initialAmount: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                <input className="w-full p-2 border rounded" placeholder="metros" 
                  value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
              </div>
            </>
          )}

          {/* IDENTIFICAÇÃO (Equipamentos OU Cabos/Drops) */}
          {(formData.category === 'equipamento' || isCableOrDrop) && (
            <>
              <div className="md:col-span-2 border-t pt-4 font-bold text-gray-400 text-xs uppercase">Identificação Única</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patrimônio (Obrigatório)</label>
                <input required className="w-full p-2 border rounded" placeholder="Ex: NT001" 
                  onChange={e => setFormData({...formData, patrimony: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <input required className="w-full p-2 border rounded" placeholder="S/N" 
                  onChange={e => setFormData({...formData, serial: e.target.value.toUpperCase()})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MAC Address</label>
                <input 
                  className="w-full p-2 border rounded" 
                  placeholder="00:11:22:AA:BB:CC" 
                  value={formData.mac}
                  onChange={handleMacChange}
                  maxLength={17} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input type="number" step="0.01" className="w-full pl-9 p-2 border rounded" placeholder="0,00" 
                    value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
                </div>
              </div>
            </>
          )}
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea className="w-full p-2 border rounded" rows="2" placeholder="Detalhes adicionais..." 
              value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} />
          </div>

          <div className="md:col-span-2 border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto do Equipamento</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative">
                {formData.photo ? (
                  <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                <Camera className="w-4 h-4" /> Escolher Foto
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
              {formData.photo && <button type="button" onClick={() => setFormData({...formData, photo: ''})} className="text-red-500 text-sm hover:underline">Remover</button>}
            </div>
          </div>

        </div>
        <div className="mt-8 flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-bold flex gap-2 shadow-lg">
            <Save className="w-5 h-5" /> Salvar Item
          </button>
        </div>
      </form>
    </div>
  );
}