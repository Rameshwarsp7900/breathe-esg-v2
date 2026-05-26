import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [tenants, setTenants]         = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [loading, setLoading]         = useState(true);

  const setAuthState = useCallback((data) => {
    setUser(data.user);
    setTenants(data.tenants || []);
    if (data.tenants?.length > 0) {
      setCurrentTenant(t => t || data.tenants[0]);
    }
  }, []);

  useEffect(() => {
    // Only attempt to restore session if a token exists in storage
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI.me()
      .then(r => setAuthState(r.data))
      .catch(() => {
        // Token is invalid/expired — clear it so the login page shows
        localStorage.removeItem('authToken');
      })
      .finally(() => setLoading(false));
  }, [setAuthState]);

  const login = async (username, password) => {
    const r = await authAPI.login(username, password);
    localStorage.setItem('authToken', r.data.token);
    setAuthState(r.data);
    return r.data;
  };

  const logout = async () => {
    await authAPI.logout().catch(() => {});
    localStorage.removeItem('authToken');
    setUser(null); setTenants([]); setCurrentTenant(null);
  };

  return (
    <AuthContext.Provider value={{ user, tenants, currentTenant, setCurrentTenant, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
