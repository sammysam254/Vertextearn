import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Switch,
  RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function AdminPanel({ onClose }) {
  const { apiFetch } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [verRequests, setVerRequests] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [s, u, v, cfg] = await Promise.all([
        apiFetch('/admin/stats/'),
        apiFetch('/admin/users/'),
        apiFetch('/admin/verification-requests/'),
        apiFetch('/admin/settings/'),
      ]);
      setStats(s);
      setUsers(u);
      setVerRequests(v);
      setSettings(cfg);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const toggleSetting = async (key, val) => {
    try {
      await apiFetch('/admin/settings/', { method: 'POST', body: JSON.stringify({ [key]: val }) });
      setSettings(s => ({ ...s, [key]: val }));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const approveVerification = async (id) => {
    try {
      await apiFetch(`/admin/verification-requests/${id}/approve/`, { method: 'POST' });
      setVerRequests(v => v.filter(r => r.id !== id));
      Alert.alert('✅', 'Verification approved!');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const rejectVerification = async (id) => {
    try {
      await apiFetch(`/admin/verification-requests/${id}/reject/`, { method: 'POST' });
      setVerRequests(v => v.filter(r => r.id !== id));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const toggleUserSuspend = async (userId, suspended) => {
    try {
      await apiFetch(`/admin/users/${userId}/suspend/`, { method: 'POST', body: JSON.stringify({ suspended: !suspended }) });
      setUsers(u => u.map(usr => usr.id === userId ? { ...usr, is_suspended: !suspended } : usr));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const toggleMonetize = async (userId, monetized) => {
    try {
      await apiFetch(`/admin/users/${userId}/monetize/`, { method: 'POST', body: JSON.stringify({ monetized: !monetized }) });
      setUsers(u => u.map(usr => usr.id === userId ? { ...usr, is_monetized: !monetized } : usr));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  if (loading) return (
    <View style={S.center}>
      <ActivityIndicator size="large" color="#fe2c55" />
    </View>
  );

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={onClose} style={S.closeBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>⚙️ Admin Panel</Text>
        <TouchableOpacity onPress={() => load(true)}>
          <Ionicons name="refresh" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={S.tabs}>
        {['dashboard', 'users', 'verify', 'settings'].map(t => (
          <TouchableOpacity key={t} style={[S.tab, tab === t && S.tabActive]} onPress={() => setTab(t)}>
            <Text style={[S.tabTxt, tab === t && S.tabTxtActive]}>
              {t === 'dashboard' ? '📊' : t === 'users' ? '👥' : t === 'verify' ? '✓' : '⚙️'}
              {' '}{t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={S.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#fe2c55" />}
      >
        {/* DASHBOARD */}
        {tab === 'dashboard' && stats && (
          <View>
            <Text style={S.sectionTitle}>Platform Overview</Text>
            {[
              { label: 'Total Users', val: stats.total_users, icon: '👥' },
              { label: 'Total Videos', val: stats.total_videos, icon: '🎬' },
              { label: 'Total Views', val: stats.total_views, icon: '👁' },
              { label: 'Monetized Creators', val: stats.monetized_users, icon: '💰' },
              { label: 'Pending Verifications', val: stats.pending_verifications, icon: '✓' },
              { label: 'Total Ad Revenue', val: `$${stats.total_ad_revenue || '0.00'}`, icon: '💵' },
            ].map(item => (
              <View key={item.label} style={S.statCard}>
                <Text style={S.statIcon}>{item.icon}</Text>
                <View>
                  <Text style={S.statVal}>{item.val}</Text>
                  <Text style={S.statLabel}>{item.label}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <View>
            <TextInput
              style={S.searchInput}
              placeholder="Search users..."
              placeholderTextColor="#555"
              value={search}
              onChangeText={setSearch}
            />
            {filteredUsers.map(u => (
              <View key={u.id} style={S.userCard}>
                <View style={S.userInfo}>
                  <View style={S.userAvatar}>
                    <Text style={S.userAvatarLetter}>{u.username?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={S.userName}>@{u.username}</Text>
                    <Text style={S.userEmail}>{u.email}</Text>
                    <View style={S.userBadges}>
                      {u.is_verified && <Text style={S.badge}>✓ Verified</Text>}
                      {u.is_monetized && <Text style={[S.badge, S.badgeGold]}>💰 Monetized</Text>}
                      {u.is_suspended && <Text style={[S.badge, S.badgeRed]}>🚫 Suspended</Text>}
                    </View>
                  </View>
                </View>
                <View style={S.userActions}>
                  <TouchableOpacity
                    style={[S.actionBtn, u.is_monetized && S.actionBtnActive]}
                    onPress={() => toggleMonetize(u.id, u.is_monetized)}
                  >
                    <Text style={S.actionBtnTxt}>{u.is_monetized ? 'Demonetize' : 'Monetize'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.actionBtn, u.is_suspended && S.actionBtnDanger]}
                    onPress={() => toggleUserSuspend(u.id, u.is_suspended)}
                  >
                    <Text style={S.actionBtnTxt}>{u.is_suspended ? 'Unsuspend' : 'Suspend'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* VERIFICATION REQUESTS */}
        {tab === 'verify' && (
          <View>
            <Text style={S.sectionTitle}>Pending Verification Requests ({verRequests.length})</Text>
            {verRequests.length === 0 && (
              <Text style={S.emptyTxt}>No pending requests</Text>
            )}
            {verRequests.map(r => (
              <View key={r.id} style={S.verCard}>
                <View style={S.verInfo}>
                  <Text style={S.verUser}>@{r.username}</Text>
                  <Text style={S.verStats}>👥 {r.followers_count} followers · 👁 {r.total_views} views</Text>
                  <Text style={S.verReason}>{r.reason}</Text>
                </View>
                <View style={S.verActions}>
                  <TouchableOpacity style={S.approveBtn} onPress={() => approveVerification(r.id)}>
                    <Text style={S.approveTxt}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.rejectBtn} onPress={() => rejectVerification(r.id)}>
                    <Text style={S.rejectTxt}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && settings && (
          <View>
            <Text style={S.sectionTitle}>Platform Settings</Text>
            {[
              {
                key: 'verification_open',
                label: 'Verification Applications Open',
                desc: 'Allow users to apply for blue badge (requires 60 followers + 5000 views)',
              },
              {
                key: 'monetization_open',
                label: 'Monetization Open',
                desc: 'Allow creators to earn from ad views',
              },
              {
                key: 'registration_open',
                label: 'New Registrations Open',
                desc: 'Allow new users to sign up',
              },
            ].map(item => (
              <View key={item.key} style={S.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={S.settingLabel}>{item.label}</Text>
                  <Text style={S.settingDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={!!settings[item.key]}
                  onValueChange={val => toggleSetting(item.key, val)}
                  trackColor={{ false: '#333', true: '#fe2c55' }}
                  thumbColor={settings[item.key] ? '#fff' : '#888'}
                />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 52, borderBottomWidth: 0.5, borderBottomColor: '#1a1a1a' },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  tabs: { flexDirection: 'row', backgroundColor: '#111', borderBottomWidth: 0.5, borderBottomColor: '#222' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#fe2c55' },
  tabTxt: { color: '#555', fontSize: 11, fontWeight: '600' },
  tabTxtActive: { color: '#fff' },
  body: { flex: 1, padding: 16 },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 4 },
  statCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 10, gap: 14 },
  statIcon: { fontSize: 24 },
  statVal: { color: '#fff', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#666', fontSize: 12, marginTop: 2 },
  searchInput: { backgroundColor: '#111', borderRadius: 10, padding: 12, color: '#fff', marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  userCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 10 },
  userInfo: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center' },
  userAvatarLetter: { color: '#fff', fontWeight: '900', fontSize: 16 },
  userName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  userEmail: { color: '#666', fontSize: 12 },
  userBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { backgroundColor: '#1d9bf0', color: '#fff', fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeGold: { backgroundColor: '#b8860b' },
  badgeRed: { backgroundColor: '#8b0000' },
  userActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 8, alignItems: 'center' },
  actionBtnActive: { borderColor: '#ffd700', backgroundColor: 'rgba(255,215,0,0.1)' },
  actionBtnDanger: { borderColor: '#fe2c55', backgroundColor: 'rgba(254,44,85,0.1)' },
  actionBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  verCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 10 },
  verInfo: { marginBottom: 10 },
  verUser: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  verStats: { color: '#888', fontSize: 12, marginBottom: 6 },
  verReason: { color: '#aaa', fontSize: 13 },
  verActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, backgroundColor: '#1d9bf0', borderRadius: 8, padding: 10, alignItems: 'center' },
  approveTxt: { color: '#fff', fontWeight: '700' },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: '#555', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectTxt: { color: '#888', fontWeight: '700' },
  emptyTxt: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 15 },
  settingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 10, gap: 12 },
  settingLabel: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  settingDesc: { color: '#666', fontSize: 12 },
});
