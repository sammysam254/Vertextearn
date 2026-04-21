import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const API = 'http://10.0.2.2:8000/api'; // 10.0.2.2 = localhost on Android emulator
// For real device on same WiFi, use your PC/phone IP e.g. http://192.168.1.x:8000/api

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

  const getToken = () => SecureStore.getItemAsync('vertext_token');

  const authHeaders = async () => {
    const token = await getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const login = async (username, password) => {
    const r = await fetch(`${API}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || 'Login failed');
    await SecureStore.setItemAsync('vertext_token', data.access);
    await SecureStore.setItemAsync('vertext_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password) => {
    const r = await fetch(`${API}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || 'Registration failed');
    await SecureStore.setItemAsync('vertext_token', data.access);
    await SecureStore.setItemAsync('vertext_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('vertext_token');
    await SecureStore.deleteItemAsync('vertext_user');
    setUser(null);
  };

  const apiFetch = async (path, opts = {}) => {
    const headers = await authHeaders();
    const r = await fetch(`${API}${path}`, { headers, ...opts });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${r.status}`);
    }
    return r.json();
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, login, register, logout, apiFetch, loading, API }}>
      {children}
    </AuthCtx.Provider>
  );
}
