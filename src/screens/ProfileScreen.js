import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Alert, ActivityIndicator,
  TextInput, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import AdminPanel from './AdminPanel';

const { width: W } = Dimensions.get('window');
const THUMB_W = (W - 4) / 3;

const fmt = (n) => !n ? '0' : n >= 1000000 ? `${(n/1e6).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : `${n}`;

export default function ProfileScreen({ route, navigation }) {
  const { user: authUser, logout, apiFetch, refreshUser, API_URL, isDemo, guardDemo, setUser } = useAuth();
  const targetUsername = route?.params?.username;
  const isOwn = !targetUsername || targetUsername === authUser?.username;

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [tab, setTab] = useState('videos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyReason, setVerifyReason] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const username = targetUsername || authUser?.username;
      const data = await apiFetch(`/profile/u/${username}/`);
      setProfile(data.user);
      setVideos(data.videos || []);
      setBio(data.user?.bio || '');
    } catch (e) {
      Alert.alert('Error', 'Could not load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetUsername, authUser?.username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const toggleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      await apiFetch(`/profile/u/${profile.username}/follow/`, { method: 'POST' });
      setFollowing(f => !f);
      setProfile(p => ({
        ...p,
        followers_count: following ? p.followers_count - 1 : p.followers_count + 1
      }));
    } catch {}
    setFollowLoading(false);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiFetch('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ bio }),
      });
      await refreshUser();
      setShowEditProfile(false);
      Alert.alert('✅', 'Profile updated!');
    } catch {
      Alert.alert('Error', 'Could not save profile');
    }
    setSavingProfile(false);
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) {
      const formData = new FormData();
      formData.append('avatar', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'avatar.jpg' });
      try {
        const token = await apiFetch._getToken?.() || '';
        await fetch(`${API_URL}/auth/me/`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        await refreshUser();
        Alert.alert('✅', 'Avatar updated!');
      } catch { Alert.alert('Error', 'Could not update avatar'); }
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          setLogoutLoading(true);
          await logout();
        }
      }
    ]);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#fe2c55" />
    </View>
  );

  if (!profile) return (
    <View style={styles.center}>
      <Text style={{ color: '#666' }}>Profile not found</Text>
    </View>
  );

  const displayUser = isOwn ? (authUser || profile) : profile;
  const currentVideos = tab === 'videos' ? videos : tab === 'liked' ? likedVideos : savedVideos;

  return (
    <View style={styles.root}>
      {isDemo && isDemo() && (
        <View style={styles.demoBanner}>
          <Text style={styles.demaBannerText}>👀 Demo Mode — Sign up to unlock all features</Text>
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor="#fe2c55" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerUsername}>@{displayUser.username}</Text>
          {isOwn && (
            <TouchableOpacity onPress={() => setShowSettings(true)}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar + stats */}
        <View style={styles.profileTop}>
          <TouchableOpacity onPress={isOwn ? pickAvatar : undefined} style={styles.avatarWrap}>
            {displayUser.avatar
              ? <Image source={{ uri: displayUser.avatar }} style={styles.avatar} />
              : (
                <LinearGradient colors={['#fe2c55', '#6c3de0']} style={styles.avatar}>
                  <Text style={styles.avatarLetter}>{displayUser.username?.[0]?.toUpperCase()}</Text>
                </LinearGradient>
              )
            }
            {isOwn && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.statsRow}>
            {[
              { label: 'Following', val: displayUser.following_count },
              { label: 'Followers', val: displayUser.followers_count },
              { label: 'Likes', val: displayUser.likes_count },
            ].map(s => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statVal}>{fmt(s.val)}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.bio}>{displayUser.bio || 'No bio yet'}</Text>

        {/* Buttons */}
        {isOwn ? (
          <View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.editBtn} onPress={() => { if (guardDemo('edit your profile')) return; setShowEditProfile(true); }}>
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn}>
                <Ionicons name="share-social-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {authUser?.username === 'samson' && (
              <TouchableOpacity style={styles.adminBtn} onPress={() => setShowAdmin(true)}>
                <Ionicons name="settings" size={16} color="#000" />
                <Text style={styles.adminBtnText}>⚙️ Admin Panel</Text>
              </TouchableOpacity>
            )}
            {!displayUser.is_verified && (
              <TouchableOpacity style={styles.verifyBtn} onPress={() => setShowVerifyModal(true)}>
                <Text style={styles.verifyBtnText}>✓ Apply for Verification</Text>
              </TouchableOpacity>
            )}
            {displayUser.is_verified && (
              <View style={[styles.verifyBtn, { backgroundColor: '#1d9bf0' }]}>
                <Text style={styles.verifyBtnText}>✓ Verified</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followingBtn]}
              onPress={toggleFollow}
              disabled={followLoading}
            >
              {followLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.followBtnText}>{following ? 'Following' : 'Follow'}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.msgBtn}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Monetization card */}
        {isOwn && displayUser.is_monetized && (
          <LinearGradient colors={['#1a0a0a', '#0d1a0a']} style={styles.monCard}>
            <View style={styles.monRow}>
              <View>
                <Text style={styles.monBadge}>💰 MONETIZED CREATOR</Text>
                <Text style={styles.monBalance}>KES {((displayUser.balance || 0) * 130).toFixed(2)}</Text>
                <Text style={styles.monBalLabel}>Available Balance</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.monTotal}>KES {((displayUser.total_earnings || 0) * 130).toFixed(2)}</Text>
                <Text style={{ color: '#888', fontSize: 11 }}>All Time</Text>
                <TouchableOpacity style={styles.monWithdraw}>
                  <Text style={styles.monWithdrawText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Your rate: 40% of ad revenue</Text>
          </LinearGradient>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: 'videos', icon: 'grid' },
            { key: 'liked', icon: 'heart' },
            { key: 'saved', icon: 'bookmark' },
          ].map(t => (
            <TouchableOpacity key={t.key} style={styles.tabBtn} onPress={() => setTab(t.key)}>
              <Ionicons name={t.icon} size={22} color={tab === t.key ? '#fff' : '#444'} />
              {tab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Video Grid */}
        {currentVideos.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="videocam-outline" size={48} color="#333" />
            <Text style={{ color: '#444', marginTop: 12 }}>No videos here yet</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {currentVideos.map(v => (
              <View key={v.id} style={styles.gridItem}>
                <View style={[styles.thumb, { backgroundColor: '#111' }]}>
                  {v.thumbnail
                    ? <Image source={{ uri: v.thumbnail }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    : <Ionicons name="videocam" size={28} color="#333" />
                  }
                </View>
                <Text style={styles.thumbViews}>▶ {fmt(v.views_count)}</Text>
                {v.is_ad && (
                  <View style={styles.adTag}><Text style={styles.adTagText}>AD</Text></View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={styles.fieldInput}
              value={bio}
              onChangeText={setBio}
              placeholder="Write something about yourself..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={savingProfile}>
              {savingProfile
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditProfile(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSettings(false)} activeOpacity={1} />
          <View style={styles.settingsSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Settings</Text>
            {[
              { icon: 'person-outline', label: 'Edit Profile', action: () => { setShowSettings(false); setShowEditProfile(true); } },
              { icon: 'camera-outline', label: 'Change Avatar', action: () => { setShowSettings(false); pickAvatar(); } },
              { icon: 'lock-closed-outline', label: 'Privacy & Safety', action: () => Alert.alert('Privacy', 'Your videos are private by default unless you set them to Public when uploading.') },
              { icon: 'notifications-outline', label: 'Notifications', action: () => Alert.alert('Notifications', 'You receive notifications for new likes, comments and follows.') },
              { icon: 'cash-outline', label: 'Earnings & Monetization', action: () => { setShowSettings(false); navigation?.navigate('Earnings'); } },
              { icon: 'help-circle-outline', label: 'Help & Support', action: () => Alert.alert('Email: sammyseth260@gmail.com') },
            ].map(item => (
              <TouchableOpacity key={item.label} style={styles.settingsItem} onPress={item.action}>
                <Ionicons name={item.icon} size={20} color="#fff" />
                <Text style={styles.settingsItemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#555" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={logoutLoading}>
              {logoutLoading
                ? <ActivityIndicator color="#fe2c55" />
                : <Text style={styles.logoutText}>Log Out</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Admin Panel */}
      {showAdmin && (
        <View style={StyleSheet.absoluteFillObject} >
          <AdminPanel onClose={() => setShowAdmin(false)} />
        </View>
      )}

      {/* Verification Apply Modal */}
      {showVerifyModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Apply for Blue Badge ✓</Text>
            <Text style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
              You need at least 60 followers and 5,000 total views to qualify.
            </Text>
            <Text style={styles.fieldLabel}>Why do you deserve verification?</Text>
            <TextInput
              style={styles.fieldInput}
              value={verifyReason}
              onChangeText={setVerifyReason}
              placeholder="Tell us about yourself and your content..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={styles.saveBtn}
              disabled={verifyLoading}
              onPress={async () => {
                setVerifyLoading(true);
                try {
                  await apiFetch('/auth/apply-verification/', {
                    method: 'POST',
                    body: JSON.stringify({ reason: verifyReason }),
                  });
                  setShowVerifyModal(false);
                  Alert.alert('✅', 'Application submitted! Admin will review it.');
                } catch (e) {
                  Alert.alert('Error', e.message);
                }
                setVerifyLoading(false);
              }}
            >
              {verifyLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Submit Application</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowVerifyModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  headerUsername: { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 20, marginBottom: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 82, height: 82, borderRadius: 41, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 34, fontWeight: '900' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fe2c55', borderRadius: 10, padding: 4 },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  bio: { color: '#aaa', fontSize: 14, paddingHorizontal: 20, marginBottom: 14 },
  btnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  editBtn: { flex: 1, borderWidth: 1.5, borderColor: '#333', borderRadius: 6, padding: 10, alignItems: 'center' },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  shareBtn: { borderWidth: 1.5, borderColor: '#333', borderRadius: 6, padding: 10, paddingHorizontal: 14 },
  followBtn: { flex: 1, backgroundColor: '#fe2c55', borderRadius: 6, padding: 10, alignItems: 'center' },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#555' },
  followBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  msgBtn: { flex: 1, borderWidth: 1.5, borderColor: '#333', borderRadius: 6, padding: 10, alignItems: 'center' },
  monCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a1a0a' },
  monRow: { flexDirection: 'row', justifyContent: 'space-between' },
  monBadge: { color: '#ffd700', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  monBalance: { fontSize: 24, fontWeight: '900', color: '#fff' },
  monBalLabel: { color: '#888', fontSize: 11 },
  monTotal: { fontSize: 16, fontWeight: '700', color: '#ffd700' },
  monWithdraw: { marginTop: 6, backgroundColor: '#ffd700', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
  monWithdrawText: { color: '#000', fontWeight: '800', fontSize: 12 },
  tabs: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#222' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabUnderline: { position: 'absolute', bottom: 0, height: 2, width: 30, backgroundColor: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 },
  gridItem: { width: THUMB_W, height: THUMB_W * 1.4, position: 'relative', overflow: 'hidden' },
  thumb: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  adTag: { position: 'absolute', top: 4, left: 4, backgroundColor: '#fe2c55', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  adTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  thumbViews: { position: 'absolute', bottom: 4, left: 6, color: '#fff', fontSize: 11, fontWeight: '700' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40 },
  settingsSheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 50 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 20 },
  fieldLabel: { color: '#888', fontSize: 13, marginBottom: 6 },
  fieldInput: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14, textAlignVertical: 'top', marginBottom: 16 },
  saveBtn: { backgroundColor: '#fe2c55', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 15 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#1a1a1a' },
  settingsItemText: { flex: 1, color: '#fff', fontSize: 16 },
  logoutBtn: { marginTop: 20, borderWidth: 1.5, borderColor: '#fe2c55', borderRadius: 10, padding: 14, alignItems: 'center' },
  badgeWrap: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  badgeBlue: { backgroundColor: '#1d9bf0' },
  badgeBlack: { backgroundColor: '#333', borderWidth: 1, borderColor: '#888' },
  badgeTick: { color: '#fff', fontSize: 11, fontWeight: '900' },
  logoutText: { color: '#fe2c55', fontWeight: '800', fontSize: 16 },
  demoBanner: { backgroundColor: '#1a0a00', borderBottomWidth: 1, borderBottomColor: '#fe2c55', paddingVertical: 8, paddingHorizontal: 16 },
  demaBannerText: { color: '#fe2c55', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffd700', borderRadius: 8, padding: 10, marginHorizontal: 20, marginBottom: 10, justifyContent: 'center' },
  adminBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  verifyBtn: { backgroundColor: '#1a1a3a', borderWidth: 1, borderColor: '#1d9bf0', borderRadius: 8, padding: 10, marginHorizontal: 20, marginBottom: 10, alignItems: 'center' },
  verifyBtnText: { color: '#1d9bf0', fontWeight: '700', fontSize: 14 },
});
