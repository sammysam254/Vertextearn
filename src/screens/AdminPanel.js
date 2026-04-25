import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Switch,
  RefreshControl, TextInput, Modal,
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
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdModal, setShowAdModal] = useState(false);
  const [adForm, setAdForm] = useState({ title: '', platform: 'monetag', ad_url: '', revenue_per_view: '0.0001', show_frequency: '7' });
  const [adLoading, setAdLoading] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [s, u, v, cfg, a] = await Promise.all([
        apiFetch('/admin/stats/'),
        apiFetch('/admin/users/'),
        apiFetch('/admin/verification-requests/'),
        apiFetch('/admin/settings/'),
        apiFetch('/admin/ads/'),
      ]);
      setStats(s); setUsers(u); setVerRequests(v); setSettings(cfg); setAds(a);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
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

  const manualVerify = async (userId, currentVerified) => {
    try {
      await apiFetch(`/admin/users/${userId}/verify/`, {
        method: 'POST',
        body: JSON.stringify({ verified: !currentVerified }),
      });
      setUsers(u => u.map(usr => usr.id === userId
        ? { ...usr, is_verified: !currentVerified, verification_type: !currentVerified ? 'blue' : 'none' }
        : usr
      ));
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

  const createAd = async () => {
    setAdLoading(true);
    try {
      const newAd = await apiFetch('/admin/ads/', {
        method: 'POST',
        body: JSON.stringify({
          ...adForm,
          revenue_per_view: parseFloat(adForm.revenue_per_view) || 0.0001,
          show_frequency: parseInt(adForm.show_frequency) || 7,
        }),
      });
      setAds(a => [newAd, ...a]);
      setShowAdModal(false);
      setAdForm({ title: '', platform: 'monetag', ad_url: '', revenue_per_view: '0.0001', show_frequency: '7' });
      Alert.alert('✅', 'Ad created!');
    } catch (e) { Alert.alert('Error', e.message); }
    setAdLoading(false);
  };

  const toggleAd = async (id, active) => {
    try {
      await apiFetch(`/admin/ads/${id}/toggle/`, { method: 'POST', body: JSON.stringify({ is_active: !active }) });
      setAds(a => a.map(ad => ad.id === id ? { ...ad, is_active: !active } : ad));
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const deleteAd = async (id) => {
    Alert.alert('Delete Ad', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/admin/ads/${id}/delete/`, { method: 'DELETE' });
          setAds(a => a.filter(ad => ad.id !== id));
        } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  if (loading) return (
    <View style={S.center}><ActivityIndicator size="large" color="#fe2c55" /></View>
  );

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={S.root}>
      <View style={S.header}>
        <TouchableOpacity onPress={onClose} style={S.closeBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>⚙️ Admin Panel</Text>
        <TouchableOpacity onPress={() => load(true)}>
          <Ionicons name="refresh" size={22} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={S.tabs}>
        {[
          { key: 'dashboard', icon: '📊' },
          { key: 'users', icon: '👥' },
          { key: 'verify', icon: '✓' },
          { key: 'ads', icon: '📢' },
          { key: 'settings', icon: '⚙️' },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[S.tab, tab === t.key && S.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[S.tabTxt, tab === t.key && S.tabTxtActive]}>{t.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={S.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#fe2c55" />}>

        {/* DASHBOARD */}
        {tab === 'dashboard' && stats && (
          <View>
            <Text style={S.sectionTitle}>PLATFORM OVERVIEW</Text>
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
            <TextInput style={S.searchInput} placeholder="Search users..." placeholderTextColor="#555" value={search} onChangeText={setSearch} />
            {filteredUsers.map(u => (
              <View key={u.id} style={S.userCard}>
                <View style={S.userTop}>
                  <View style={S.userAvatar}>
                    <Text style={S.userAvatarLetter}>{u.username?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={S.userName}>@{u.username}</Text>
                      {u.is_verified && (
                        <View style={[S.badgeWrap, u.verification_type === 'blue' ? S.badgeBlue : S.badgeBlack]}>
                          <Text style={S.badgeTick}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={S.userEmail}>{u.email}</Text>
                    <Text style={S.userStats}>👥 {u.followers_count || 0} · 💰 {u.is_monetized ? 'Monetized' : 'Not monetized'}</Text>
                  </View>
                </View>
                <View style={S.userActions}>
                  <TouchableOpacity style={[S.actionBtn, u.is_verified && S.actionBtnBlue]} onPress={() => manualVerify(u.id, u.is_verified)}>
                    <Text style={S.actionBtnTxt}>{u.is_verified ? '✓ Verified' : 'Verify'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.actionBtn, u.is_monetized && S.actionBtnGold]} onPress={() => toggleMonetize(u.id, u.is_monetized)}>
                    <Text style={S.actionBtnTxt}>{u.is_monetized ? 'Demonetize' : 'Monetize'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.actionBtn, u.is_suspended && S.actionBtnDanger]} onPress={() => toggleUserSuspend(u.id, u.is_suspended)}>
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
            <Text style={S.sectionTitle}>PENDING REQUESTS ({verRequests.length})</Text>
            {verRequests.length === 0 && <Text style={S.emptyTxt}>No pending requests</Text>}
            {verRequests.map(r => (
              <View key={r.id} style={S.verCard}>
                <Text style={S.verUser}>@{r.username}</Text>
                <Text style={S.verStats}>👥 {r.followers_count} followers · 👁 {r.total_views} views</Text>
                <Text style={S.verReason}>{r.reason}</Text>
                <View style={S.verActions}>
                  <TouchableOpacity style={S.approveBtn} onPress={() => approveVerification(r.id)}>
                    <Text style={S.approveTxt}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.rejectBtn} onPress={() => rejectVerification(r.id)}>
                    <Text style={S.rejectTxt}>✗ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ADS MANAGEMENT */}
        {tab === 'ads' && (
          <View>
            <View style={S.adsHeader}>
              <Text style={S.sectionTitle}>AD LINKS ({ads.length})</Text>
              <TouchableOpacity style={S.addAdBtn} onPress={() => setShowAdModal(true)}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={S.addAdTxt}>Add Ad</Text>
              </TouchableOpacity>
            </View>
            {ads.length === 0 && <Text style={S.emptyTxt}>No ads yet. Add one to start earning!</Text>}
            {ads.map(ad => (
              <View key={ad.id} style={S.adCard}>
                <View style={S.adTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.adTitle}>{ad.title}</Text>
                    <Text style={S.adMeta}>{ad.platform} · ${ad.revenue_per_view}/view · every {ad.show_frequency} videos</Text>
                    {ad.ad_url ? <Text style={S.adUrl} numberOfLines={1}>{ad.ad_url}</Text> : null}
                  </View>
                  <Switch
                    value={ad.is_active}
                    onValueChange={() => toggleAd(ad.id, ad.is_active)}
                    trackColor={{ false: '#333', true: '#fe2c55' }}
                    thumbColor="#fff"
                  />
                </View>
                <TouchableOpacity style={S.deleteAdBtn} onPress={() => deleteAd(ad.id)}>
                  <Ionicons name="trash-outline" size={14} color="#ff4444" />
                  <Text style={S.deleteAdTxt}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && settings && (
          <View>
            <Text style={S.sectionTitle}>PLATFORM SETTINGS</Text>
            {[
              { key: 'verification_open', label: 'Verification Applications Open', desc: 'Allow users to apply (60 followers + 5000 views required)' },
              { key: 'monetization_open', label: 'Monetization Open', desc: 'Allow creators to earn from ad views' },
              { key: 'registration_open', label: 'New Registrations Open', desc: 'Allow new users to sign up' },
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

      {/* Add Ad Modal */}
      <Modal visible={showAdModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.modalBox}>
            <Text style={S.modalTitle}>➕ Add New Ad</Text>
            {[
              { key: 'title', placeholder: 'Ad title (e.g. Vertext Feed Ad)' },
              { key: 'ad_url', placeholder: 'Ad URL (optional)' },
              { key: 'revenue_per_view', placeholder: 'Revenue per view (e.g. 0.0001)', keyboardType: 'numeric' },
              { key: 'show_frequency', placeholder: 'Show every N videos (e.g. 7)', keyboardType: 'numeric' },
            ].map(f => (
              <TextInput
                key={f.key}
                style={S.modalInput}
                placeholder={f.placeholder}
                placeholderTextColor="#555"
                value={adForm[f.key]}
                onChangeText={v => setAdForm(fm => ({ ...fm, [f.key]: v }))}
                keyboardType={f.keyboardType || 'default'}
              />
            ))}
            <Text style={S.fieldLabel}>Platform</Text>
            <View style={S.platformRow}>
              {['monetag', 'adsense', 'custom'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[S.platformBtn, adForm.platform === p && S.platformBtnActive]}
                  onPress={() => setAdForm(fm => ({ ...fm, platform: p }))}
                >
                  <Text style={[S.platformBtnTxt, adForm.platform === p && { color: '#fff' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={S.createAdBtn} onPress={createAd} disabled={adLoading}>
              {adLoading ? <ActivityIndicator color="#fff" /> : <Text style={S.createAdTxt}>Create Ad</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={S.cancelBtn} onPress={() => setShowAdModal(false)}>
              <Text style={S.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  tabTxt: { color: '#555', fontSize: 18 },
  tabTxtActive: { color: '#fff' },
  body: { flex: 1, padding: 16 },
  sectionTitle: { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 4 },
  statCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 10, gap: 14 },
  statIcon: { fontSize: 24 },
  statVal: { color: '#fff', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#666', fontSize: 12, marginTop: 2 },
  searchInput: { backgroundColor: '#111', borderRadius: 10, padding: 12, color: '#fff', marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  userCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 10 },
  userTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center' },
  userAvatarLetter: { color: '#fff', fontWeight: '900', fontSize: 16 },
  userName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  userEmail: { color: '#666', fontSize: 12 },
  userStats: { color: '#555', fontSize: 11, marginTop: 2 },
  badgeWrap: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  badgeBlue: { backgroundColor: '#1d9bf0' },
  badgeBlack: { backgroundColor: '#555' },
  badgeTick: { color: '#fff', fontSize: 9, fontWeight: '900' },
  userActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 8, alignItems: 'center' },
  actionBtnBlue: { borderColor: '#1d9bf0', backgroundColor: 'rgba(29,155,240,0.15)' },
  actionBtnGold: { borderColor: '#ffd700', backgroundColor: 'rgba(255,215,0,0.1)' },
  actionBtnDanger: { borderColor: '#fe2c55', backgroundColor: 'rgba(254,44,85,0.1)' },
  actionBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  verCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 10 },
  verUser: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  verStats: { color: '#888', fontSize: 12, marginBottom: 6 },
  verReason: { color: '#aaa', fontSize: 13, marginBottom: 10 },
  verActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, backgroundColor: '#1d9bf0', borderRadius: 8, padding: 10, alignItems: 'center' },
  approveTxt: { color: '#fff', fontWeight: '700' },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: '#555', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectTxt: { color: '#888', fontWeight: '700' },
  emptyTxt: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 15 },
  adsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addAdBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fe2c55', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, gap: 4 },
  addAdTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  adCard: { backgroundColor: '#111', borderRadius: 12, padding: 14, marginBottom: 10 },
  adTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  adTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 3 },
  adMeta: { color: '#888', fontSize: 12 },
  adUrl: { color: '#555', fontSize: 11, marginTop: 2 },
  deleteAdBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteAdTxt: { color: '#ff4444', fontSize: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 10, gap: 12 },
  settingLabel: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  settingDesc: { color: '#666', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalInput: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, color: '#fff', marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a' },
  fieldLabel: { color: '#888', fontSize: 12, marginBottom: 8 },
  platformRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  platformBtn: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 10, alignItems: 'center' },
  platformBtnActive: { backgroundColor: '#fe2c55', borderColor: '#fe2c55' },
  platformBtnTxt: { color: '#888', fontWeight: '600' },
  createAdBtn: { backgroundColor: '#fe2c55', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  createAdTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { padding: 12, alignItems: 'center' },
  cancelTxt: { color: '#555', fontSize: 14 },
});
