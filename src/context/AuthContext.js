import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export const API_URL = 'https://vertext-backend-h1e0.onrender.com/api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const memCache = { feed: null, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000;

export async function getCachedFeed() {
  if (memCache.feed && Date.now() - memCache.ts < CACHE_TTL) return memCache.feed;
  try {
    const raw = await SecureStore.getItemAsync('vertext_feed_cache');
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    memCache.feed = data; memCache.ts = ts;
    return data;
  } catch { return null; }
}

export async function setCachedFeed(data) {
  memCache.feed = data; memCache.ts = Date.now();
  try {
    const slim = data.slice(0, 8).map(v => ({
      id: v.id, video_url: v.video_url, thumbnail_url: v.thumbnail_url,
      caption: v.caption, likes_count: v.likes_count, comments_count: v.comments_count,
      shares_count: v.shares_count, saves_count: v.saves_count,
      views_count: v.views_count, is_liked: v.is_liked, is_saved: v.is_saved,
      is_ad: v.is_ad, user: v.user,
    }));
    const payload = JSON.stringify({ data: slim, ts: Date.now() });
    if (payload.length < 2000) {
      await SecureStore.setItemAsync('vertext_feed_cache', payload);
    }
  } catch {}
}

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
    if (!res.ok) throw new Error(data.detail || data.error || `Error ${res.status}`);
    return data;
  };

  const login = async (username, password) => {
    const data = await apiFetch('/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) });
    // Handle both 'access' and 'token' field names from backend
    const token = data.access || data.token || '';
    const userObj = data.user || {};
    if (token) await SecureStore.setItemAsync('vertext_token', String(token));
    if (userObj) await SecureStore.setItemAsync('vertext_user', JSON.stringify(userObj));
    setUser(userObj);
    return userObj;
  };

  const register = async (username, email, password) => {
    const data = await apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify({ username, email, password }) });
    const token = data.access || data.token || '';
    const userObj = data.user || {};
    if (token) await SecureStore.setItemAsync('vertext_token', String(token));
    if (userObj) await SecureStore.setItemAsync('vertext_user', JSON.stringify(userObj));
    setUser(userObj);
    return { can_claim_blue: data.can_claim_blue || false };
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('vertext_token');
    await SecureStore.deleteItemAsync('vertext_user');
    await SecureStore.deleteItemAsync('vertext_feed_cache');
    memCache.feed = null;
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await apiFetch('/auth/me/');
      await SecureStore.setItemAsync('vertext_user', JSON.stringify(data));
      setUser(data);
    } catch {}
  };

  const isDemo = () => user?.username === 'demo';

  const guardDemo = (action, message = 'Create your own account to do this!') => {
    if (user?.username === 'demo') {
      const { Alert } = require('react-native');
      Alert.alert(
        '👀 Demo Account',
        message + '\n\nSign up free to unlock all features!',
        [{ text: 'OK' }]
      );
      return true;
    }
    return false;
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, login, register, logout, apiFetch, loading, getToken, refreshUser, API_URL, isDemo, guardDemo }}>
      {children}
    </AuthCtx.Provider>
  );
}
