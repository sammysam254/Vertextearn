import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  TextInput, Image, RefreshControl,
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
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(false);

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const username = targetUsername || authUser?.username;
      if (!username) return;
      const data = await apiFetch('/profile/u/' + username + '/');
      setProfile(data.user);
      setVideos(data.videos || []);
      setBio(data.user?.bio || '');
      setFollowing(data.user?.is_followed || false);
    } catch (e) { console.log('Profile load error:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [targetUsername, authUser?.username]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

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
        if (newAvatar) { setProfile(p => ({ ...p, avatar: newAvatar })); setUser && setUser(u => u ? { ...u, avatar: newAvatar } : u); }
        await refreshUser();
        Alert.alert('Done', 'Avatar updated!');
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
    } catch (e) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const toggleFollow = async () => {
    try {
      const res = await apiFetch('/profile/u/' + profile.username + '/follow/', { method: 'POST' });
      setFollowing(res.following);
    } catch {}
  };

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color="#fe2c55" /></View>;
  if (!profile) return <View style={S.center}><Text style={{ color: '#666' }}>Profile not found</Text><TouchableOpacity onPress={loadProfile} style={{ marginTop: 16 }}><Text style={{ color: '#fe2c55' }}>Retry</Text></TouchableOpacity></View>;

  return (
    <View style={S.root}>
      <ScrollView contentContainerStyle={S.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor="#fe2c55" />}>
        <View style={S.header}>
          {!isOwn && navigation && <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>}
          <Text style={S.headerUser}>@{profile.username}</Text>
          {isOwn && <TouchableOpacity onPress={() => setShowEdit(true)}><Ionicons name="settings-outline" size={24} color="#fff" /></TouchableOpacity>}
        </View>

        <View style={S.topRow}>
          <TouchableOpacity onPress={isOwn ? pickAvatar : null} style={S.avatarWrap}>
            {profile.avatar ? <Image source={{ uri: profile.avatar }} style={S.avatar} /> : <LinearGradient colors={['#fe2c55','#6c3de0']} style={S.avatar}><Text style={S.avatarLetter}>{profile.username?.[0]?.toUpperCase()}</Text></LinearGradient>}
            {isOwn && <View style={S.camBadge}><Ionicons name="camera" size={11} color="#fff" /></View>}
          </TouchableOpacity>
          <View style={S.statsRow}>
            {[{l:'Videos',v:videos.length},{l:'Followers',v:profile.followers_count||0},{l:'Following',v:profile.following_count||0}].map(s => (
              <View key={s.l} style={S.stat}><Text style={S.statV}>{s.v}</Text><Text style={S.statL}>{s.l}</Text></View>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{profile.username}</Text>
            {profile.is_verified && <View style={[S.badge, profile.verification_type==='blue' ? {backgroundColor:'#1d9bf0'} : {backgroundColor:'#555'}]}><Text style={S.tick}>✓</Text></View>}
          </View>
          {!!profile.bio && <Text style={{ color: '#aaa', fontSize: 14, marginTop: 6 }}>{profile.bio}</Text>}
        </View>

        {isOwn ? (
          <View style={S.btnRow}>
            <TouchableOpacity style={S.editBtn} onPress={() => setShowEdit(true)}><Text style={S.editTxt}>Edit Profile</Text></TouchableOpacity>
            {authUser?.username === 'samson' && <TouchableOpacity style={S.adminBtn} onPress={() => { try { const A = require('./AdminPanel').default; } catch(e){} Alert.alert('Admin','Use web panel for now'); }}><Text style={S.adminTxt}>⚙️ Admin</Text></TouchableOpacity>}
          </View>
        ) : (
          <View style={S.btnRow}>
            <TouchableOpacity style={[S.followBtn, following && S.followingBtn]} onPress={toggleFollow}><Text style={{ color: '#fff', fontWeight: '700' }}>{following ? 'Following' : 'Follow'}</Text></TouchableOpacity>
          </View>
        )}

        <View style={S.grid}>
          {videos.map(v => (
            <View key={v.id} style={S.thumb}>
              {v.thumbnail_url ? <Image source={{ uri: v.thumbnail_url }} style={{ width:'100%', height:'100%' }} resizeMode="cover" /> : <View style={{ flex:1, backgroundColor:'#111', justifyContent:'center', alignItems:'center' }}><Ionicons name="videocam-outline" size={24} color="#333" /></View>}
              <View style={S.viewBadge}><Text style={{ color:'#fff', fontSize:10 }}>{v.views_count}</Text></View>
            </View>
          ))}
        </View>

        {isOwn && <TouchableOpacity style={S.logoutBtn} onPress={() => Alert.alert('Log Out','Are you sure?',[{text:'Cancel'},{text:'Log Out',style:'destructive',onPress:logout}])}><Text style={{ color:'#fe2c55', fontWeight:'800', fontSize:16 }}>Log Out</Text></TouchableOpacity>}
      </ScrollView>

      {showEdit && (
        <View style={S.overlay}>
          <View style={S.sheet}>
            <Text style={S.sheetTitle}>Edit Profile</Text>
            <TextInput style={S.input} value={bio} onChangeText={setBio} placeholder="Bio..." placeholderTextColor="#555" multiline />
            <TouchableOpacity style={S.saveBtn} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color:'#fff', fontWeight:'800', fontSize:16 }}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEdit(false)} style={{ padding:12, alignItems:'center' }}><Text style={{ color:'#555' }}>Cancel</Text></TouchableOpacity>
          </View>
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
  btnRow:{ flexDirection:'row', paddingHorizontal:20, gap:10, marginBottom:16 },
  editBtn:{ flex:1, borderWidth:1, borderColor:'#333', borderRadius:8, padding:10, alignItems:'center' },
  editTxt:{ color:'#fff', fontWeight:'700' },
  adminBtn:{ backgroundColor:'#ffd700', borderRadius:8, padding:10, paddingHorizontal:14 },
  adminTxt:{ color:'#000', fontWeight:'800', fontSize:13 },
  followBtn:{ flex:1, backgroundColor:'#fe2c55', borderRadius:8, padding:10, alignItems:'center' },
  followingBtn:{ backgroundColor:'transparent', borderWidth:1, borderColor:'#333' },
  grid:{ flexDirection:'row', flexWrap:'wrap' },
  thumb:{ width:'33.33%', aspectRatio:0.75, borderWidth:0.5, borderColor:'#000', overflow:'hidden', position:'relative' },
  viewBadge:{ position:'absolute', bottom:4, left:4, flexDirection:'row', alignItems:'center' },
  logoutBtn:{ margin:20, borderWidth:1, borderColor:'#2a0a0a', borderRadius:12, padding:14, alignItems:'center' },
  overlay:{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'flex-end' },
  sheet:{ backgroundColor:'#111', borderTopLeftRadius:20, borderTopRightRadius:20, padding:24, paddingBottom:40 },
  sheetTitle:{ color:'#fff', fontSize:18, fontWeight:'800', marginBottom:20, textAlign:'center' },
  input:{ backgroundColor:'#1a1a1a', borderRadius:10, padding:12, color:'#fff', borderWidth:1, borderColor:'#2a2a2a', marginBottom:16, minHeight:80 },
  saveBtn:{ backgroundColor:'#fe2c55', borderRadius:12, padding:16, alignItems:'center', marginBottom:10 },
});
