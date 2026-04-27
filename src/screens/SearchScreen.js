import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const TRENDING = ['#VertextVibes','#FYPage','#Creator','#Nairobi','#KenyaTikTok','#Trending2025','#DanceChallenge','#Comedy','#Fashion','#Tech'];

export default function SearchScreen({ navigation }) {
  const { apiFetch } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], videos: [] });
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(true);

  // Load real suggested creators on mount
  useEffect(() => {
    apiFetch('/admin/users/').then(users => {
      if (Array.isArray(users)) setSuggested(users.slice(0, 10));
    }).catch(() => {
      apiFetch('/search/?q=a').then(d => {
        if (d?.users) setSuggested(d.users.slice(0, 10));
      }).catch(() => {});
    }).finally(() => setLoadingSuggested(false));
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults({ users: [], videos: [] }); return; }
    setLoading(true);
    try {
      const data = await apiFetch(`/search/?q=${encodeURIComponent(q)}`);
      setResults({ users: data.users || [], videos: data.videos || [] });
    } catch { setResults({ users: [], videos: [] }); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const goProfile = (username) => {
    navigation?.navigate('Profile', { username });
  };

  const UserRow = ({ user }) => (
    <TouchableOpacity style={S.userRow} onPress={() => goProfile(user.username)}>
      <View style={S.uAvatar}>
        {user.avatar
          ? <Image source={{ uri: user.avatar }} style={S.uAvatarImg} />
          : <Text style={S.uLetter}>{user.username?.[0]?.toUpperCase()}</Text>
        }
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={S.uName}>@{user.username}</Text>
          {user.is_verified && (
            <View style={[S.badge, user.verification_type === 'blue' ? S.badgeBlue : S.badgeBlack]}>
              <Text style={S.badgeTick}>✓</Text>
            </View>
          )}
        </View>
        <Text style={S.uFollowers}>{user.followers_count || 0} followers</Text>
      </View>
      <TouchableOpacity style={S.followBtn} onPress={() => goProfile(user.username)}>
        <Text style={S.followText}>View</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={S.root}>
      <View style={S.searchBar}>
        <Ionicons name="search" size={20} color="#555" />
        <TextInput
          style={S.searchInput}
          placeholder="Search users, videos..."
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator color="#fe2c55" style={{ marginTop: 20 }} />}

      {query.length === 0 ? (
        <FlatList
          data={[1]}
          keyExtractor={() => 'main'}
          renderItem={() => (
            <View>
              <View style={S.section}>
                <Text style={S.sectionTitle}>TRENDING</Text>
                <View style={S.tagsWrap}>
                  {TRENDING.map(t => (
                    <TouchableOpacity key={t} onPress={() => setQuery(t)} style={S.tag}>
                      <Text style={S.tagText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={S.section}>
                <Text style={S.sectionTitle}>CREATORS TO FOLLOW</Text>
                {loadingSuggested
                  ? <ActivityIndicator color="#fe2c55" />
                  : suggested.map(u => <UserRow key={u.id} user={u} />)
                }
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      ) : (
        <FlatList
          data={[...results.users.map(u => ({ ...u, _type: 'user' })), ...results.videos.map(v => ({ ...v, _type: 'video' }))]}
          keyExtractor={(item) => `${item._type}_${item.id}`}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={!loading && (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: '#555', fontSize: 16 }}>No results for "{query}"</Text>
            </View>
          )}
          renderItem={({ item }) => {
            if (item._type === 'user') return <UserRow user={item} />;
            return (
              <TouchableOpacity style={S.videoRow}>
                <View style={S.videoThumb}>
                  {item.thumbnail_url
                    ? <Image source={{ uri: item.thumbnail_url }} style={{ width: '100%', height: '100%' }} />
                    : <Ionicons name="videocam-outline" size={24} color="#555" />
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.videoCaption} numberOfLines={2}>{item.caption || 'No caption'}</Text>
                  <Text style={S.videoMeta}>@{item.user?.username} · {item.views_count} views</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', paddingTop: 52 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', margin: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: '#222' },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  section: { padding: 16 },
  sectionTitle: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#111', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#222' },
  tagText: { color: '#fff', fontSize: 13 },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: '#111', gap: 12 },
  uAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center' },
  uAvatarImg: { width: 46, height: 46, borderRadius: 23 },
  uLetter: { color: '#fff', fontWeight: '900', fontSize: 18 },
  uName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  uFollowers: { color: '#666', fontSize: 12, marginTop: 2 },
  followBtn: { backgroundColor: '#fe2c55', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  followText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  badge: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  badgeBlue: { backgroundColor: '#1d9bf0' },
  badgeBlack: { backgroundColor: '#555' },
  badgeTick: { color: '#fff', fontSize: 9, fontWeight: '900' },
  videoRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#111', gap: 12 },
  videoThumb: { width: 70, height: 90, backgroundColor: '#111', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  videoCaption: { color: '#fff', fontSize: 14, fontWeight: '600' },
  videoMeta: { color: '#666', fontSize: 12, marginTop: 4 },
});
