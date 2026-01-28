import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, UserPlus, Edit, Key, MapPin, CheckSquare, Square, Search, Shield, User as UserIcon, Loader2, Clock, Power } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const CITIES = ["Nova Maringá", "Tapurah", "São José do Rio Claro"];

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '', email: '', username: '', role: 'tecnico', password: '',
    allowedCities: [] 
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([api.get('/users'), api.get('/roles')]);
      setUsers(uRes.data);
      setRoles(rRes.data);
    } catch (error) { console.error("Erro dados"); toast.error("Erro ao carregar usuários"); }
    finally { setLoading(false); }
  }

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  function handleEdit(user) {
    setFormData({
      name: user.name, email: user.email, username: user.username || '',
      role: user.role, password: '',
      allowedCities: user.allowedCities || []
    });
    setEditingId(user.id);
    setShowForm(true);
  }

  function toggleCity(city) {
    setFormData(prev => {
      if (prev.allowedCities.includes(city)) {
        return { ...prev, allowedCities: prev.allowedCities.filter(c => c !== city) };
      } else {
        return { ...prev, allowedCities: [...prev.allowedCities, city] };
      }
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      // Se for Admin, força acesso a tudo ou limpa
      const dataToSend = { ...formData };
      if (formData.role === 'admin') dataToSend.allowedCities = ["Todas"];

      if (editingId) await api.put(`/users/${editingId}`, dataToSend);
      else await api.post('/users', dataToSend);
      
      toast.success("Salvo!");
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (error) { toast.error("Erro ao salvar."); }
  }

  async function handleToggleStatus(user) {
    const action = user.active !== false ? 'desativar' : 'ativar';
    if (window.confirm(`Tem certeza que deseja ${action} o usuário ${user.name}?`)) {
      await api.put(`/users/${user.id}`, { ...user, active: user.active === false });
      loadData();
    }
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-blue-600" /> Equipe MTSPEED
          </h1>
          <p className="text-gray-500 text-sm">Gerencie acessos e cidades</p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input className="pl-9 p-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buscar usuário..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({name:'', email:'', username:'', role:'tecnico', password:'', allowedCities:[]}); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex gap-2 items-center font-medium transition-colors shadow-sm">
              <UserPlus className="w-4 h-4" /> Novo Usuário
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-8">
          <h3 className="font-bold mb-4">{editingId ? 'Editar' : 'Novo'} Usuário</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Nome" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="border p-2 rounded" />
            <input required placeholder="Login (Usuário)" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="border p-2 rounded" />
            
            {isAdmin && (
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="border p-2 rounded bg-white">
                {roles.map(r => <option key={r.id} value={r.value}>{r.name}</option>)}
              </select>
            )}

            <div className="flex flex-col gap-1">
              <input 
                placeholder={editingId ? "Nova Senha (opcional)" : "Senha"} 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                className="border p-2 rounded" 
              />
              {editingId && <span className="text-[10px] text-gray-500">Deixe em branco para manter a senha atual</span>}
            </div>

            {/* SELEÇÃO DE CIDADES */}
            <div className="md:col-span-2 bg-gray-50 p-3 rounded border">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4"/> Acesso a Cidades (Matriz & Filiais)
              </label>
              
              {formData.role === 'admin' ? (
                <p className="text-sm text-purple-600 font-medium">Administradores têm acesso total automático.</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {CITIES.map(city => (
                    <button type="button" key={city} onClick={() => toggleCity(city)} 
                      className={`flex items-center gap-2 px-3 py-1 rounded border transition-colors ${formData.allowedCities.includes(city) ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white text-gray-500'}`}>
                      {formData.allowedCities.includes(city) ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 pt-2 flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">Cancelar</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded font-medium">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
            <p>Carregando equipe...</p>
          </div>
        ) : (
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr><th className="p-4">Nome</th><th className="p-4">Cargo</th><th className="p-4">Cidades Permitidas</th><th className="p-4">Último Acesso</th><th className="p-4 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map(u => (
              <tr key={u.id} className={`hover:bg-blue-50/50 transition-colors ${u.active === false ? 'opacity-50 bg-gray-50' : ''}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm ${u.active === false ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-gradient-to-tr from-blue-100 to-blue-50 border-blue-100 text-blue-600'}`}>
                      {u.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{u.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1"><Key className="w-3 h-3"/> {u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <RoleBadge role={u.role} />
                </td>
                <td className="p-4">
                  {u.role === 'admin' || (u.allowedCities && u.allowedCities.includes("Todas")) ? (
                    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200">
                      <Shield className="w-3 h-3"/> ACESSO TOTAL
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.allowedCities?.map(c => <span key={c} className="bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded text-xs">{c}</span>)}
                      {(!u.allowedCities || u.allowedCities.length === 0) && <span className="text-gray-400 text-xs italic">Nenhuma cidade vinculada</span>}
                    </div>
                  )}
                </td>
                <td className="p-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400"/>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : <span className="text-gray-400 italic">Nunca</span>}
                  </div>
                </td>
                <td className="p-4 text-right">
                  {isAdmin && <button onClick={() => handleEdit(u)} className="text-blue-600 mr-2"><Edit className="w-4 h-4"/></button>}
                  {isAdmin && u.id !== currentUser.id && (
                    <button onClick={() => handleToggleStatus(u)} className={`${u.active === false ? 'text-green-600' : 'text-red-500'}`} title={u.active === false ? "Ativar" : "Desativar"}>
                      <Power className="w-4 h-4"/>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = { admin: "bg-purple-100 text-purple-700 border-purple-200", tecnico: "bg-blue-100 text-blue-700 border-blue-200", user: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${styles[role] || styles.user} flex items-center gap-1.5 w-fit shadow-sm`}>
      {role === 'admin' ? <Shield className="w-3 h-3"/> : <UserIcon className="w-3 h-3"/>} {role}
    </span>
  );
}