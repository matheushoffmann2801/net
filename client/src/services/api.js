import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: 'http://192.168.250.102:3001/api',
  timeout: 15000, // 15 segundos de timeout para abortar requisições lentas
});

// 1. Interceptador de Requisição: Injeta o Token
api.interceptors.request.use((config) => {
  // Tenta pegar o token do localStorage
  const token = localStorage.getItem('@NetControl:token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// 2. Interceptador de Resposta: Trata Erros de Autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Tratamento de Timeout e Erros de Rede (Sem resposta do servidor)
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      toast.error("O servidor demorou muito para responder. Verifique sua conexão.");
      error.handled = true; // Marca como tratado para evitar duplicação
      return Promise.reject(error);
    }
    
    if (!error.response) {
      toast.error("Sem conexão com o servidor. Verifique se o backend está rodando.");
      error.handled = true;
      return Promise.reject(error);
    }

    const status = error.response.status;

    // 2. Tratamento de 401 (Sessão Expirada / Token Inválido)
    if (status === 401) {
      localStorage.removeItem('@NetControl:token');
      localStorage.removeItem('@NetControl:user');
      
      // Redireciona para login apenas se não estivermos lá
      if (!window.location.pathname.includes('/login')) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        window.location.href = '/login';
      }
      error.handled = true;
    }

    // 3. Tratamento de Erros Críticos do Servidor (500+)
    if (status >= 500) {
      toast.error("Erro interno no servidor. Tente novamente mais tarde.");
      error.handled = true;
    }

    return Promise.reject(error);
  }
);

export default api;