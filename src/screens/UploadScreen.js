import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

export default function UploadScreen({ navigation }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { getToken, API_URL } = useAuth();

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your media library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) setFile(result.assets[0]);
  };

  const upload = async () => {
    if (!file) { Alert.alert('Select a video first'); return; }
    if (!caption.trim()) { Alert.alert('Add a caption'); return; }
    setUploading(true);
    setProgress(0);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('video_file', {
        uri: file.uri,
        type: file.mimeType || 'video/mp4',
        name: file.fileName || 'video.mp4',
      });
      formData.append('caption', caption.trim());
      formData.append('visibility', visibility);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      await new Promise((resolve, reject) => {
        xhr.open('POST', `${API_URL}/videos/upload/`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => {
          if (xhr.status === 201 || xhr.status === 200) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      Alert.alert('✅ Uploaded!', 'Your video is now live on Vertext', [
        { text: 'View Feed', onPress: () => navigation?.navigate('Feed') }
      ]);
      setFile(null);
      setCaption('');
      setProgress(0);
    } catch (e) {
      Alert.alert('Upload failed', e.message || 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  const VISIBILITY = [
    { key: 'public', icon: 'earth', label: 'Public' },
    { key: 'friends', icon: 'people', label: 'Friends' },
    { key: 'private', icon: 'lock-closed', label: 'Private' },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Upload Video</Text>

      {/* Pick zone */}
      <TouchableOpacity style={[styles.pickZone, file && styles.pickZoneActive]} onPress={pickVideo} activeOpacity={0.8} disabled={uploading}>
        {file ? (
          <View style={styles.fileInfo}>
            <Ionicons name="videocam" size={44} color="#fe2c55" />
            <Text style={styles.fileName} numberOfLines={1}>{file.fileName || 'video.mp4'}</Text>
            <Text style={styles.fileSub}>
              {file.duration ? `${Math.round(file.duration / 1000)}s` : ''} • Tap to change
            </Text>
          </View>
        ) : (
          <View style={styles.pickHint}>
            <Ionicons name="cloud-upload-outline" size={56} color="#333" />
            <Text style={styles.pickTitle}>Tap to select video</Text>
            <Text style={styles.pickSub}>MP4 • MOV • up to 500MB</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Caption */}
      <TextInput
        style={styles.captionInput}
        placeholder="Write a caption... use #hashtags and @mentions"
        placeholderTextColor="#444"
        value={caption}
        onChangeText={setCaption}
        multiline
        numberOfLines={3}
        editable={!uploading}
      />

      {/* Visibility */}
      <Text style={styles.label}>Who can watch?</Text>
      <View style={styles.visRow}>
        {VISIBILITY.map(v => (
          <TouchableOpacity
            key={v.key}
            style={[styles.visBtn, visibility === v.key && styles.visBtnActive]}
            onPress={() => setVisibility(v.key)}
            disabled={uploading}
          >
            <Ionicons name={v.icon} size={18} color={visibility === v.key ? '#fe2c55' : '#555'} />
            <Text style={[styles.visLabel, visibility === v.key && styles.visLabelActive]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Progress bar */}
      {uploading && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% uploaded</Text>
        </View>
      )}

      {/* Upload button */}
      <TouchableOpacity
        style={[styles.uploadBtn, (!file || uploading) && styles.uploadBtnDisabled]}
        onPress={upload}
        disabled={!file || uploading}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={file && !uploading ? ['#fe2c55', '#ff6b35'] : ['#1a1a1a', '#1a1a1a']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.uploadBtnGrad}
        >
          {uploading ? (
            <><ActivityIndicator color="#fff" size="small" /><Text style={styles.uploadText}>  Uploading...</Text></>
          ) : (
            <><Ionicons name="rocket" size={20} color={file ? '#fff' : '#444'} /><Text style={[styles.uploadText, !file && { color: '#444' }]}>  Post to Vertext</Text></>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 24 },
  pickZone: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#2a2a2a', borderRadius: 16, padding: 40, alignItems: 'center', backgroundColor: '#111', marginBottom: 20 },
  pickZoneActive: { borderColor: '#fe2c55', backgroundColor: '#1a0808' },
  pickHint: { alignItems: 'center', gap: 10 },
  pickTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pickSub: { color: '#555', fontSize: 13 },
  fileInfo: { alignItems: 'center', gap: 8 },
  fileName: { color: '#fff', fontWeight: '600', maxWidth: 220, textAlign: 'center' },
  fileSub: { color: '#666', fontSize: 12 },
  captionInput: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, textAlignVertical: 'top', marginBottom: 20, minHeight: 90 },
  label: { color: '#777', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  visRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  visBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 12 },
  visBtnActive: { borderColor: '#fe2c55', backgroundColor: '#1a0808' },
  visLabel: { color: '#555', fontSize: 13, fontWeight: '600' },
  visLabelActive: { color: '#fe2c55' },
  progressWrap: { marginBottom: 16 },
  progressBg: { height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#fe2c55', borderRadius: 3 },
  progressText: { color: '#888', fontSize: 13, textAlign: 'center' },
  uploadBtn: { borderRadius: 12, overflow: 'hidden' },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  uploadText: { color: '#fff', fontWeight: '800', fontSize: 17 },
});
