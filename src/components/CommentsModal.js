import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MOCK_COMMENTS = [
  { id: 1, user: { username: 'fan_one' }, text: 'This is fire 🔥', likes: 423 },
  { id: 2, user: { username: 'daily_viewer' }, text: "Can't stop watching 😂", likes: 211 },
  { id: 3, user: { username: 'vertext_fan' }, text: 'Vertext > TikTok any day', likes: 892 },
  { id: 4, user: { username: 'night_owl' }, text: 'Bro dropped this at 3am 💀', likes: 67 },
];

export default function CommentsModal({ visible, onClose, videoId }) {
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [input, setInput] = useState('');

  const submit = () => {
    if (!input.trim()) return;
    setComments(c => [{ id: Date.now(), user: { username: 'you' }, text: input, likes: 0 }, ...c]);
    setInput('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
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

          <FlatList
            data={comments}
            keyExtractor={item => String(item.id)}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <View style={styles.cAvatar}>
                  <Text style={styles.cAvatarText}>{item.user.username[0].toUpperCase()}</Text>
                </View>
                <View style={styles.cBody}>
                  <Text style={styles.cUser}>@{item.user.username}</Text>
                  <Text style={styles.cText}>{item.text}</Text>
                  <TouchableOpacity>
                    <Text style={styles.cLikes}>❤️ {item.likes}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#555"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submit}
            />
            <TouchableOpacity style={styles.postBtn} onPress={submit}>
              <Text style={styles.postText}>Post</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '65%', minHeight: '50%',
  },
  handle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  list: { flex: 1, paddingHorizontal: 16 },
  comment: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  cAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center',
  },
  cAvatarText: { color: '#fff', fontWeight: '700' },
  cBody: { flex: 1 },
  cUser: { color: '#888', fontSize: 13, fontWeight: '600' },
  cText: { color: '#fff', fontSize: 14, marginVertical: 2 },
  cLikes: { color: '#666', fontSize: 12 },
  inputRow: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderTopWidth: 0.5, borderTopColor: '#333',
  },
  input: {
    flex: 1, backgroundColor: '#2a2a2a', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14,
  },
  postBtn: {
    backgroundColor: '#fe2c55', borderRadius: 20,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  postText: { color: '#fff', fontWeight: '700' },
});
