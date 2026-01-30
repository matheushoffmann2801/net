import React, { useState, useEffect, useMemo } from 'react';
import { UploadCloud, Save, CheckCircle, Database, Ban, FileText, Loader2, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// --- UTILITÁRIOS ---
const cleanCurrency = (value) => {
  if (!value) return 0;
  const clean = String(value).replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
};

const cleanDate = (dateStr) => {
  if (!dateStr) return null;
  // Suporte a Excel Serial Date e DD/MM/YYYY
  const clean = String(dateStr).trim();
  if (/^\d{5}$/.test(clean)) {
     const date = new Date(Math.round((clean - 25569)*86400*1000));
     return date.toISOString().split('T')[0];
  }
  const ptBrPattern = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/;
  const match = clean.match(ptBrPattern);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  return null; 
};

export default function ImportCSV() {
  const navigate = useNavigate();
  const { selectedCity } = useAuth();
  
  const [step, setStep] = useState(1);
  const [fileData, setFileData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultLog, setResultLog] = useState(null);
  const [progress, setProgress] = useState(0); 
  const [encoding, setEncoding] = useState('ISO-8859-1');
  const [duplicatePatrimonies, setDuplicatePatrimonies] = useState([]);
  
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [globalBrand, setGlobalBrand] = useState('');
  const [globalModel, setGlobalModel] = useState('');
  const [globalType, setGlobalType] = useState('onu');

  useEffect(() => {
    async function load() {
      try {
        const [b, m] = await Promise.all([api.get('/brands'), api.get('/models')]);
        setBrands(b.data); setModels(m.data);
      } catch (e) { console.error(e); }
    }
    load();
  }, []);

  const filteredModels = useMemo(() => models.filter(m => m.brandId == globalBrand), [models, globalBrand]);

  const processCSV = (results) => {
    const rawData = results.data;
    let headerIndex = -1;

    // 1. Busca inteligente do cabeçalho
    for (let i = 0; i < Math.min(25, rawData.length); i++) {
      const lineStr = JSON.stringify(rawData[i]).toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
      
      if (lineStr.includes('PATRIMONIO') || (lineStr.includes('IDENTIFICA') && lineStr.includes('CLIENTE'))) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      return toast.error("Cabeçalho não encontrado. Verifique se a planilha tem 'Patrimonio' e 'Identificação'.");
    }

    const headers = Object.values(rawData[headerIndex]).map(h => 
      String(h).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    );
    
    // Mapeamento de Colunas
    const idxSerial = headers.findIndex(h => h.includes('IDENTIFICA') || h.includes('SERIAL') || h === 'SN');
    const idxPatrimonio = headers.findIndex(h => h.includes('PATRIMONIO'));
    const idxCliente = headers.findIndex(h => h.includes('CLIENTE') || h.includes('NOME'));
    const idxSituacao = headers.findIndex(h => h.includes('SITUA') || h.includes('STATUS'));
    const idxInstalado = headers.findIndex(h => h.includes('INSTALADO'));
    const idxRetirada = headers.findIndex(h => h.includes('RETIRADA')); // Importante para definir status
    const idxDataRef = headers.findIndex(h => h.includes('DATA_REFERENCIA')); // Novo campo do script Python
    const idxMarca = headers.findIndex(h => h.includes('MARCA'));
    const idxModelo = headers.findIndex(h => h.includes('MODELO'));
    const idxValor = headers.findIndex(h => h.includes('VALOR'));

    if (idxSerial === -1) return toast.error("Coluna Serial não encontrada!");

    // ALERTA DE PLANILHA SUJA
    if (idxRetirada > -1 && idxDataRef === -1) {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <span className="font-bold text-orange-700">⚠️ Planilha de Histórico detectada!</span>
          <span className="text-xs text-slate-600">Recomendamos rodar o script <b>clean_csv.py</b> para consolidar o histórico e evitar erros de duplicidade.</span>
          <button onClick={() => toast.dismiss(t.id)} className="bg-slate-200 px-2 py-1 rounded text-xs font-bold w-fit">Entendi, continuar assim mesmo</button>
        </div>
      ), { duration: 8000, icon: '🧹' });
    }

    // 2. Extração Bruta
    let rawRows = [];
    rawData.slice(headerIndex + 1).forEach(row => {
      const cols = Array.isArray(row) ? row : Object.values(row);
      const serial = cols[idxSerial] ? String(cols[idxSerial]).trim() : '';
      
      if (!serial || serial.length < 3) return;

      const installDate = idxInstalado > -1 ? cleanDate(cols[idxInstalado]) : null;
      const removeDate = idxRetirada > -1 ? cleanDate(cols[idxRetirada]) : null;
      
      // Definimos uma "Data do Evento" para poder ordenar corretamente
      // Se tiver retirada, a data do evento é a retirada (mais recente que a instalação daquela linha)
      const eventDate = idxDataRef > -1 ? cols[idxDataRef] : (removeDate || installDate);

      rawRows.push({
        serial: serial,
        patrimony: idxPatrimonio > -1 ? String(cols[idxPatrimonio] || '').trim() : '',
        clientName: idxCliente > -1 ? String(cols[idxCliente] || '').trim() : '',
        originalStatus: idxSituacao > -1 ? String(cols[idxSituacao] || '').trim() : '',
        installDate: installDate,
        removeDate: removeDate,
        eventDate: eventDate || '1970-01-01', // Fallback para ordenação
        brand: idxMarca > -1 ? String(cols[idxMarca] || '').trim() : null,
        model: idxModelo > -1 ? String(cols[idxModelo] || '').trim() : null,
        value: idxValor > -1 ? cleanCurrency(cols[idxValor]) : 0
      });
    });

    // 3. CONSOLIDAÇÃO (A Mágica para corrigir o Histórico)
    const consolidatedMap = new Map();
    const patrimonyCheck = new Map();
    const duplicates = [];

    // Ordena tudo cronologicamente antes de processar
    rawRows.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    rawRows.forEach(row => {
      // Checagem de Patrimônio Duplicado em seriais diferentes
      if (row.patrimony) {
        if (patrimonyCheck.has(row.patrimony) && patrimonyCheck.get(row.patrimony) !== row.serial) {
           duplicates.push({ pat: row.patrimony, serial1: patrimonyCheck.get(row.patrimony), serial2: row.serial });
        }
        patrimonyCheck.set(row.patrimony, row.serial);
      }

      // Lógica de "Quem ganha": O último evento da lista (já ordenada) define o status
      // Se a linha tem data de RETIRADA, o status atual é "Estoque/Disponível" e limpamos o cliente
      // Se a linha tem data de INSTALAÇÃO e NÃO tem retirada, o status é "Comodato" e mantemos o cliente
      
      let finalState = { ...row };
      
      // Se a linha atual indica uma retirada, o cliente atual deve ser resetado (voltou pro estoque)
      if (row.removeDate) {
         finalState.clientName = ""; // Sem cliente
         finalState.originalStatus = "DISPONIVEL"; 
      }

      // Atualiza o mapa sempre com o evento mais recente
      consolidatedMap.set(row.serial, finalState);
    });

    setDuplicatePatrimonies(duplicates);
    setFileData(Array.from(consolidatedMap.values()));
    setStep(2);
    
    toast.success(`${consolidatedMap.size} itens consolidados com sucesso!`);
    if (duplicates.length > 0) toast.error(`Atenção: ${duplicates.length} conflitos de patrimônio detectados.`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, { header: false, skipEmptyLines: 'greedy', encoding: encoding, complete: processCSV });
  };

  const handleImport = async () => {
    if (!globalBrand || !globalModel) return toast.error("Selecione Marca e Modelo padrão.");
    
    setLoading(true);
    setProgress(0);

    const globalBrandName = brands.find(b => b.id == globalBrand)?.name;
    const globalModelName = models.find(m => m.id == globalModel)?.name;

    const itemsToImport = fileData.map(row => ({
      serial: row.serial,
      patrimony: row.patrimony,
      // Se o processo de consolidação limpou o nome, envia vazio (estoque)
      clientName: row.clientName, 
      originalStatus: row.originalStatus,
      installDate: row.installDate, // Data da última instalação válida
      brand: row.brand || globalBrandName,
      model: row.model || globalModelName,
      city: selectedCity === 'Todas' ? 'Nova Maringá' : selectedCity,
      type: globalType, 
      category: 'equipamento',
      value: row.value
    }));

    const CHUNK_SIZE = 50;
    const chunks = [];
    for (let i = 0; i < itemsToImport.length; i += CHUNK_SIZE) chunks.push(itemsToImport.slice(i, i + CHUNK_SIZE));

    let summary = { added: 0, updated: 0, duplicates: 0, errors: 0 };
    let details = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        const res = await api.post('/items/batch', { items: chunks[i] });
        summary.added += res.data.summary.added;
        summary.updated += res.data.summary.updated;
        summary.duplicates += res.data.summary.duplicates;
        summary.errors += res.data.summary.errors;
        details = [...details, ...res.data.details];
        setProgress(Math.round(((i + 1) / chunks.length) * 100));
      }
      setResultLog({ summary, details });
      toast.success("Importação concluída!");
    } catch (error) {
      toast.error("Erro na importação.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-slide-up">
      <div className="mb-6">
         <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
           <Database className="w-7 h-7 text-blue-600"/> Importador Blindado v2
         </h1>
         <p className="text-gray-500 text-sm">Correção de histórico e duplicatas</p>
      </div>

      {step === 1 && (
        <div className="bg-white p-12 border-2 border-dashed border-gray-300 rounded-xl text-center group relative">
          <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileUpload} />
          <UploadCloud className="w-20 h-20 text-blue-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold text-gray-700">Arraste a planilha CSV</h3>
          <p className="text-gray-500 mt-2">O sistema vai consolidar o histórico automaticamente.</p>
        </div>
      )}

      {step === 2 && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-white p-5 rounded-xl shadow-sm border">
                <h3 className="font-bold text-gray-800 mb-3">Configuração Obrigatória</h3>
                <div className="space-y-3">
                  <select className="w-full p-2 border rounded" value={globalType} onChange={e=>setGlobalType(e.target.value)}>
                    <option value="onu">ONU</option><option value="mikrotik">Mikrotik</option>
                  </select>
                  <select className="w-full p-2 border rounded" onChange={e=>setGlobalBrand(e.target.value)}>
                    <option value="">Marca Padrão...</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select className="w-full p-2 border rounded" onChange={e=>setGlobalModel(e.target.value)}>
                    <option value="">Modelo Padrão...</option>{filteredModels.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <button onClick={handleImport} disabled={loading} className={`w-full mt-4 py-3 rounded-lg font-bold text-white shadow-lg ${loading?'bg-gray-400':'bg-green-600 hover:bg-green-700'}`}>
                   {loading ? `Enviando ${progress}%` : 'Importar Dados Reais'}
                </button>
             </div>

             {duplicatePatrimonies.length > 0 && (
               <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                 <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2 text-sm"><Ban className="w-4 h-4"/> Patrimônios Duplicados</h4>
                 <div className="max-h-40 overflow-y-auto text-xs text-red-700 space-y-1">
                   {duplicatePatrimonies.map((d, i) => (
                     <div key={i}>Pat: <b>{d.pat}</b> (Seriais: {d.serial1} e {d.serial2})</div>
                   ))}
                 </div>
               </div>
             )}
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="font-bold text-gray-800 mb-4 flex justify-between">
              <span>Prévia Consolidada (Status Atual)</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Únicos: {fileData.length}</span>
            </h3>
            <div className="border rounded overflow-hidden max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-bold text-xs uppercase sticky top-0">
                  <tr>
                    <th className="p-3">Serial</th>
                    <th className="p-3">Cód. Cliente</th>
                    <th className="p-3">Status Calculado</th>
                    <th className="p-3">Data Evento</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {fileData.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-blue-600 font-bold">{row.serial}</td>
                      <td className="p-3 truncate max-w-[150px]">
                        {row.clientName ? row.clientName : <span className="text-gray-400 italic">-- Estoque --</span>}
                      </td>
                      <td className="p-3 text-xs">
                         <span className={`px-2 py-1 rounded font-bold ${!row.clientName ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                           {row.clientName ? 'EM USO' : 'DISPONÍVEL'}
                         </span>
                      </td>
                      <td className="p-3 text-xs text-gray-500">{row.eventDate !== '1970-01-01' ? row.eventDate : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fileData.length > 50 && <div className="text-center text-xs text-gray-400 p-2">... mostrando apenas os primeiros 50 itens</div>}
          </div>
        </div>
      )}

      {resultLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/>
              <h2 className="text-2xl font-bold mb-2">Importação Concluída</h2>
              <p className="text-gray-600 mb-6 text-sm">O estoque foi atualizado com o estado mais recente de cada item.</p>
              <button onClick={()=>navigate('/')} className="bg-gray-900 text-white w-full py-3 rounded font-bold">Ir para o Início</button>
           </div>
        </div>
      )}
    </div>
  );
}