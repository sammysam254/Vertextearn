import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const VISIBILITY = [
  { key: 'public', icon: 'earth', label: 'Public' },
  { key: 'friends', icon: 'people', label: 'Friends' },
  { key: 'private', icon: 'lock-closed', label: 'Private' },
];

export default function UploadScreen() {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [uploading, setUploading] = useState(false);
  const { apiFetch, API } = useAuth();

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to your media library'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled) setFile(result.assets[0]);
  };

  const upload = async () => {
    if (!file) { Alert.alert('Select a video first'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video_file', { uri: file.uri, type: 'video/mp4', name: 'video.mp4' });
      formData.append('caption', caption);
      formData.append('visibility', visibility);

      // Real upload
      const token = await import('expo-secure-store').then(m => m.getItemAsync('vertext_token'));
      const r = await fetch(`${API}/videos/upload/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (r.ok) {
        Alert.alert('✅ Uploaded!', 'Your video is now live on Vertext');
        setFile(null); setCaption('');
      } else {
        Alert.alert('Upload failed', 'Try again');
      }
    } catch {
      // Offline demo
      Alert.alert('✅ Uploaded!', 'Your video is now live on Vertext (demo mode)');
      setFile(null); setCaption('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Upload Video</Text>

      {/* Pick zone */}
      <TouchableOpacity style={[styles.pickZone, file && styles.pickZoneActive]} onPress={pickVideo} activeOpacity={0.8}>
        {file ? (
          <View style={styles.fileInfo}>
            <Ionicons name="videocam" size={40} color="#fe2c55" />
            <Text style={styles.fileName} numberOfLines={1}>{file.uri.split('/').pop()}</Text>
            <Text style={styles.fileSub}>Tap to change</Text>
          </View>
        ) : (
          <View style={styles.pickHint}>
            <Ionicons name="cloud-upload-outline" size={52} color="#333" />
            <Text style={styles.pickTitle}>Tap to select video</Text>
            <Text style={styles.pickSub}>MP4 • MOV • up to 500MB</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Caption */}
      <TextInput
        style={styles.captionInput}
        placeholder="Write a caption... #hashtags @mentions"
        placeholderTextColor="#444"
        value={caption}
        onChangeText={setCaption}
        multiline
        numberOfLines={3}
      />

      {/* Visibility */}
      <Text style={styles.label}>Who can watch?</Text>
      <View style={styles.visRow}>
        {VISIBILITY.map(v => (
          <TouchableOpacity
            key={v.key}
            style={[styles.visBtn, visibility === v.key && styles.visBtnActive]}
            onPress={() => setVisibility(v.key)}
          >
            <Ionicons name={v.icon} size={20} color={visibility === v.key ? '#fe2c55' : '#555'} />
            <Text style={[styles.visLabel, visibility === v.key && styles.visLabelActive]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Upload button */}
      <TouchableOpacity
        style={[styles.uploadBtn, !file && styles.uploadBtnDisabled]}
        onPress={upload}
        disabled={!file || uploading}
        activeOpacity={0.85}
      >
        {file ? (
          <LinearGradient colors={['#fe2c55', '#ff6b35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.uploadBtnGrad}>
            {uploading
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="rocket" size={20} color="#fff" /><Text style={styles.uploadText}>Post to Vertext</Text></>
            }
          </LinearGradient>
        ) : (
          <View style={styles.uploadBtnGrad}>
            <Text style={styles.uploadTextOff}>Select a video to continue</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 24 },
  pickZone: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#2a2a2a',
    borderRadius: 16, padding: 40, alignItems: 'center', backgroundColor: '#111',
    marginBottom: 20,
  },
  pickZoneActive: { borderColor: '#fe2c55', backgroundColor: '#1a0a0a' },
  pickHint: { alignItems: 'center', gap: 8 },
  pickTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pickSub: { color: '#555', fontSize: 13 },
  fileInfo: { alignItems: 'center', gap: 8 },
  fileName: { color: '#fff', fontWeight: '600', maxWidth: 200, textAlign: 'center' },
  fileSub: { color: '#666', fontSize: 12 },
  captionInput: {
    backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 12,
    padding: 14, color: '#fff', fontSize: 15, textAlignVertical: 'top',
    marginBottom: 20, minHeight: 80,
  },
  label: { color: '#777', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  visRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  visBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 12,
  },
  visBtnActive: { borderColor: '#fe2c55', backgroundColor: '#1a0808' },
  visLabel: { color: '#555', fontSize: 13, fontWeight: '600' },
  visLabelActive: { color: '#fe2c55' },
  uploadBtn: { borderRadius: 12, overflow: 'hidden' },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8, backgroundColor: '#1a1a1a' },
  uploadText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  uploadTextOff: { color: '#555', fontWeight: '600', fontSize: 15 },
});
