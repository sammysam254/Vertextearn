import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const { width: W } = Dimensions.get('window');
const THUMB_W = (W - 4) / 3;

const MOCK_VIDEOS = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1, views: `${Math.floor(Math.random() * 100)}K`, is_ad: i % 7 === 0,
}));

const fmt = (n) => n >= 1000000 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('videos');
  const [showSettings, setShowSettings] = useState(false);
  const u = user || { username: 'you', followers_count: 1420, following_count: 380, likes_count: 24500, is_monetized: true, total_earnings: 48.60, balance: 23.40, bio: 'Creator on Vertext ✨' };

  const stats = [
    { label: 'Following', val: u.following_count || 380 },
    { label: 'Followers', val: u.followers_count || 1420 },
    { label: 'Likes', val: u.likes_count || 24500 },
  ];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerUsername}>@{u.username}</Text>
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Avatar + stats */}
        <View style={styles.profileTop}>
          <LinearGradient colors={['#fe2c55', '#6c3de0']} style={styles.avatar}>
            <Text style={styles.avatarLetter}>{u.username?.[0]?.toUpperCase()}</Text>
          </LinearGradient>
          <View style={styles.statsRow}>
            {stats.map(s => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statVal}>{fmt(s.val)}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.bio}>{u.bio || 'Vertext Creator ✨'}</Text>

        {/* Edit/share buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Monetization card */}
        {u.is_monetized && (
          <LinearGradient colors={['#1a0a0a', '#0d1a0a']} style={styles.monCard}>
            <View style={styles.monRow}>
              <View>
                <Text style={styles.monBadge}>💰 MONETIZED CREATOR</Text>
                <Text style={styles.monBalance}>KES {((u.balance || 23.40) * 130).toFixed(2)}</Text>
                <Text style={styles.monBalLabel}>Available</Text>
              </View>
              <View style={styles.monRight}>
                <Text style={styles.monTotal}>KES {((u.total_earnings || 48.60) * 130).toFixed(2)}</Text>
                <Text style={styles.monTotalLabel}>All Time</Text>
                <TouchableOpacity style={styles.monWithdraw}>
                  <Text style={styles.monWithdrawText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.monRate}>Your rate: 40% of ad revenue</Text>
          </LinearGradient>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {['videos', 'liked', 'saved'].map(t => (
            <TouchableOpacity key={t} style={styles.tabBtn} onPress={() => setTab(t)}>
              <Ionicons
                name={t === 'videos' ? 'grid' : t === 'liked' ? 'heart' : 'bookmark'}
                size={22} color={tab === t ? '#fff' : '#444'}
              />
              {tab === t && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Video grid */}
        <View style={styles.grid}>
          {MOCK_VIDEOS.map(v => (
            <View key={v.id} style={styles.gridItem}>
              <View style={[styles.thumb, { backgroundColor: `hsl(${v.id * 37},35%,12%)` }]}>
                <Text style={{ fontSize: 24 }}>🎬</Text>
              </View>
              {v.is_ad && <View style={styles.adTag}><Text style={styles.adTagText}>AD</Text></View>}
              <Text style={styles.thumbViews}>▶ {v.views}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Settings overlay */}
      {showSettings && (
        <View style={styles.settingsOverlay}>
          <TouchableOpacity style={styles.settingsBackdrop} onPress={() => setShowSettings(false)} activeOpacity={1} />
          <View style={styles.settingsSheet}>
            <View style={styles.settingsHandle} />
            <Text style={styles.settingsTitle}>Settings</Text>
            {[
              { icon: 'person-outline', label: 'Account Settings' },
              { icon: 'lock-closed-outline', label: 'Privacy & Safety' },
              { icon: 'notifications-outline', label: 'Notifications' },
              { icon: 'cash-outline', label: 'Earnings & Monetization' },
              { icon: 'help-circle-outline', label: 'Help & Support' },
            ].map(item => (
              <TouchableOpacity key={item.label} style={styles.settingsItem}>
                <Ionicons name={item.icon} size={20} color="#fff" />
                <Text style={styles.settingsItemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#555" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => { setShowSettings(false); logout(); }}
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  headerUsername: { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 20, marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 32, fontWeight: '900' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  bio: { color: '#aaa', fontSize: 14, paddingHorizontal: 20, marginBottom: 14 },
  btnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  editBtn: { flex: 1, borderWidth: 1.5, borderColor: '#333', borderRadius: 6, padding: 9, alignItems: 'center' },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  shareBtn: { borderWidth: 1.5, borderColor: '#333', borderRadius: 6, padding: 9, paddingHorizontal: 14 },
  monCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a1a0a' },
  monRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  monBadge: { color: '#ffd700', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  monBalance: { fontSize: 24, fontWeight: '900', color: '#fff' },
  monBalLabel: { color: '#888', fontSize: 11 },
  monRight: { alignItems: 'flex-end' },
  monTotal: { fontSize: 16, fontWeight: '700', color: '#ffd700' },
  monTotalLabel: { color: '#888', fontSize: 11 },
  monWithdraw: { marginTop: 6, backgroundColor: '#ffd700', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
  monWithdrawText: { color: '#000', fontWeight: '800', fontSize: 12 },
  monRate: { color: '#555', fontSize: 12 },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#222' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabUnderline: { position: 'absolute', bottom: 0, height: 2, width: 30, backgroundColor: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 },
  gridItem: { width: THUMB_W, height: THUMB_W * 1.4, position: 'relative' },
  thumb: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  adTag: { position: 'absolute', top: 4, left: 4, backgroundColor: '#fe2c55', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  adTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  thumbViews: { position: 'absolute', bottom: 4, left: 6, color: '#fff', fontSize: 11, fontWeight: '700' },
  settingsOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: 'flex-end' },
  settingsBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  settingsSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 40 },
  settingsHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  settingsTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#222' },
  settingsItemText: { flex: 1, color: '#fff', fontSize: 16 },
  logoutBtn: { marginTop: 20, borderWidth: 1.5, borderColor: '#fe2c55', borderRadius: 10, padding: 14, alignItems: 'center' },
  logoutText: { color: '#fe2c55', fontWeight: '800', fontSize: 16 },
});
