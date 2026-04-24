import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export const API_URL = 'https://vertext-backend-h1e0.onrender.com/api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync('vertext_user');
        if (stored) setUser(JSON.parse(stored));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const getToken = async () => SecureStore.getItemAsync('vertext_token');

  const apiFetch = async (path, opts = {}) => {
    const token = await getToken();
    const isFormData = opts.body instanceof FormData;
    const headers = {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    };
    const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
    return data;
  };

  const login = async (username, password) => {
    const data = await apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    await SecureStore.setItemAsync('vertext_token', data.access);
    await SecureStore.setItemAsync('vertext_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password) => {
    const data = await apiFetch('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    await SecureStore.setItemAsync('vertext_token', data.access);
    await SecureStore.setItemAsync('vertext_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('vertext_token');
    await SecureStore.deleteItemAsync('vertext_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await apiFetch('/auth/me/');
      await SecureStore.setItemAsync('vertext_user', JSON.stringify(data));
      setUser(data);
    } catch {}
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, login, register, logout, apiFetch, loading, getToken, refreshUser, API_URL }}>
      {children}
    </AuthCtx.Provider>
  );
}
