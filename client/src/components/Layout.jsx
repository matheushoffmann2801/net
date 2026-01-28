import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, User, LayoutDashboard, Settings, PackagePlus, 
  Users, FileSpreadsheet, MapPin, Wifi, FileText, Menu, X, ChevronDown,
  ChevronLeft, ChevronRight, Layers, Box, Bell
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import logo from '../pages/logo1.png';
import PermissionGate from './PermissionGate';

export default function Layout({ children }) {
  const { signOut, user, selectedCity, setSessionCity } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    signOut();
    navigate('/login');
  }

  function nav(path, state = {}) {
    navigate(path, { state });
    setIsSidebarOpen(false);
  }

  const isActive = (path) => location.pathname === path;
  const btnClass = (path) => `
    flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all duration-200 mb-1 cursor-pointer
    ${isActive(path) 
      ? 'bg-blue-50 text-blue-600 shadow-sm' 
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
    ${collapsed ? 'justify-center' : ''}
  `;

  // Lógica de troca de cidade
  const CITIES = ["Nova Maringá", "Tapurah", "São José do Rio Claro"];
  const canChangeCity = user?.role?.toLowerCase() === 'admin' || user?.allowedCities?.includes('Todas') || user?.allowedCities?.length > 1;
  const availableCities = (user?.role?.toLowerCase() === 'admin' || user?.allowedCities?.includes('Todas'))
    ? CITIES
    : user?.allowedCities || [];

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      
      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`
        flex flex-col bg-white border-r border-gray-200
        transition-all duration-300 ease-in-out
        
        /* Mobile: Fixo, Z-Index 40 (Abaixo de Modais z-50) */
        fixed inset-y-0 left-0 h-full z-40 shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        
        /* Desktop: Relativo (Flex Item), Reset Transform, Shadow None */
        md:translate-x-0 md:static md:shadow-none md:z-auto
        
        /* Largura Responsiva */
        w-64 ${collapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        
        {/* Cabeçalho */}
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4 items-center shrink-0">
          <div className={`flex items-center justify-center w-full transition-all duration-300 ${collapsed ? '' : 'py-2'}`}>
            <img src={logo} alt="MTSpeed" className={`${collapsed ? 'w-10 h-10' : 'w-48 h-auto'} object-contain transition-all`} />
          </div>
          
          {/* Seletor de Cidade */}
          <div className="relative w-full">
            <button 
              onClick={() => canChangeCity && !collapsed && setIsCityMenuOpen(!isCityMenuOpen)}
              disabled={!canChangeCity || collapsed}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all
                ${collapsed ? 'justify-center' : 'justify-between'}
                ${canChangeCity 
                  ? 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100' 
                  : 'bg-gray-50 border-gray-100 text-gray-400 cursor-default'}
              `}
              title={selectedCity}
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-4 h-4 text-blue-500" />
                {!collapsed && <span className="truncate">{selectedCity || 'Local'}</span>}
              </div>
              {!collapsed && canChangeCity && <ChevronDown className={`w-3 h-3 transition-transform ${isCityMenuOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isCityMenuOpen && !collapsed && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCityMenuOpen(false)} />
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  {availableCities.map(city => (
                    <button key={city} onClick={() => { setSessionCity(city); setIsCityMenuOpen(false); toast.success(`Base: ${city}`); navigate('/'); }} className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-blue-50 transition-colors ${selectedCity === city ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>
                      {city}
                    </button>
                  ))}
                  {(user?.role?.toLowerCase() === 'admin' || user?.allowedCities?.includes('Todas')) && (
                     <button onClick={() => { setSessionCity('Todas'); setIsCityMenuOpen(false); toast.success(`Todas as Bases`); navigate('/'); }} className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-purple-50 transition-colors border-t border-gray-100 ${selectedCity === 'Todas' ? 'text-purple-600 bg-purple-50' : 'text-purple-600'}`}>
                      Todas (Matriz)
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Menu */}
        <nav className="p-3 flex-1 overflow-y-auto space-y-1 custom-scrollbar min-h-0">
          <button onClick={() => nav('/')} className={btnClass('/')} title="Visão Geral">
            <LayoutDashboard className="w-5 h-5" /> {!collapsed && "Visão Geral"}
          </button>

          <button onClick={() => nav('/inventory')} className={btnClass('/inventory')} title="Inventário">
            <Box className="w-5 h-5" /> {!collapsed && "Inventário"}
          </button>

          <PermissionGate permissions={['admin']}>
            <button onClick={() => nav('/notifications')} className={btnClass('/notifications')} title="Caixa de Entrada">
              <Bell className="w-5 h-5" /> {!collapsed && "Caixa de Entrada"}
            </button>
          </PermissionGate>
          
          {!collapsed && <div className="pt-4 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Operacional</div>}
          {collapsed && <div className="h-4"></div>}
          
          <button onClick={() => nav('/items/new')} className={btnClass('/items/new')} title="Novo Item">
            <PackagePlus className="w-5 h-5" /> {!collapsed && "Novo Item"}
          </button>
          <PermissionGate permissions={['admin']}>
            <button onClick={() => nav('/import')} className={btnClass('/import')} title="Importar CSV">
              <FileSpreadsheet className="w-5 h-5" /> {!collapsed && "Importar CSV"}
            </button>
          </PermissionGate>
          
          <button onClick={() => nav('/reports')} className={btnClass('/reports')} title="Relatórios">
            <FileText className="w-5 h-5" /> {!collapsed && "Relatórios"}
          </button>

          {!collapsed && <div className="pt-4 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Gestão</div>}
          {collapsed && <div className="h-4"></div>}
          
          <button onClick={() => nav('/users')} className={btnClass('/users')} title="Equipe">
            <Users className="w-5 h-5" /> {!collapsed && "Equipe & Acessos"}
          </button>

          {/* Novo Atalho */}
          <button onClick={() => nav('/settings', { tab: 'brands' })} className={btnClass('/settings-brands')} title="Marcas e Modelos">
            <Layers className="w-5 h-5" /> {!collapsed && "Marcas e Modelos"}
          </button>

          <button onClick={() => nav('/settings')} className={btnClass('/settings')} title="Configurações">
            <Settings className="w-5 h-5" /> {!collapsed && "Configurações"}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50/50 shrink-0">
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg mb-4 transition-colors hidden md:flex"
          >
            {collapsed ? <ChevronRight className="w-5 h-5"/> : <ChevronLeft className="w-5 h-5"/>}
          </button>

          <div className={`flex items-center gap-3 mb-4 ${collapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-blue-600 font-bold shadow-sm">
              {user?.name?.charAt(0)}
            </div>
            {!collapsed && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate" title={user?.name}>{user?.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`} title="Sair">
            <LogOut className="w-4 h-4" /> {!collapsed && "Sair"}
          </button>
        </div>
      </aside>

      {/* Wrapper do Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Header (Visível apenas em telas pequenas) */}
        <header className="md:hidden bg-white p-4 border-b border-gray-200 flex justify-between items-center shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            {isSidebarOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
          </button>
        </header>

        {/* Área de Scroll do Conteúdo */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 relative scroll-smooth">
          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none z-0"></div>
          <div className="relative z-10">
            {children}
          </div>
          <footer className="p-4 text-center text-xs text-gray-400 mt-8 pb-8">
            <p>© {new Date().getFullYear()} NetControl ISP. Desenvolvido por <strong>Matheus Hoffmann</strong>.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}