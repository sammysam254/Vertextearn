import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, Dimensions, StyleSheet,
  TouchableWithoutFeedback, Text, TouchableOpacity,
  Animated, Platform, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Video as ExpoVideo, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import CommentsModal from '../components/CommentsModal';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

function fmt(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function VideoItem({ item, isActive, onLikeChange, preload }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(item.is_liked);
  const [saved, setSaved] = useState(item.is_saved);
  const [likes, setLikes] = useState(item.likes_count);
  const [saves, setSaves] = useState(item.saves_count);
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState(false);
  const [videoStatus, setVideoStatus] = useState({});
  const [loadError, setLoadError] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const tapRef = useRef(null);
  const { apiFetch } = useAuth();

  useEffect(() => {
    if (!videoRef.current || !item.video_url) return;
    if (isActive) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
    }
  }, [isActive, item.video_url]);

  const showHeart = () => {
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      Animated.delay(600),
      Animated.timing(heartScale, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleDoubleTap = async () => {
    if (!liked) {
      setLiked(true);
      setLikes(l => l + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try { await apiFetch(`/videos/${item.id}/like/`, { method: 'POST' }); } catch {}
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

  const toggleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes(l => wasLiked ? l - 1 : l + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiFetch(`/videos/${item.id}/like/`, { method: 'POST' });
      onLikeChange?.();
    } catch {
      setLiked(wasLiked);
      setLikes(l => wasLiked ? l + 1 : l - 1);
    }
  };

  const toggleSave = async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    setSaves(s => wasSaved ? s - 1 : s + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await apiFetch(`/videos/${item.id}/save/`, { method: 'POST' }); }
    catch { setSaved(wasSaved); }
  };

  const toggleFollow = async () => {
    try {
      await apiFetch(`/profile/${item.user?.username}/follow/`, { method: 'POST' });
      setFollowing(f => !f);
    } catch {}
  };

  const isPlaying = videoStatus.isPlaying;
  const isLoading = videoStatus.isBuffering || (!videoStatus.isLoaded && !loadError && !!item.video_url);

  return (
    <View style={styles.videoContainer}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={StyleSheet.absoluteFill}>

          {item.video_url && !loadError ? (
            <ExpoVideo
              ref={videoRef}
              source={{ uri: item.video_url }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted={muted}
              shouldPlay={isActive}
              useNativeControls={false}
              onPlaybackStatusUpdate={setVideoStatus}
              onError={(e) => {
                console.log('Video error:', e, item.video_url);
                setLoadError(true);
              }}
              progressUpdateIntervalMillis={500}
            />
          ) : (
            <View style={styles.noVideo}>
              {item.thumbnail_url
                ? <Image source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                : null
              }
              {loadError && (
                <View style={styles.errorOverlay}>
                  <Ionicons name="warning-outline" size={32} color="#fe2c55" />
                  <Text style={{ color: '#fe2c55', marginTop: 8, fontSize: 13 }}>Video failed to load</Text>
                  <Text style={{ color: '#666', marginTop: 4, fontSize: 11 }}>{item.video_url ? 'Check connection' : 'No video file'}</Text>
                </View>
              )}
            </View>
          )}

          {/* Loading spinner */}
          {isLoading && !loadError && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {item.is_ad && (
            <View style={styles.adBadge}>
              <Text style={styles.adText}>SPONSORED</Text>
            </View>
          )}

          {muted && (
            <View style={styles.muteIcon}>
              <Ionicons name="volume-mute" size={18} color="#fff" />
            </View>
          )}

          <Animated.View
            style={[styles.heartOverlay, { transform: [{ scale: heartScale }], opacity: heartScale }]}
            pointerEvents="none"
          >
            <Text style={{ fontSize: 90 }}>❤️</Text>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      {/* Bottom info */}
      <View style={styles.bottomInfo} pointerEvents="box-none">
        <View style={styles.userRow}>
          <View style={styles.avatarCircle}>
            {item.user?.avatar
              ? <Image source={{ uri: item.user.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              : <Text style={styles.avatarLetter}>{item.user?.username?.[0]?.toUpperCase() || '?'}</Text>
            }
          </View>
          <Text style={styles.username}>@{item.user?.username}</Text>
          {item.user?.is_verified && <Text style={styles.verified}>✓</Text>}
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followingBtn]}
            onPress={toggleFollow}
          >
            <Text style={styles.followText}>{following ? 'Following' : 'Follow'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
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
          <Text style={styles.actionLabel}>{fmt(saves)}</Text>
        </TouchableOpacity>

        <View style={styles.discWrap}>
          <View style={styles.disc}>
            <Text style={{ fontSize: 18 }}>🎵</Text>
          </View>
        </View>
      </View>

      <CommentsModal visible={showComments} onClose={() => setShowComments(false)} videoId={item.id} />
    </View>
  );
}

export default function FeedScreen() {
  const [videos, setVideos] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [tab, setTab] = useState('foryou');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { apiFetch } = useAuth();

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const endpoint = tab === 'foryou' ? '/feed/' : '/feed/following/';
      const data = await apiFetch(endpoint);
      setVideos(Array.isArray(data) ? data : (data.results || []));
    } catch (e) {
      setError('Could not load videos. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { loadFeed(); }, [tab]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIdx(viewableItems[0].index ?? 0);
  }, []);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#fe2c55" />
      <Text style={{ color: '#555', marginTop: 14, fontSize: 15 }}>Loading videos...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Ionicons name="wifi-outline" size={52} color="#444" />
      <Text style={{ color: '#666', marginTop: 14, textAlign: 'center', paddingHorizontal: 40 }}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => loadFeed()}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (videos.length === 0) return (
    <View style={styles.center}>
      <Ionicons name="videocam-outline" size={68} color="#2a2a2a" />
      <Text style={{ color: '#444', marginTop: 18, fontSize: 17, fontWeight: '600' }}>No videos yet</Text>
      <Text style={{ color: '#333', marginTop: 6, fontSize: 13 }}>Upload the first video!</Text>
    </View>
  );

  return (
    <View style={styles.root}>
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
            preload={Math.abs(index - activeIdx) <= 2}
            onLikeChange={() => loadFeed()}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        getItemLayout={(_, i) => ({ length: SCREEN_H, offset: SCREEN_H * i, index: i })}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        removeClippedSubviews
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(true)} tintColor="#fe2c55" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  videoContainer: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  noVideo: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  errorOverlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20, borderRadius: 12 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  tabs: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, flexDirection: 'row', justifyContent: 'center', gap: 32, paddingTop: Platform.OS === 'android' ? 44 : 62, paddingBottom: 12 },
  tabBtn: { alignItems: 'center' },
  tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '700' },
  tabActive: { color: '#fff' },
  tabUnderline: { height: 2, width: 20, backgroundColor: '#fff', marginTop: 2, borderRadius: 1 },
  adBadge: { position: 'absolute', top: 84, left: 12, backgroundColor: 'rgba(254,44,85,0.9)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  adText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  muteIcon: { position: 'absolute', top: 84, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 },
  heartOverlay: { position: 'absolute', top: '33%', left: '28%' },
  bottomInfo: { position: 'absolute', bottom: 68, left: 0, right: 80, padding: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  avatarLetter: { color: '#fff', fontWeight: '900', fontSize: 18 },
  username: { color: '#fff', fontWeight: '700', fontSize: 15 },
  verified: { color: '#20d5ec', fontSize: 14 },
  followBtn: { borderWidth: 1.5, borderColor: '#fff', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 4 },
  followingBtn: { backgroundColor: 'rgba(255,255,255,0.15)' },
  followText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20 },
  actions: { position: 'absolute', right: 8, bottom: 80, alignItems: 'center', gap: 20 },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  discWrap: { marginTop: 4 },
  disc: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  retryBtn: { marginTop: 20, backgroundColor: '#fe2c55', paddingHorizontal: 32, paddingVertical: 13, borderRadius: 10 },
});
