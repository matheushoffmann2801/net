import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Login from './pages/Login';
import TechLogin from './pages/TechLogin';
import TechDashboard from './pages/TechDashboard';
import GeneralControlLogin from './pages/GeneralControlLogin';
import GeneralControlDashboard from './pages/GeneralControlDashboard';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import NewItem from './pages/NewItem';
import Users from './pages/Users';
import ImportCSV from './pages/ImportCSV';
import Reports from './pages/Reports'; // NOVA TELA
import Notifications from './pages/Notifications'; // NOVA TELA
import CreditControl from './pages/CreditControl'; // NOVA TELA
import Settings from './pages/Settings';
import ComingSoon from './pages/ComingSoon';
import Layout from './components/Layout';

// Criação do Cliente React Query
const queryClient = new QueryClient();

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg"></div></div>;
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <Router>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/tech-login" element={<TechLogin />} />
          <Route path="/tech-dashboard" element={<PrivateRoute><TechDashboard /></PrivateRoute>} />
          <Route path="/general-login" element={<GeneralControlLogin />} />
          <Route path="/general-dashboard" element={<PrivateRoute><GeneralControlDashboard /></PrivateRoute>} />
          
          <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><Layout><Inventory /></Layout></PrivateRoute>} />
          <Route path="/items/new" element={<PrivateRoute><Layout><NewItem /></Layout></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><Layout><Users /></Layout></PrivateRoute>} />
          <Route path="/import" element={<PrivateRoute><Layout><ImportCSV /></Layout></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Layout><Notifications /></Layout></PrivateRoute>} />
          <Route path="/credit-control" element={<PrivateRoute><Layout><CreditControl /></Layout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
          
          {/* Nova Rota de Relatórios */}
          <Route path="/reports" element={<PrivateRoute><Layout><Reports /></Layout></PrivateRoute>} />
          
          <Route path="/backup" element={<PrivateRoute><Layout><ComingSoon /></Layout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
    </QueryClientProvider>
  );
}