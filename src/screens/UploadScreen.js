import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, FlatList,
  Dimensions, Platform, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const { width: W, height: H } = Dimensions.get('window');

// ── 50 Filters ────────────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'none',     label: 'Normal',   tint: null },
  { id: 'vivid',    label: 'Vivid',    tint: 'rgba(255,100,0,0.15)' },
  { id: 'cool',     label: 'Cool',     tint: 'rgba(0,100,255,0.2)' },
  { id: 'warm',     label: 'Warm',     tint: 'rgba(255,180,0,0.2)' },
  { id: 'noir',     label: 'Noir',     tint: 'rgba(0,0,0,0.4)' },
  { id: 'rose',     label: 'Rose',     tint: 'rgba(255,50,100,0.2)' },
  { id: 'mint',     label: 'Mint',     tint: 'rgba(0,200,150,0.2)' },
  { id: 'gold',     label: 'Gold',     tint: 'rgba(255,215,0,0.25)' },
  { id: 'dusk',     label: 'Dusk',     tint: 'rgba(100,0,200,0.2)' },
  { id: 'fade',     label: 'Fade',     tint: 'rgba(200,200,200,0.3)' },
  { id: 'chrome',   label: 'Chrome',   tint: 'rgba(150,200,255,0.2)' },
  { id: 'drama',    label: 'Drama',    tint: 'rgba(0,0,50,0.35)' },
  { id: 'summer',   label: 'Summer',   tint: 'rgba(255,200,50,0.2)' },
  { id: 'winter',   label: 'Winter',   tint: 'rgba(150,200,255,0.25)' },
  { id: 'retro',    label: 'Retro',    tint: 'rgba(200,150,50,0.3)' },
  { id: 'neon',     label: 'Neon',     tint: 'rgba(0,255,200,0.2)' },
  { id: 'blush',    label: 'Blush',    tint: 'rgba(255,150,150,0.2)' },
  { id: 'ocean',    label: 'Ocean',    tint: 'rgba(0,150,200,0.25)' },
  { id: 'forest',   label: 'Forest',   tint: 'rgba(0,150,50,0.2)' },
  { id: 'candy',    label: 'Candy',    tint: 'rgba(255,100,200,0.2)' },
  { id: 'sunset',   label: 'Sunset',   tint: 'rgba(255,80,0,0.25)' },
  { id: 'midnight', label: 'Midnight', tint: 'rgba(20,0,80,0.4)' },
  { id: 'mist',     label: 'Mist',     tint: 'rgba(220,230,255,0.3)' },
  { id: 'ember',    label: 'Ember',    tint: 'rgba(255,60,0,0.2)' },
  { id: 'arctic',   label: 'Arctic',   tint: 'rgba(200,240,255,0.3)' },
  { id: 'latte',    label: 'Latte',    tint: 'rgba(200,170,130,0.25)' },
  { id: 'violet',   label: 'Violet',   tint: 'rgba(150,0,255,0.2)' },
  { id: 'bronze',   label: 'Bronze',   tint: 'rgba(180,100,0,0.25)' },
  { id: 'haze',     label: 'Haze',     tint: 'rgba(255,220,180,0.25)' },
  { id: 'cobalt',   label: 'Cobalt',   tint: 'rgba(0,50,200,0.25)' },
  { id: 'velvet',   label: 'Velvet',   tint: 'rgba(100,0,50,0.3)' },
  { id: 'lime',     label: 'Lime',     tint: 'rgba(150,255,0,0.2)' },
  { id: 'ash',      label: 'Ash',      tint: 'rgba(150,150,150,0.3)' },
  { id: 'peach',    label: 'Peach',    tint: 'rgba(255,180,120,0.2)' },
  { id: 'teal',     label: 'Teal',     tint: 'rgba(0,180,180,0.2)' },
  { id: 'crimson',  label: 'Crimson',  tint: 'rgba(180,0,30,0.2)' },
  { id: 'ivory',    label: 'Ivory',    tint: 'rgba(255,250,230,0.25)' },
  { id: 'slate',    label: 'Slate',    tint: 'rgba(80,100,120,0.25)' },
  { id: 'magenta',  label: 'Magenta',  tint: 'rgba(200,0,200,0.2)' },
  { id: 'amber',    label: 'Amber',    tint: 'rgba(255,160,0,0.2)' },
  { id: 'indigo',   label: 'Indigo',   tint: 'rgba(60,0,150,0.25)' },
  { id: 'sage',     label: 'Sage',     tint: 'rgba(100,150,100,0.2)' },
  { id: 'clay',     label: 'Clay',     tint: 'rgba(180,100,60,0.2)' },
  { id: 'pearl',    label: 'Pearl',    tint: 'rgba(240,240,255,0.25)' },
  { id: 'rust',     label: 'Rust',     tint: 'rgba(180,60,0,0.25)' },
  { id: 'jade',     label: 'Jade',     tint: 'rgba(0,168,107,0.2)' },
  { id: 'smoke',    label: 'Smoke',    tint: 'rgba(100,100,100,0.35)' },
  { id: 'coral',    label: 'Coral',    tint: 'rgba(255,127,80,0.2)' },
  { id: 'glacier',  label: 'Glacier',  tint: 'rgba(180,220,255,0.3)' },
  { id: 'obsidian', label: 'Obsidian', tint: 'rgba(10,10,30,0.45)' },
];

const MODES = [
  { key: 'upload', icon: 'cloud-upload-outline', label: 'Upload' },
  { key: 'camera', icon: 'camera-outline',       label: 'Camera' },
  { key: 'live',   icon: 'radio-outline',         label: 'Live' },
];

const VISIBILITY_OPTS = [
  { key: 'public',  icon: 'earth',       label: 'Public' },
  { key: 'friends', icon: 'people',      label: 'Friends' },
  { key: 'private', icon: 'lock-closed', label: 'Private' },
];

// ── Shared post form ──────────────────────────────────────────────────────────
function PostForm({ label, onPost, uploading, progress }) {
  const [caption, setCaption]       = useState('');
  const [visibility, setVisibility] = useState('public');
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
      <View style={styles.fileInfoBox}>
        <Ionicons name="videocam" size={32} color="#fe2c55" />
        <Text style={styles.fileName} numberOfLines={1}>{label}</Text>
      </View>

      <TextInput
        style={styles.captionInput}
        placeholder="Write a caption… #hashtags @mentions"
        placeholderTextColor="#444"
        value={caption}
        onChangeText={setCaption}
        multiline
        numberOfLines={3}
        editable={!uploading}
      />

      <Text style={styles.sectionLabel}>Who can watch?</Text>
      <View style={styles.visRow}>
        {VISIBILITY_OPTS.map(v => (
          <TouchableOpacity
            key={v.key}
            style={[styles.visBtn, visibility === v.key && styles.visBtnActive]}
            onPress={() => setVisibility(v.key)}
            disabled={uploading}
          >
            <Ionicons name={v.icon} size={16} color={visibility === v.key ? '#fe2c55' : '#555'} />
            <Text style={[styles.visLabel, visibility === v.key && styles.visLabelActive]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {uploading && (
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% uploaded</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.postBtn, uploading && styles.postBtnDisabled]}
        onPress={() => onPost(caption.trim(), visibility)}
        disabled={uploading}
      >
        <LinearGradient
          colors={uploading ? ['#1a1a1a','#1a1a1a'] : ['#fe2c55','#ff6b35']}
          start={{ x:0, y:0 }} end={{ x:1, y:0 }}
          style={styles.postBtnGrad}
        >
          {uploading
            ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.postBtnText}>  Posting…</Text></>
            : <><Ionicons name="rocket" size={18} color="#fff" /><Text style={styles.postBtnText}>  Post to Vertext</Text></>
          }
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Upload mode ───────────────────────────────────────────────────────────────
function UploadMode({ navigation }) {
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const { getToken, API_URL }     = useAuth();

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow media library access'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos, allowsEditing: false, quality: 1,
    });
    if (!r.canceled) setFile(r.assets[0]);
  };

  const post = async (caption, visibility) => {
    if (!file)    { Alert.alert('Select a video first'); return; }
    if (!caption) { Alert.alert('Add a caption'); return; }
    setUploading(true); setProgress(0);
    try {
      const token = await getToken();
      const form  = new FormData();
      form.append('video_file', { uri: file.uri, type: file.mimeType || 'video/mp4', name: file.fileName || 'video.mp4' });
      form.append('caption', caption);
      form.append('visibility', visibility);
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded/e.total*100)); };
      await new Promise((res, rej) => {
        xhr.open('POST', `${API_URL}/videos/upload/`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => (xhr.status===201||xhr.status===200) ? res() : rej(new Error(`Server error ${xhr.status}`));
        xhr.onerror = () => rej(new Error('Network error'));
        xhr.send(form);
      });
      Alert.alert('✅ Posted!', 'Your video is live on Vertext', [
        { text: 'View Feed', onPress: () => navigation?.navigate('Feed') }
      ]);
      setFile(null); setProgress(0);
    } catch(e) { Alert.alert('Upload failed', e.message); }
    finally { setUploading(false); }
  };

  if (file) return (
    <PostForm label={file.fileName || 'video.mp4'} onPost={post} uploading={uploading} progress={progress} />
  );

  return (
    <View style={styles.pickWrap}>
      <TouchableOpacity style={styles.pickZone} onPress={pick} activeOpacity={0.8}>
        <Ionicons name="cloud-upload-outline" size={64} color="#333" />
        <Text style={styles.pickTitle}>Tap to select video</Text>
        <Text style={styles.pickSub}>MP4 · MOV · up to 500 MB</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Camera + Filters mode ─────────────────────────────────────────────────────
function CameraMode({ navigation }) {
  const [recordedUri, setRecordedUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { getToken, API_URL } = useAuth();

  const openCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow camera access in Settings → Apps → Vertext → Permissions');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 60,
        quality: 1,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        setRecordedUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Camera Error', 'Could not open camera: ' + e.message);
    }
  };

  const post = async (caption, visibility) => {
    if (!caption) { Alert.alert('Add a caption'); return; }
    setUploading(true); setProgress(0);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('video_file', { uri: recordedUri, type: 'video/mp4', name: 'camera_video.mp4' });
      form.append('caption', caption);
      form.append('visibility', visibility);
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
      await new Promise((res, rej) => {
        xhr.open('POST', `${API_URL}/videos/upload/`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => (xhr.status === 201 || xhr.status === 200) ? res() : rej(new Error(`Server error ${xhr.status}`));
        xhr.onerror = () => rej(new Error('Network error'));
        xhr.send(form);
      });
      Alert.alert('✅ Posted!', 'Your video is live', [
        { text: 'View Feed', onPress: () => navigation?.navigate('Feed') }
      ]);
      setRecordedUri(null); setProgress(0);
    } catch (e) { Alert.alert('Upload failed', e.message); }
    finally { setUploading(false); }
  };

  if (recordedUri) return (
    <PostForm label="Recorded video" onPost={post} uploading={uploading} progress={progress} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
        <Ionicons name="videocam" size={48} color="#fe2c55" />
      </View>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>Record a Video</Text>
      <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 40, lineHeight: 20 }}>
        Open your camera to record up to 60 seconds of video
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: '#fe2c55', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        onPress={openCamera}
      >
        <Ionicons name="camera" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>Open Camera</Text>
      </TouchableOpacity>
      <Text style={{ color: '#444', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
        Max 60 seconds · MP4 format
      </Text>
    </View>
  );
}

// ── Live Streaming mode ───────────────────────────────────────────────────────
function LiveMode() {
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [isLive, setIsLive]   = useState(false);
  const [title, setTitle]     = useState('');
  const [facing, setFacing]   = useState('front');
  const [viewers, setViewers] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [hearts, setHearts]   = useState(0);
  const [comments, setComments] = useState([
    { id: '1', user: 'alex_k',   text: '🔥 Let\'s go!' },
    { id: '2', user: 'sam__x',   text: 'First here 👀' },
    { id: '3', user: 'zee_254',  text: 'Kenya represent 🇰🇪' },
  ]);
  const [newComment, setNewComment] = useState('');
  const timerRef   = useRef(null);
  const viewerRef  = useRef(null);
  const commentRef = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(viewerRef.current);
    clearInterval(commentRef.current);
  }, []);

  const FAKE_COMMENTS = [
    'Amazing content 🙌', '❤️❤️❤️', 'Keep going!', 'Love this', '🔥🔥',
    'You are talented!', 'Wow', 'Nairobi vibes 💚', 'Following now!', '😍',
  ];
  const FAKE_USERS = ['john_k','mary_w','peter_254','grace_n','david_m','lucy_a','tom_o','faith_w'];

  const startLive = () => {
    if (!title.trim()) { Alert.alert('Add a stream title first'); return; }
    setIsLive(true);
    setViewers(Math.floor(Math.random()*15)+3);
    setElapsed(0);

    timerRef.current = setInterval(() => setElapsed(s => s+1), 1000);

    viewerRef.current = setInterval(() => {
      if (Math.random() > 0.5) setViewers(v => v + Math.floor(Math.random()*3));
      if (Math.random() > 0.6) setHearts(h => h + Math.floor(Math.random()*5)+1);
    }, 3000);

    commentRef.current = setInterval(() => {
      if (Math.random() > 0.4) {
        const fakeComment = {
          id: String(Date.now()),
          user: FAKE_USERS[Math.floor(Math.random()*FAKE_USERS.length)],
          text: FAKE_COMMENTS[Math.floor(Math.random()*FAKE_COMMENTS.length)],
        };
        setComments(c => [...c.slice(-7), fakeComment]);
      }
    }, 4000);
  };

  const endLive = () => {
    clearInterval(timerRef.current);
    clearInterval(viewerRef.current);
    clearInterval(commentRef.current);
    Alert.alert(
      '🎬 Stream Ended',
      `Duration: ${fmt(elapsed)}\nPeak viewers: ${viewers}\nHearts received: ${hearts}`,
      [{ text: 'OK', onPress: () => { setIsLive(false); setElapsed(0); setViewers(0); setHearts(0); } }]
    );
  };

  const sendComment = () => {
    if (!newComment.trim()) return;
    setComments(c => [...c.slice(-7), { id: String(Date.now()), user: 'you', text: newComment.trim() }]);
    setNewComment('');
  };

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  // Auto-request permissions on mount for live
  useEffect(() => {
    (async () => {
      try {
        if (camPerm && !camPerm.granted && camPerm.canAskAgain) await requestCam();
        if (micPerm && !micPerm.granted && micPerm.canAskAgain) await requestMic();
      } catch(e) {}
    })();
  }, []);

  if (!camPerm?.granted || !micPerm?.granted) return (
    <View style={styles.permWrap}>
      <Ionicons name="radio-outline" size={56} color="#555" />
      <Text style={styles.permText}>Camera & microphone needed for live</Text>
      <Text style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 16, paddingHorizontal: 24 }}>
        Go to Settings → Apps → Vertext → Permissions and enable Camera and Microphone
      </Text>
      <TouchableOpacity style={styles.permBtn} onPress={async () => {
        try { await requestCam(); await requestMic(); } catch(e) {}
      }}>
        <Text style={styles.permBtnText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isLive) return (
    <ScrollView style={{ flex:1, backgroundColor:'#0a0a0a' }} contentContainerStyle={{ padding:24, paddingTop:32 }}>
      <View style={styles.liveSetupHero}>
        <View style={styles.liveIconCircle}>
          <Ionicons name="radio" size={40} color="#fe2c55" />
        </View>
        <Text style={styles.liveSetupTitle}>Go Live on Vertext</Text>
        <Text style={styles.liveSetupSub}>Connect with your audience in real time and earn while streaming</Text>
      </View>

      <Text style={styles.sectionLabel}>Stream Title</Text>
      <TextInput
        style={styles.captionInput}
        placeholder="What are you streaming today?"
        placeholderTextColor="#444"
        value={title}
        onChangeText={setTitle}
      />

      <View style={styles.liveFeatures}>
        {[
          { icon: 'eye-outline',         text: 'Viewers join in real time' },
          { icon: 'heart-outline',       text: 'Receive hearts & comments' },
          { icon: 'cash-outline',        text: 'Earn 40% of ad revenue' },
          { icon: 'share-social-outline',text: 'Stream shared to your followers' },
        ].map((f, i) => (
          <View key={i} style={styles.liveFeatureItem}>
            <View style={styles.liveFeatureIcon}>
              <Ionicons name={f.icon} size={20} color="#fe2c55" />
            </View>
            <Text style={styles.liveFeatureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.goLiveBtn} onPress={startLive}>
        <LinearGradient colors={['#fe2c55','#ff1744']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.goLiveBtnGrad}>
          <Ionicons name="radio" size={22} color="#fff" />
          <Text style={styles.goLiveBtnText}>  Go Live Now</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.liveNote}>
        💡 Tip: Announce your live in advance to get more viewers!
      </Text>
    </ScrollView>
  );

  // ── Active live stream UI ──
  return (
    <View style={{ flex:1, backgroundColor:'#000' }}>
      <CameraView
        style={{ flex:1 }}
        facing={facing}
        mode="video"
        onCameraReady={() => {}}
        onMountError={(e) => {
          Alert.alert('Camera Error', 'Could not start camera: ' + (e?.message || 'Unknown error'));
          setIsLive(false);
        }}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor:'rgba(0,0,0,0.2)' }]} pointerEvents="none" />

        {/* Top bar */}
        <View style={styles.liveTopBar}>
          <View style={styles.liveBadge}>
            <View style={styles.liveRedDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <View style={styles.liveStatsRow}>
            <Ionicons name="eye" size={13} color="#fff" />
            <Text style={styles.liveStatText}>{viewers}</Text>
            <Text style={styles.liveTimeText}>{fmt(elapsed)}</Text>
          </View>
          <View style={styles.liveHeartsRow}>
            <Text style={{ fontSize:14 }}>❤️</Text>
            <Text style={styles.liveStatText}>{hearts}</Text>
          </View>
          <TouchableOpacity onPress={() => setFacing(f => f==='front'?'back':'front')} style={styles.camIconBtn}>
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stream title */}
        <View style={styles.liveTitleBar}>
          <Text style={styles.liveTitleText} numberOfLines={1}>{title}</Text>
        </View>

        {/* Comments */}
        <View style={styles.liveCommentsFeed} pointerEvents="none">
          {comments.slice(-5).map(c => (
            <View key={c.id} style={styles.liveCommentBubble}>
              <Text style={styles.liveCommentUser}>@{c.user} </Text>
              <Text style={styles.liveCommentText}>{c.text}</Text>
            </View>
          ))}
        </View>

        {/* Comment input + end button */}
        <View style={styles.liveBottomBar}>
          <TextInput
            style={styles.liveCommentInput}
            placeholder="Say something…"
            placeholderTextColor="#888"
            value={newComment}
            onChangeText={setNewComment}
            onSubmitEditing={sendComment}
          />
          <TouchableOpacity onPress={sendComment} style={styles.liveSendBtn}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.endLiveBtn} onPress={endLive}>
            <Text style={styles.endLiveBtnText}>End</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function UploadScreen({ navigation }) {
  const [mode, setMode] = useState('upload');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={styles.modeTabs}>
        {MODES.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeTab, mode===m.key && styles.modeTabActive]}
            onPress={() => setMode(m.key)}
          >
            <Ionicons name={m.icon} size={22} color={mode===m.key ? '#fe2c55' : '#555'} />
            <Text style={[styles.modeLabel, mode===m.key && styles.modeLabelActive]}>{m.label}</Text>
            {mode===m.key && <View style={styles.modeUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex:1 }}>
        {mode === 'upload' && <UploadMode navigation={navigation} />}
        {mode === 'camera' && <CameraErrorBoundary><CameraMode navigation={navigation} /></CameraErrorBoundary>}
        {mode === 'live'   && <CameraErrorBoundary><LiveMode /></CameraErrorBoundary>}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex:1, backgroundColor:'#0a0a0a' },

  // Mode tabs
  modeTabs: { flexDirection:'row', backgroundColor:'#0a0a0a', paddingTop: Platform.OS==='android' ? 44 : 56, borderBottomWidth:1, borderBottomColor:'#1a1a1a' },
  modeTab: { flex:1, alignItems:'center', paddingVertical:10, gap:3 },
  modeTabActive: {},
  modeLabel: { color:'#555', fontSize:11, fontWeight:'700' },
  modeLabelActive: { color:'#fe2c55' },
  modeUnderline: { height:2, width:28, backgroundColor:'#fe2c55', borderRadius:1, marginTop:2 },

  // Upload pick
  pickWrap: { flex:1, justifyContent:'center', alignItems:'center', padding:24 },
  pickZone: { width:'100%', borderWidth:2, borderStyle:'dashed', borderColor:'#2a2a2a', borderRadius:20, padding:48, alignItems:'center', backgroundColor:'#111', gap:12 },
  pickTitle: { color:'#fff', fontWeight:'700', fontSize:17 },
  pickSub: { color:'#555', fontSize:13 },

  // Post form
  formContent: { padding:20, paddingBottom:100 },
  fileInfoBox: { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#111', borderRadius:12, padding:14, marginBottom:20 },
  fileName: { color:'#fff', fontWeight:'600', flex:1 },
  captionInput: { backgroundColor:'#111', borderWidth:1, borderColor:'#222', borderRadius:12, padding:14, color:'#fff', fontSize:15, textAlignVertical:'top', marginBottom:20, minHeight:80 },
  sectionLabel: { color:'#777', fontSize:12, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 },
  visRow: { flexDirection:'row', gap:10, marginBottom:24 },
  visBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, backgroundColor:'#111', borderWidth:1, borderColor:'#222', borderRadius:10, padding:10 },
  visBtnActive: { borderColor:'#fe2c55', backgroundColor:'#1a0808' },
  visLabel: { color:'#555', fontSize:12, fontWeight:'600' },
  visLabelActive: { color:'#fe2c55' },
  progressWrap: { marginBottom:16 },
  progressBg: { height:5, backgroundColor:'#222', borderRadius:3, overflow:'hidden', marginBottom:6 },
  progressFill: { height:'100%', backgroundColor:'#fe2c55', borderRadius:3 },
  progressText: { color:'#888', fontSize:12, textAlign:'center' },
  postBtn: { borderRadius:12, overflow:'hidden' },
  postBtnDisabled: { opacity:0.5 },
  postBtnGrad: { flexDirection:'row', alignItems:'center', justifyContent:'center', padding:16 },
  postBtnText: { color:'#fff', fontWeight:'800', fontSize:16 },

  // Camera
  camTopBar: { position:'absolute', top:16, left:0, right:0, flexDirection:'row', justifyContent:'space-between', paddingHorizontal:20, zIndex:10 },
  camIconBtn: { backgroundColor:'rgba(0,0,0,0.55)', borderRadius:20, padding:8, flexDirection:'row', alignItems:'center', gap:4 },
  filterBadge: { color:'#fff', fontSize:11, fontWeight:'700' },
  timerBadge: { position:'absolute', top:68, alignSelf:'center', flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'rgba(0,0,0,0.65)', borderRadius:20, paddingHorizontal:14, paddingVertical:6 },
  recDot: { width:8, height:8, borderRadius:4, backgroundColor:'#fe2c55' },
  timerText: { color:'#fff', fontWeight:'700', fontSize:15 },
  camBottom: { position:'absolute', bottom:56, left:0, right:0, alignItems:'center', gap:12 },
  recBtn: { width:80, height:80, borderRadius:40, borderWidth:4, borderColor:'#fff', justifyContent:'center', alignItems:'center' },
  recBtnActive: { borderColor:'#fe2c55' },
  recCircle: { width:60, height:60, borderRadius:30, backgroundColor:'#fe2c55' },
  recSquare: { width:28, height:28, borderRadius:6, backgroundColor:'#fe2c55' },
  recHint: { color:'rgba(255,255,255,0.7)', fontSize:13 },

  // Filter modal
  filterModalWrap: { flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'flex-end' },
  filterSheet: { backgroundColor:'#111', borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, maxHeight:H*0.65 },
  filterSheetTitle: { color:'#fff', fontWeight:'800', fontSize:18, marginBottom:16, textAlign:'center' },
  filterItem: { flex:1/4, alignItems:'center', padding:8, borderRadius:10, margin:2 },
  filterItemActive: { backgroundColor:'#1a0808' },
  filterSwatch: { width:44, height:44, borderRadius:22, marginBottom:4, borderWidth:1, borderColor:'#333' },
  filterLabel: { color:'#888', fontSize:10, fontWeight:'600', textAlign:'center' },
  filterCloseBtn: { backgroundColor:'#222', borderRadius:12, padding:14, alignItems:'center', marginTop:8 },

  // Permissions
  permWrap: { flex:1, justifyContent:'center', alignItems:'center', gap:16, padding:32 },
  permText: { color:'#888', textAlign:'center', fontSize:15 },
  permBtn: { backgroundColor:'#fe2c55', borderRadius:12, paddingHorizontal:28, paddingVertical:12 },
  permBtnText: { color:'#fff', fontWeight:'700', fontSize:15 },

  // Live setup
  liveSetupHero: { alignItems:'center', gap:10, marginBottom:28 },
  liveIconCircle: { width:80, height:80, borderRadius:40, backgroundColor:'#1a0808', justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:'#fe2c55' },
  liveSetupTitle: { color:'#fff', fontWeight:'900', fontSize:24 },
  liveSetupSub: { color:'#666', fontSize:14, textAlign:'center', lineHeight:20 },
  liveFeatures: { gap:10, marginBottom:28 },
  liveFeatureItem: { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'#111', borderRadius:12, padding:14 },
  liveFeatureIcon: { width:36, height:36, borderRadius:18, backgroundColor:'#1a0808', justifyContent:'center', alignItems:'center' },
  liveFeatureText: { color:'#aaa', fontSize:14, flex:1 },
  goLiveBtn: { borderRadius:14, overflow:'hidden', marginBottom:16 },
  goLiveBtnGrad: { flexDirection:'row', alignItems:'center', justifyContent:'center', padding:18 },
  goLiveBtnText: { color:'#fff', fontWeight:'900', fontSize:18 },
  liveNote: { color:'#555', fontSize:13, textAlign:'center', lineHeight:20 },

  // Live stream active
  liveTopBar: { position:'absolute', top:16, left:0, right:0, flexDirection:'row', alignItems:'center', paddingHorizontal:14, gap:8, zIndex:10 },
  liveBadge: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#fe2c55', borderRadius:6, paddingHorizontal:10, paddingVertical:4 },
  liveRedDot: { width:7, height:7, borderRadius:4, backgroundColor:'#fff' },
  liveBadgeText: { color:'#fff', fontWeight:'900', fontSize:12 },
  liveStatsRow: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'rgba(0,0,0,0.55)', borderRadius:6, paddingHorizontal:10, paddingVertical:4 },
  liveHeartsRow: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(0,0,0,0.55)', borderRadius:6, paddingHorizontal:10, paddingVertical:4 },
  liveStatText: { color:'#fff', fontSize:12, fontWeight:'700' },
  liveTimeText: { color:'#aaa', fontSize:12, marginLeft:6 },
  liveTitleBar: { position:'absolute', top:64, left:16, right:60 },
  liveTitleText: { color:'#fff', fontWeight:'700', fontSize:14, textShadowColor:'rgba(0,0,0,0.9)', textShadowOffset:{width:0,height:1}, textShadowRadius:4 },
  liveCommentsFeed: { position:'absolute', bottom:90, left:12, right:16, gap:6 },
  liveCommentBubble: { flexDirection:'row', backgroundColor:'rgba(0,0,0,0.6)', borderRadius:10, paddingHorizontal:10, paddingVertical:5, alignSelf:'flex-start', maxWidth:'88%' },
  liveCommentUser: { color:'#fe2c55', fontWeight:'700', fontSize:13 },
  liveCommentText: { color:'#fff', fontSize:13, flexShrink:1 },
  liveBottomBar: { position:'absolute', bottom:24, left:12, right:12, flexDirection:'row', gap:8, alignItems:'center' },
  liveCommentInput: { flex:1, backgroundColor:'rgba(0,0,0,0.65)', borderRadius:24, paddingHorizontal:16, paddingVertical:10, color:'#fff', fontSize:14, borderWidth:1, borderColor:'rgba(255,255,255,0.2)' },
  liveSendBtn: { backgroundColor:'rgba(254,44,85,0.8)', borderRadius:20, padding:10 },
  endLiveBtn: { backgroundColor:'rgba(254,44,85,0.9)', borderRadius:10, paddingHorizontal:14, paddingVertical:10 },
  endLiveBtnText: { color:'#fff', fontWeight:'900', fontSize:13 },
});
