import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Package, Server, Camera, Image as ImageIcon, DollarSign, Hash, Tag, Cpu, Ruler, FileText, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import onuDefault from './onufiber.png';

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

  const displayPhoto = formData.photo || (formData.type === 'onu' ? onuDefault : null);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 font-sans text-slate-600">
      <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Novo Item</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Adicionando ao estoque de <strong className="text-blue-600">{selectedCity}</strong></p>
          </div>
        </div>

        <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-sm flex w-fit">
          <button onClick={() => setWorld('equipamentos')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${world === 'equipamentos' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <Server className="w-4 h-4"/> Equipamentos
          </button>
          <button onClick={() => setWorld('materiais')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${world === 'materiais' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <Package className="w-4 h-4"/> Materiais
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Tag className="w-5 h-5"/></div>
              <h2 className="text-xl font-bold text-slate-800">Informações Básicas</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Item</label>
                <div className="relative">
                   <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none"/>
                   <select 
                    name="type" 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})} 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 appearance-none cursor-pointer"
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
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Marca</label>
                <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 cursor-pointer" onChange={e => setFormData({...formData, brandId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {filteredBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modelo</label>
                <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" disabled={!formData.brandId} onChange={e => setFormData({...formData, modelId: e.target.value})}>
                  <option value="">Selecione...</option>
                  {filteredModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Identification Section */}
          {(formData.category === 'equipamento' || isCableOrDrop) && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Hash className="w-5 h-5"/></div>
                <h2 className="text-xl font-bold text-slate-800">Identificação & Valores</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Patrimônio <span className="text-red-500">*</span></label>
                  <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-mono uppercase font-medium" placeholder="Ex: NT001" 
                    onChange={e => setFormData({...formData, patrimony: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Serial Number</label>
                  <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-mono uppercase font-medium" placeholder="S/N" 
                    onChange={e => setFormData({...formData, serial: e.target.value.toUpperCase()})} />
                </div>
                
                {/* MAC Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">MAC Address</label>
                  <input 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-mono uppercase font-medium" 
                    placeholder="00:11:22:AA:BB:CC" 
                    value={formData.mac}
                    onChange={handleMacChange}
                    maxLength={17} 
                  />
                </div>

                {/* Value */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input type="number" step="0.01" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium" placeholder="0,00" 
                      value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cable Specifics */}
          {isCableOrDrop && (
             <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600"><Ruler className="w-5 h-5"/></div>
                  <h2 className="text-xl font-bold text-slate-800">Metragem</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quantidade Inicial</label>
                    <input type="number" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all font-medium" placeholder="Ex: 1000" 
                      value={formData.initialAmount} onChange={e => setFormData({...formData, initialAmount: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unidade</label>
                    <input className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed" readOnly value="metros" />
                  </div>
                </div>
             </div>
          )}
        </div>

        {/* Right Column: Photo & Actions */}
        <div className="space-y-8">
           <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600"><Camera className="w-5 h-5"/></div>
                <h2 className="text-xl font-bold text-slate-800">Foto do Item</h2>
              </div>
              
              <div className="w-full aspect-square rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                {displayPhoto ? (
                  <>
                    <img src={displayPhoto} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                       <p className="text-white font-bold text-sm">Alterar Foto</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">Clique para enviar</p>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG</p>
                  </div>
                )}
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handlePhotoChange} />
              </div>
              
              {formData.photo && (
                <button type="button" onClick={() => setFormData({...formData, photo: ''})} className="w-full mt-4 py-3 text-red-600 bg-red-50 border border-red-100 text-sm font-bold rounded-xl hover:bg-red-100 transition-colors">
                  Remover Foto
                </button>
              )}
           </div>

           <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600"><FileText className="w-5 h-5"/></div>
                <h2 className="text-xl font-bold text-slate-800">Observações</h2>
              </div>
              <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 min-h-[150px] resize-none" placeholder="Detalhes adicionais sobre o estado ou origem..." 
                value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} />
           </div>

           <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
             <Save className="w-5 h-5" /> Salvar Item
           </button>
        </div>

      </form>
      </div>
    </div>
  );
}