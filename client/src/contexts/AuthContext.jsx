import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null); // Cidade da Sessão Atual
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('@NetControl:user');
    const storedToken = localStorage.getItem('@NetControl:token');
    const storedCity = localStorage.getItem('@NetControl:city'); // Recupera a cidade

    if (storedUser && storedToken) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        setUser(JSON.parse(storedUser));
        if (storedCity) setSelectedCity(storedCity);
      } catch (error) {
        console.error("Sessão inválida, limpando...", error);
        localStorage.clear();
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  async function signIn(login, password) {
    try {
      const response = await api.post('/login', { username: login, password });
      const { token, user } = response.data;

      localStorage.setItem('@NetControl:user', JSON.stringify(user));
      localStorage.setItem('@NetControl:token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      return response.data;
    } catch (error) {
      toast.error('Login falhou.');
      return false;
    }
  }

  // Nova função para definir a cidade da sessão
  function setSessionCity(city) {
    setSelectedCity(city);
    localStorage.setItem('@NetControl:city', city);
  }

  function signOut() {
    localStorage.clear();
    setUser(null);
    setSelectedCity(null);
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, selectedCity, setSessionCity, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
export default AuthContext;