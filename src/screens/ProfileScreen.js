import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  TextInput, Image, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ route, navigation }) {
  const { user: authUser, apiFetch, logout, refreshUser, setUser } = useAuth();
  const targetUsername = route?.params?.username;
  const isOwn = !targetUsername || targetUsername === authUser?.username;
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(false);
  const [verifyReason, setVerifyReason] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [AdminPanelComp, setAdminPanelComp] = useState(null);

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const username = targetUsername || authUser?.username;
      if (!username) { setLoading(false); setRefreshing(false); return; }
      const data = await apiFetch('/profile/u/' + username + '/');
      setProfile(data.user);
      setVideos(data.videos || []);
      setBio(data.user?.bio || '');
      setFollowing(data.user?.is_followed || false);
    } catch (e) { console.log('Profile error:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [targetUsername, authUser?.username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const openAdmin = () => {
    try {
      const A = require('./AdminPanel').default;
      setAdminPanelComp(() => A);
      setShowAdmin(true);
    } catch (e) { Alert.alert('Error', 'Could not open admin panel: ' + e.message); }
  };

  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.7 });
      if (!result.canceled) {
        const fd = new FormData();
        fd.append('avatar', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'avatar.jpg' });
        const res = await apiFetch('/profile/update/', { method: 'PATCH', body: fd });
        const newAvatar = res?.avatar || res?.user?.avatar;
        if (newAvatar) {
          setProfile(p => ({ ...p, avatar: newAvatar }));
          setUser && setUser(u => u ? { ...u, avatar: newAvatar } : u);
          Alert.alert('Done', 'Avatar updated!');
        }
        await refreshUser();
      }
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiFetch('/profile/update/', { method: 'PATCH', body: JSON.stringify({ bio }) });
      setProfile(p => ({ ...p, bio }));
      setUser && setUser(u => u ? { ...u, bio } : u);
      setShowEdit(false);
      Alert.alert('Done', 'Profile updated!');
    } catch (e) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const toggleFollow = async () => {
    try {
      const res = await apiFetch('/profile/u/' + profile.username + '/follow/', { method: 'POST' });
      setFollowing(res.following);
      setProfile(p => ({ ...p, followers_count: res.following ? (p.followers_count||0)+1 : Math.max(0,(p.followers_count||0)-1) }));
    } catch {}
  };

  const submitVerification = async () => {
    if (!verifyReason.trim()) { Alert.alert('Error', 'Please provide a reason'); return; }
    setVerifyLoading(true);
    try {
      await apiFetch('/auth/apply-verification/', { method: 'POST', body: JSON.stringify({ reason: verifyReason }) });
      setShowVerify(false);
      Alert.alert('✅', 'Application submitted! Admin will review it.');
    } catch (e) { Alert.alert('Error', e.message); }
    setVerifyLoading(false);
  };

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color="#fe2c55" /></View>;

  if (!profile) return (
    <View style={S.center}>
      <Text style={{ color: '#666', fontSize: 16 }}>Profile not found</Text>
      <TouchableOpacity onPress={() => loadProfile()} style={{ marginTop: 16 }}>
        <Text style={{ color: '#fe2c55' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={S.root}>
      <ScrollView contentContainerStyle={S.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor="#fe2c55" />}>

        {/* Header */}
        <View style={S.header}>
          {!isOwn && navigation && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={S.headerUser}>@{profile.username}</Text>
          {isOwn && (
            <TouchableOpacity onPress={() => setShowSettings(true)}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar + Stats */}
        <View style={S.topRow}>
          <TouchableOpacity onPress={isOwn ? pickAvatar : null} style={S.avatarWrap}>
            {profile.avatar
              ? <Image source={{ uri: profile.avatar }} style={S.avatar} />
              : <LinearGradient colors={['#fe2c55','#6c3de0']} style={S.avatar}><Text style={S.avatarLetter}>{profile.username?.[0]?.toUpperCase()}</Text></LinearGradient>
            }
            {isOwn && <View style={S.camBadge}><Ionicons name="camera" size={11} color="#fff" /></View>}
          </TouchableOpacity>
          <View style={S.statsRow}>
            {[{l:'Videos',v:videos.length},{l:'Followers',v:profile.followers_count||0},{l:'Following',v:profile.following_count||0}].map(s => (
              <View key={s.l} style={S.stat}>
                <Text style={S.statV}>{s.v}</Text>
                <Text style={S.statL}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bio */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{profile.username}</Text>
            {profile.is_verified && (
              <View style={[S.badge, profile.verification_type==='blue' ? {backgroundColor:'#1d9bf0'} : {backgroundColor:'#555'}]}>
                <Text style={S.tick}>✓</Text>
              </View>
            )}
          </View>
          {!!profile.bio && <Text style={{ color: '#aaa', fontSize: 14, marginTop: 6 }}>{profile.bio}</Text>}
        </View>

        {/* Buttons */}
        {isOwn ? (
          <View>
            <View style={S.btnRow}>
              <TouchableOpacity style={S.editBtn} onPress={() => setShowEdit(true)}>
                <Text style={S.editTxt}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
            {authUser?.username === 'samson' && (
              <TouchableOpacity style={S.adminBtn} onPress={openAdmin}>
                <Ionicons name="settings" size={16} color="#000" />
                <Text style={S.adminTxt}>⚙️ Admin Panel</Text>
              </TouchableOpacity>
            )}
            {!profile.is_verified && (
              <TouchableOpacity style={S.verifyBtn} onPress={() => setShowVerify(true)}>
                <Text style={S.verifyTxt}>✓ Apply for Verification</Text>
              </TouchableOpacity>
            )}
            {profile.is_verified && (
              <View style={[S.verifyBtn, { backgroundColor: '#1d9bf0', borderColor: '#1d9bf0' }]}>
                <Text style={[S.verifyTxt, { color: '#fff' }]}>✓ Verified</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={S.btnRow}>
            <TouchableOpacity style={[S.followBtn, following && S.followingBtn]} onPress={toggleFollow}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{following ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Videos Grid */}
        <View style={S.grid}>
          {videos.map(v => (
            <View key={v.id} style={S.thumb}>
              {v.thumbnail_url
                ? <Image source={{ uri: v.thumbnail_url }} style={{ width:'100%', height:'100%' }} resizeMode="cover" />
                : <View style={{ flex:1, backgroundColor:'#111', justifyContent:'center', alignItems:'center' }}><Ionicons name="videocam-outline" size={24} color="#333" /></View>
              }
              <View style={S.viewBadge}>
                <Ionicons name="eye-outline" size={10} color="#fff" />
                <Text style={{ color:'#fff', fontSize:10, marginLeft:2 }}>{v.views_count}</Text>
              </View>
            </View>
          ))}
        </View>

        {isOwn && (
          <TouchableOpacity style={S.logoutBtn} onPress={() => Alert.alert('Log Out','Are you sure?',[{text:'Cancel'},{text:'Log Out',style:'destructive',onPress:logout}])}>
            <Text style={{ color:'#fe2c55', fontWeight:'800', fontSize:16 }}>Log Out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={S.overlay}>
          <View style={S.sheet}>
            <Text style={S.sheetTitle}>Edit Profile</Text>
            <TouchableOpacity style={S.avatarEditBtn} onPress={pickAvatar}>
              <Ionicons name="camera-outline" size={20} color="#fe2c55" />
              <Text style={{ color: '#fe2c55', marginLeft: 8, fontWeight: '600' }}>Change Profile Picture</Text>
            </TouchableOpacity>
            <Text style={S.fieldLabel}>Bio</Text>
            <TextInput style={S.input} value={bio} onChangeText={setBio} placeholder="Tell people about yourself..." placeholderTextColor="#555" multiline numberOfLines={3} />
            <TouchableOpacity style={S.saveBtn} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEdit(false)} style={{ padding:12, alignItems:'center' }}>
              <Text style={{ color:'#555' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={S.overlay}>
          <View style={S.sheet}>
            <Text style={S.sheetTitle}>Settings</Text>
            {[
              { icon: 'person-outline', label: 'Edit Profile', action: () => { setShowSettings(false); setShowEdit(true); } },
              { icon: 'lock-closed-outline', label: 'Privacy & Safety', action: () => Alert.alert('Privacy', 'Your videos are private by default unless set to Public when uploading.') },
              { icon: 'notifications-outline', label: 'Notifications', action: () => Alert.alert('Notifications', 'You receive notifications for likes, comments and follows.') },
              { icon: 'cash-outline', label: 'Earnings & Monetization', action: () => { setShowSettings(false); navigation?.navigate('Earnings'); } },
              { icon: 'shield-checkmark-outline', label: 'Verification', action: () => { setShowSettings(false); setShowVerify(true); } },
              { icon: 'help-circle-outline', label: 'Help & Support', action: () => Alert.alert('Support', 'Email us at support@vertext.app') },
              { icon: 'log-out-outline', label: 'Log Out', action: () => { setShowSettings(false); Alert.alert('Log Out','Are you sure?',[{text:'Cancel'},{text:'Log Out',style:'destructive',onPress:logout}]); }, danger: true },
            ].map(item => (
              <TouchableOpacity key={item.label} style={S.settingItem} onPress={item.action}>
                <Ionicons name={item.icon} size={22} color={item.danger ? '#fe2c55' : '#fff'} />
                <Text style={[S.settingLabel, item.danger && { color: '#fe2c55' }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#444" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowSettings(false)} style={{ padding:14, alignItems:'center' }}>
              <Text style={{ color:'#555' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Verification Modal */}
      <Modal visible={showVerify} transparent animationType="slide">
        <View style={S.overlay}>
          <View style={S.sheet}>
            <Text style={S.sheetTitle}>Apply for Blue Badge ✓</Text>
            <Text style={{ color: '#888', fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
              You need at least 60 followers and 5,000 total views to qualify. Admin will review your application.
            </Text>
            <Text style={S.fieldLabel}>Why do you deserve verification?</Text>
            <TextInput style={S.input} value={verifyReason} onChangeText={setVerifyReason} placeholder="Tell us about yourself and your content..." placeholderTextColor="#555" multiline numberOfLines={4} />
            <TouchableOpacity style={S.saveBtn} onPress={submitVerification} disabled={verifyLoading}>
              {verifyLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>Submit Application</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowVerify(false)} style={{ padding:12, alignItems:'center' }}>
              <Text style={{ color:'#555' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin Panel */}
      {showAdmin && AdminPanelComp && (
        <View style={StyleSheet.absoluteFillObject}>
          <AdminPanelComp onClose={() => setShowAdmin(false)} />
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root:{ flex:1, backgroundColor:'#0a0a0a' },
  center:{ flex:1, backgroundColor:'#0a0a0a', justifyContent:'center', alignItems:'center' },
  scroll:{ paddingBottom:80 },
  header:{ flexDirection:'row', alignItems:'center', padding:16, paddingTop:52 },
  headerUser:{ flex:1, fontSize:17, fontWeight:'800', color:'#fff' },
  topRow:{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingBottom:16, gap:20 },
  avatarWrap:{ position:'relative' },
  avatar:{ width:82, height:82, borderRadius:41, justifyContent:'center', alignItems:'center' },
  avatarLetter:{ color:'#fff', fontSize:34, fontWeight:'900' },
  camBadge:{ position:'absolute', bottom:0, right:0, backgroundColor:'#fe2c55', borderRadius:10, padding:4 },
  statsRow:{ flex:1, flexDirection:'row', justifyContent:'space-around' },
  stat:{ alignItems:'center' },
  statV:{ color:'#fff', fontSize:18, fontWeight:'800' },
  statL:{ color:'#888', fontSize:12, marginTop:2 },
  badge:{ width:18, height:18, borderRadius:9, justifyContent:'center', alignItems:'center' },
  tick:{ color:'#fff', fontSize:10, fontWeight:'900' },
  btnRow:{ flexDirection:'row', paddingHorizontal:20, gap:10, marginBottom:10 },
  editBtn:{ flex:1, borderWidth:1, borderColor:'#333', borderRadius:8, padding:10, alignItems:'center' },
  editTxt:{ color:'#fff', fontWeight:'700' },
  adminBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:'#ffd700', borderRadius:8, padding:10, marginHorizontal:20, marginBottom:10 },
  adminTxt:{ color:'#000', fontWeight:'800', fontSize:14 },
  verifyBtn:{ marginHorizontal:20, marginBottom:10, borderWidth:1, borderColor:'#1d9bf0', borderRadius:8, padding:10, alignItems:'center' },
  verifyTxt:{ color:'#1d9bf0', fontWeight:'700', fontSize:14 },
  followBtn:{ flex:1, backgroundColor:'#fe2c55', borderRadius:8, padding:10, alignItems:'center' },
  followingBtn:{ backgroundColor:'transparent', borderWidth:1, borderColor:'#333' },
  grid:{ flexDirection:'row', flexWrap:'wrap' },
  thumb:{ width:'33.33%', aspectRatio:0.75, borderWidth:0.5, borderColor:'#000', overflow:'hidden', position:'relative' },
  viewBadge:{ position:'absolute', bottom:4, left:4, flexDirection:'row', alignItems:'center' },
  logoutBtn:{ margin:20, borderWidth:1, borderColor:'#2a0a0a', borderRadius:12, padding:14, alignItems:'center' },
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.85)', justifyContent:'flex-end' },
  sheet:{ backgroundColor:'#111', borderTopLeftRadius:20, borderTopRightRadius:20, padding:24, paddingBottom:40, maxHeight:'85%' },
  sheetTitle:{ color:'#fff', fontSize:18, fontWeight:'800', marginBottom:20, textAlign:'center' },
  avatarEditBtn:{ flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'#1a1a1a', borderRadius:10, padding:12, marginBottom:16 },
  fieldLabel:{ color:'#888', fontSize:12, marginBottom:6 },
  input:{ backgroundColor:'#1a1a1a', borderRadius:10, padding:12, color:'#fff', borderWidth:1, borderColor:'#2a2a2a', marginBottom:16, minHeight:80 },
  saveBtn:{ backgroundColor:'#fe2c55', borderRadius:12, padding:16, alignItems:'center', marginBottom:10 },
  settingItem:{ flexDirection:'row', alignItems:'center', paddingVertical:14, borderBottomWidth:0.5, borderBottomColor:'#1a1a1a', gap:14 },
  settingLabel:{ flex:1, color:'#fff', fontSize:15 },
});
