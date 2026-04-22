import { useState } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');
const TRENDING = ['#VertextVibes','#FYPage','#Creator','#Nairobi','#KenyaTikTok','#Trending2025','#DanceChallenge','#Comedy','#Fashion','#Tech'];

const CREATORS = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1, username: `creator_${i + 1}`,
  followers: Math.floor(Math.random() * 100) + 1,
}));

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.root}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos, users, hashtags..."
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {query.length === 0 ? (
        <FlatList
          data={[{ type: 'trending' }, { type: 'creators' }]}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => {
            if (item.type === 'trending') return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TRENDING</Text>
                <View style={styles.tagsWrap}>
                  {TRENDING.map(t => (
                    <TouchableOpacity key={t} onPress={() => setQuery(t)} style={styles.tag}>
                      <Text style={styles.tagText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SUGGESTED CREATORS</Text>
                {CREATORS.map(c => (
                  <View key={c.id} style={styles.creator}>
                    <View style={styles.cAvatar}>
                      <Text style={styles.cLetter}>{c.username[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.cInfo}>
                      <Text style={styles.cName}>@{c.username}</Text>
                      <Text style={styles.cFollowers}>{c.followers}K followers</Text>
                    </View>
                    <TouchableOpacity style={styles.followBtn}>
                      <Text style={styles.followText}>Follow</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      ) : (
        <View style={styles.grid}>
          {Array.from({ length: 12 }, (_, i) => (
            <View key={i} style={styles.gridItem}>
              <View style={[styles.gridThumb, { backgroundColor: `hsl(${i * 30},40%,15%)` }]}>
                <Text style={{ color: '#fff', fontSize: 22 }}>🎬</Text>
              </View>
              <Text style={styles.gridViews}>{Math.floor(Math.random() * 100)}K</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a', paddingTop: 50 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a',
    borderRadius: 12, marginHorizontal: 16, marginBottom: 16,
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { color: '#555', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: {
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  tagText: { color: '#fff', fontSize: 14 },
  creator: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 0.5, borderBottomColor: '#111' },
  cAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center' },
  cLetter: { color: '#fff', fontWeight: '900', fontSize: 18 },
  cInfo: { flex: 1 },
  cName: { color: '#fff', fontWeight: '700' },
  cFollowers: { color: '#666', fontSize: 13, marginTop: 2 },
  followBtn: { backgroundColor: '#fe2c55', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 6 },
  followText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 },
  gridItem: { width: (W - 6) / 3, aspectRatio: 9 / 16, position: 'relative' },
  gridThumb: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gridViews: { position: 'absolute', bottom: 4, left: 6, color: '#fff', fontSize: 11, fontWeight: '700' },
});
