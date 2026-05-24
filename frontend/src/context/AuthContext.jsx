import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('equipos_user_data');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const data = await apiRequest('/auth/me');
      if (data?.success && data?.user) {
        setUser(data.user);
        localStorage.setItem('equipos_user_data', JSON.stringify(data.user));
      } else {
        setUser(null);
        localStorage.removeItem('equipos_user_data');
      }
    } catch {
      setUser(null);
      localStorage.removeItem('equipos_user_data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    const onUnauthorized = () => { setUser(null); localStorage.removeItem('equipos_user_data'); };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [checkAuth]);

  const login = useCallback(async (credentials) => {
    const data = await apiRequest('/auth/login', { method: 'POST', body: credentials });
    if (data?.success && data?.user) {
      setUser(data.user);
      localStorage.setItem('equipos_user_data', JSON.stringify(data.user));
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    localStorage.removeItem('equipos_user_data');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
