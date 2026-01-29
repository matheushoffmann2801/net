// c:\Users\MTspeed-03\Desktop\netcontrol-sistema\client\src\components\Layout.jsx

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
    flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 mb-1 cursor-pointer select-none active:scale-[0.98]
    ${isActive(path) 
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
    ${collapsed ? 'justify-center' : ''}
  `;

  // Lógica de troca de cidade
  const CITIES = ["Nova Maringá", "Tapurah", "São José do Rio Claro"];
  const canChangeCity = user?.role?.toLowerCase() === 'admin' || user?.allowedCities?.includes('Todas') || user?.allowedCities?.length > 1;
  const availableCities = (user?.role?.toLowerCase() === 'admin' || user?.allowedCities?.includes('Todas'))
    ? CITIES
    : user?.allowedCities || [];

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden font-sans">
      
      {/* Overlay Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`
        flex flex-col bg-white border-r border-slate-200/60
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        
        /* Mobile: Fixo, Z-Index 40 (Abaixo de Modais z-50) */
        fixed inset-y-0 left-0 h-full z-40 shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        
        /* Desktop: Relativo (Flex Item), Reset Transform, Shadow None */
        md:translate-x-0 md:static md:shadow-none md:z-auto
        
        /* Largura Responsiva */
        w-[280px] ${collapsed ? 'md:w-[90px]' : 'md:w-[280px]'}
      `}>
        
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-100/50 flex flex-col gap-6 items-center shrink-0">
          <div className={`flex items-center justify-center w-full transition-all duration-300 ${collapsed ? '' : 'px-2'}`}>
            <img src={logo} alt="MTSpeed" className={`${collapsed ? 'w-8 h-8' : 'w-40 h-auto'} object-contain transition-all duration-300`} />
          </div>
          
          {/* Seletor de Cidade */}
          <div className="relative w-full">
            <button 
              onClick={() => canChangeCity && !collapsed && setIsCityMenuOpen(!isCityMenuOpen)}
              disabled={!canChangeCity || collapsed}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200
                ${collapsed 
                  ? 'justify-center border-transparent bg-transparent p-0' 
                  : canChangeCity 
                    ? 'justify-between bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:shadow-sm hover:ring-2 hover:ring-blue-50 group'
                    : 'justify-between bg-gray-50 border-transparent text-gray-400 cursor-default'
                }
              `}
              title={selectedCity}
            >
              <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : 'truncate'}`}>
                <div className={`p-1.5 rounded-lg ${collapsed ? 'bg-blue-50 text-blue-600' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors'}`}>
                    <MapPin className="w-4 h-4" />
                </div>
                {!collapsed && <span className="truncate font-semibold">{selectedCity || 'Local'}</span>}
              </div>
              {!collapsed && canChangeCity && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCityMenuOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isCityMenuOpen && !collapsed && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCityMenuOpen(false)} />
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 ring-1 ring-black/5">
                  {availableCities.map(city => (
                    <button key={city} onClick={() => { setSessionCity(city); setIsCityMenuOpen(false); toast.success(`Base: ${city}`); navigate('/'); }} className={`w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-blue-50 transition-colors ${selectedCity === city ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>
                      {city}
                    </button>
                  ))}
                  {(user?.role?.toLowerCase() === 'admin' || user?.allowedCities?.includes('Todas')) && (
                     <button onClick={() => { setSessionCity('Todas'); setIsCityMenuOpen(false); toast.success(`Todas as Bases`); navigate('/'); }} className={`w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-purple-50 transition-colors border-t border-slate-50 ${selectedCity === 'Todas' ? 'text-purple-600 bg-purple-50' : 'text-purple-600'}`}>
                      Todas (Matriz)
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Menu */}
        <nav className="p-4 flex-1 overflow-y-auto space-y-1.5 custom-scrollbar min-h-0">
          <button onClick={() => nav('/')} className={btnClass('/')} title="Visão Geral">
            <LayoutDashboard className="w-5 h-5" /> {!collapsed && "Visão Geral"}
          </button>

          <button onClick={() => nav('/inventory')} className={btnClass('/inventory')} title="Inventário">
            <Box className="w-5 h-5" /> {!collapsed && "Inventário"}
          </button>

          {!collapsed && <div className="pt-6 pb-2 text-[10px] font-extrabold text-slate-400/80 uppercase tracking-widest px-3">Operacional</div>}
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

          {!collapsed && <div className="pt-6 pb-2 text-[10px] font-extrabold text-slate-400/80 uppercase tracking-widest px-3">Gestão</div>}
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

        <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex flex-col gap-2">
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors hidden md:flex"
          >
            {collapsed ? <ChevronRight className="w-5 h-5"/> : <ChevronLeft className="w-5 h-5"/>}
          </button>

          <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${collapsed ? 'justify-center' : 'bg-slate-50/50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200'}`}>
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 font-bold shadow-sm shrink-0">
              {user?.name?.charAt(0)}
            </div>
            {!collapsed && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700 truncate" title={user?.name}>{user?.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-[0.98] ${collapsed ? 'justify-center' : ''}`} title="Sair">
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F8FAFC] relative scroll-smooth">
          <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-50/80 via-blue-50/20 to-transparent pointer-events-none z-0"></div>
          <div className="relative z-10">
            {children}
          </div>
          <footer className="p-4 text-center text-xs text-slate-400 mt-8 pb-8">
            <p>© {new Date().getFullYear()} NetControl ISP. Desenvolvido por <strong>Matheus Hoffmann</strong>.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}