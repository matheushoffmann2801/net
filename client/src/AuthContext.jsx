import React, { createContext, useState, useContext, useEffect } from 'react';
import api from './services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('Nova Maringá');

  useEffect(() => {
    const token = localStorage.getItem('@NetControl:token');
    const storedUser = localStorage.getItem('@NetControl:user');
    const storedCity = localStorage.getItem('@NetControl:city');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    if (storedCity) {
      setSelectedCity(storedCity);
    }
    setLoading(false);
  }, []);

  const signIn = async (username, password) => {
    try {
      const res = await api.post('/login', { username, password });
      const { token, user, mustChangePassword } = res.data;
      
      localStorage.setItem('@NetControl:token', token);
      localStorage.setItem('@NetControl:user', JSON.stringify(user));
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { user, mustChangePassword };
    } catch (error) {
      console.error("Erro login:", error);
      return false;
    }
  };

  const signOut = () => {
    localStorage.removeItem('@NetControl:token');
    localStorage.removeItem('@NetControl:user');
    localStorage.removeItem('@NetControl:city');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  const setSessionCity = (city) => {
    setSelectedCity(city);
    localStorage.setItem('@NetControl:city', city);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading, selectedCity, setSessionCity }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);