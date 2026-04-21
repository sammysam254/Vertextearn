import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, Dimensions, StyleSheet,
  TouchableWithoutFeedback, Text, TouchableOpacity,
  Animated, Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import CommentsModal from '../components/CommentsModal';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

// Mock data — replace with apiFetch('/feed/') for real backend
const MOCK_VIDEOS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  user: { id: i + 1, username: `creator_${i + 1}`, is_verified: i % 3 === 0 },
  video_url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${[
    'BigBuckBunny','ElephantsDream','ForBiggerBlazes','ForBiggerEscapes',
    'ForBiggerFun','ForBiggerJoyrides','ForBiggerMeltdowns','TearsOfSteel',
    'VolkswagenGTIReview','WeAreGoing','Subaru',
  ][i % 11]}.mp4`,
  caption: [
    '✨ Living my best life #viral #fyp',
    '🔥 You won\'t believe this #trending',
    '💯 Real ones know #vertext',
    '🎵 This beat goes hard #music',
    '😂 Wait for it... #comedy',
  ][i % 5],
  likes_count: Math.floor(Math.random() * 50000) + 100,
  comments_count: Math.floor(Math.random() * 2000) + 10,
  shares_count: Math.floor(Math.random() * 5000) + 5,
  saves_count: Math.floor(Math.random() * 1000),
  is_liked: false,
  is_saved: false,
  is_ad: i % 7 === 0,
}));

function fmt(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function VideoItem({ item, isActive, index, preloadUpTo }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(item.is_liked);
  const [saved, setSaved] = useState(item.is_saved);
  const [likes, setLikes] = useState(item.likes_count);
  const [showComments, setShowComments] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const tapRef = useRef(null);
  const { apiFetch } = useAuth();

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
    }
  }, [isActive]);

  const showHeart = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(heartScale, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleDoubleTap = () => {
    if (!liked) {
      setLiked(true);
      setLikes(l => l + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      apiFetch && apiFetch(`/videos/${item.id}/like/`, { method: 'POST' }).catch(() => {});
    }
    showHeart();
  };

  const handleTap = () => {
    if (tapRef.current) {
      clearTimeout(tapRef.current);
      tapRef.current = null;
      handleDoubleTap();
    } else {
      tapRef.current = setTimeout(() => {
        tapRef.current = null;
        setMuted(m => !m);
      }, 250);
    }
  };

  const toggleLike = () => {
    setLiked(l => !l);
    setLikes(lk => liked ? lk - 1 : lk + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    apiFetch && apiFetch(`/videos/${item.id}/like/`, { method: 'POST' }).catch(() => {});
  };

  const toggleSave = () => {
    setSaved(s => !s);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    apiFetch && apiFetch(`/videos/${item.id}/save/`, { method: 'POST' }).catch(() => {});
  };

  const shouldLoad = index <= preloadUpTo;

  return (
    <View style={styles.videoContainer}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={StyleSheet.absoluteFill}>
          {shouldLoad && (
            <Video
              ref={videoRef}
              source={{ uri: item.video_url }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted={muted}
              shouldPlay={false}
            />
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(0,0,0,0.75)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Ad badge */}
          {item.is_ad && (
            <View style={styles.adBadge}>
              <Text style={styles.adText}>SPONSORED</Text>
            </View>
          )}

          {/* Mute indicator */}
          {muted && (
            <View style={styles.muteIcon}>
              <Ionicons name="volume-mute" size={20} color="#fff" />
            </View>
          )}

          {/* Double-tap heart */}
          <Animated.View
            style={[styles.heartOverlay, { transform: [{ scale: heartScale }], opacity: heartScale }]}
            pointerEvents="none"
          >
            <Text style={{ fontSize: 80 }}>❤️</Text>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      {/* Bottom info */}
      <View style={styles.bottomInfo} pointerEvents="box-none">
        <View style={styles.userRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{item.user.username[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>@{item.user.username}</Text>
          {item.user.is_verified && <Text style={styles.verified}>✓</Text>}
          <TouchableOpacity style={styles.followBtn}>
            <Text style={styles.followText}>Follow</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
        {item.is_ad && (
          <View style={styles.earningRow}>
            <Text style={styles.earningText}>💰 Earning KES {(Math.random() * 0.5).toFixed(4)}</Text>
          </View>
        )}
      </View>

      {/* Right actions */}
      <View style={styles.actions} pointerEvents="box-none">
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={34} color={liked ? '#fe2c55' : '#fff'} />
          <Text style={styles.actionLabel}>{fmt(likes)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#fff" />
          <Text style={styles.actionLabel}>{fmt(item.comments_count)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="share-social-outline" size={32} color="#fff" />
          <Text style={styles.actionLabel}>{fmt(item.shares_count)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={toggleSave}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={30} color={saved ? '#ffd700' : '#fff'} />
          <Text style={styles.actionLabel}>{fmt(item.saves_count)}</Text>
        </TouchableOpacity>

        <View style={[styles.actionBtn, styles.discWrap]}>
          <View style={styles.disc}>
            <Text style={{ fontSize: 18 }}>🎵</Text>
          </View>
        </View>
      </View>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        videoId={item.id}
      />
    </View>
  );
}

export default function FeedScreen() {
  const [videos] = useState(MOCK_VIDEOS);
  const [activeIdx, setActiveIdx] = useState(0);
  const [tab, setTab] = useState('foryou');

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIdx(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  return (
    <View style={styles.root}>
      {/* Tabs */}
      <View style={styles.tabs} pointerEvents="box-none">
        {['following', 'foryou'].map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
            <Text style={[styles.tabText, tab === t && styles.tabActive]}>
              {t === 'foryou' ? 'For You' : 'Following'}
            </Text>
            {tab === t && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={videos}
        keyExtractor={item => String(item.id)}
        renderItem={({ item, index }) => (
          <VideoItem
            item={item}
            index={index}
            isActive={index === activeIdx}
            preloadUpTo={activeIdx + 5}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  videoContainer: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },
  tabs: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', justifyContent: 'center', gap: 32,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 12,
  },
  tabBtn: { alignItems: 'center' },
  tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '700' },
  tabActive: { color: '#fff' },
  tabUnderline: { height: 2, width: 20, backgroundColor: '#fff', marginTop: 2, borderRadius: 1 },
  adBadge: {
    position: 'absolute', top: 80, left: 12,
    backgroundColor: 'rgba(254,44,85,0.85)', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  adText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  muteIcon: {
    position: 'absolute', top: 80, right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8,
  },
  heartOverlay: {
    position: 'absolute', top: '35%', left: '35%',
    justifyContent: 'center', alignItems: 'center',
  },
  bottomInfo: {
    position: 'absolute', bottom: 70, left: 0, right: 80, padding: 16,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarLetter: { color: '#fff', fontWeight: '900', fontSize: 16 },
  username: { color: '#fff', fontWeight: '700', fontSize: 15 },
  verified: { color: '#20d5ec', fontSize: 14, marginLeft: 2 },
  followBtn: {
    borderWidth: 1.5, borderColor: '#fff', borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 3, marginLeft: 4,
  },
  followText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20 },
  earningRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  earningText: { color: '#ffd700', fontSize: 12 },
  actions: {
    position: 'absolute', right: 8, bottom: 80,
    alignItems: 'center', gap: 18,
  },
  actionBtn: { alignItems: 'center', gap: 2 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  discWrap: { marginTop: 4 },
  disc: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#222', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
});
