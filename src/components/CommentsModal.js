import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function CommentsModal({ visible, onClose, videoId }) {
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const { apiFetch, user } = useAuth();

  useEffect(() => {
    if (visible && videoId) loadComments();
  }, [visible, videoId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/videos/${videoId}/comments/`);
      setComments(Array.isArray(data) ? data : (data.results || []));
    } catch {}
    setLoading(false);
  };

  const submit = async () => {
    if (!input.trim() || posting) return;
    setPosting(true);
    try {
      const newComment = await apiFetch(`/videos/${videoId}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ text: input.trim() }),
      });
      setComments(c => [newComment, ...c]);
      setInput('');
    } catch {
      // Add optimistically
      setComments(c => [{
        id: Date.now(),
        user: { username: user?.username || 'you' },
        text: input.trim(),
        likes: 0,
      }, ...c]);
      setInput('');
    }
    setPosting(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.headerText}>{comments.length} Comments</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color="#fe2c55" />
            </View>
          ) : comments.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#555', fontSize: 15 }}>No comments yet</Text>
              <Text style={{ color: '#444', fontSize: 13, marginTop: 4 }}>Be the first to comment!</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={item => String(item.id)}
              style={styles.list}
              renderItem={({ item }) => (
                <View style={styles.comment}>
                  <View style={styles.cAvatar}>
                    <Text style={styles.cAvatarText}>{item.user?.username?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={styles.cBody}>
                    <Text style={styles.cUser}>@{item.user?.username}</Text>
                    <Text style={styles.cText}>{item.text}</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
                      <Text style={styles.cMeta}>{item.likes || 0} likes</Text>
                      <TouchableOpacity><Text style={styles.cMeta}>Reply</Text></TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.cLikeBtn}>
                    <Ionicons name="heart-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          <View style={styles.inputRow}>
            <View style={styles.inputAvatar}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{user?.username?.[0]?.toUpperCase()}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#555"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submit}
              editable={!posting}
            />
            <TouchableOpacity style={[styles.postBtn, !input.trim() && { opacity: 0.4 }]} onPress={submit} disabled={posting || !input.trim()}>
              {posting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.postText}>Post</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '70%', minHeight: '50%' },
  handle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  list: { flex: 1, paddingHorizontal: 16 },
  comment: { flexDirection: 'row', gap: 10, marginBottom: 18, alignItems: 'flex-start' },
  cAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cAvatarText: { color: '#fff', fontWeight: '700' },
  cBody: { flex: 1 },
  cUser: { color: '#888', fontSize: 13, fontWeight: '600' },
  cText: { color: '#fff', fontSize: 14, marginTop: 2 },
  cMeta: { color: '#555', fontSize: 12 },
  cLikeBtn: { paddingLeft: 8, paddingTop: 4 },
  inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 0.5, borderTopColor: '#333', alignItems: 'center' },
  inputAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14 },
  postBtn: { backgroundColor: '#fe2c55', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, minWidth: 50, alignItems: 'center' },
  postText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
