import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, Dimensions, StyleSheet,
  TouchableWithoutFeedback, Text, TouchableOpacity,
  Animated, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import CommentsModal from '../components/CommentsModal';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

function fmt(n) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function VideoItem({ item, isActive, onLikeChange }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(item.is_liked);
  const [saved, setSaved] = useState(item.is_saved);
  const [likes, setLikes] = useState(item.likes_count);
  const [saves, setSaves] = useState(item.saves_count);
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
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
      Animated.delay(500),
      Animated.timing(heartScale, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleDoubleTap = async () => {
    if (!liked && !likeLoading) {
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
    if (likeLoading) return;
    setLikeLoading(true);
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
    setLikeLoading(false);
  };

  const toggleSave = async () => {
    if (saveLoading) return;
    setSaveLoading(true);
    const wasSaved = saved;
    setSaved(!wasSaved);
    setSaves(s => wasSaved ? s - 1 : s + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await apiFetch(`/videos/${item.id}/save/`, { method: 'POST' }); } catch {
      setSaved(wasSaved);
    }
    setSaveLoading(false);
  };

  const toggleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      await apiFetch(`/profile/${item.user.username}/follow/`, { method: 'POST' });
      setFollowing(f => !f);
    } catch {}
    setFollowLoading(false);
  };

  const videoUrl = item.video_url || item.video_file;

  return (
    <View style={styles.videoContainer}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={StyleSheet.absoluteFill}>
          {videoUrl ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted={muted}
              shouldPlay={false}
              useNativeControls={false}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.noVideo]}>
              <Ionicons name="videocam-off" size={48} color="#555" />
              <Text style={{ color: '#555', marginTop: 8 }}>Video unavailable</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(0,0,0,0.85)']}
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
              <Ionicons name="volume-mute" size={20} color="#fff" />
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
              : <Text style={styles.avatarLetter}>{item.user?.username?.[0]?.toUpperCase()}</Text>
            }
          </View>
          <Text style={styles.username}>@{item.user?.username}</Text>
          {item.user?.is_verified && <Text style={styles.verified}>✓</Text>}
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followingBtn]}
            onPress={toggleFollow}
            disabled={followLoading}
          >
            {followLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.followText}>{following ? 'Following' : 'Follow'}</Text>
            }
          </TouchableOpacity>
        </View>
        <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
      </View>

      {/* Right actions */}
      <View style={styles.actions} pointerEvents="box-none">
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike} disabled={likeLoading}>
          {likeLoading
            ? <ActivityIndicator color={liked ? '#fe2c55' : '#fff'} size={28} />
            : <Ionicons name={liked ? 'heart' : 'heart-outline'} size={34} color={liked ? '#fe2c55' : '#fff'} />
          }
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

        <TouchableOpacity style={styles.actionBtn} onPress={toggleSave} disabled={saveLoading}>
          {saveLoading
            ? <ActivityIndicator color={saved ? '#ffd700' : '#fff'} size={28} />
            : <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={30} color={saved ? '#ffd700' : '#fff'} />
          }
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
      setError('Failed to load videos. Pull down to retry.');
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
      <Text style={{ color: '#666', marginTop: 12 }}>Loading videos...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Ionicons name="wifi-outline" size={48} color="#555" />
      <Text style={{ color: '#666', marginTop: 12, textAlign: 'center', paddingHorizontal: 32 }}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => loadFeed()}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (videos.length === 0) return (
    <View style={styles.center}>
      <Ionicons name="videocam-outline" size={64} color="#333" />
      <Text style={{ color: '#555', marginTop: 16, fontSize: 16 }}>No videos yet</Text>
      <Text style={{ color: '#444', marginTop: 6, fontSize: 13 }}>Be the first to upload!</Text>
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
            onLikeChange={loadFeed}
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
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={2}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(true)} tintColor="#fe2c55" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  videoContainer: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  noVideo: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  tabs: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', justifyContent: 'center', gap: 32,
    paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 12,
  },
  tabBtn: { alignItems: 'center' },
  tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '700' },
  tabActive: { color: '#fff' },
  tabUnderline: { height: 2, width: 20, backgroundColor: '#fff', marginTop: 2, borderRadius: 1 },
  adBadge: { position: 'absolute', top: 80, left: 12, backgroundColor: 'rgba(254,44,85,0.9)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  adText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  muteIcon: { position: 'absolute', top: 80, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  heartOverlay: { position: 'absolute', top: '35%', left: '30%', justifyContent: 'center', alignItems: 'center' },
  bottomInfo: { position: 'absolute', bottom: 70, left: 0, right: 80, padding: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  avatarLetter: { color: '#fff', fontWeight: '900', fontSize: 18 },
  username: { color: '#fff', fontWeight: '700', fontSize: 15 },
  verified: { color: '#20d5ec', fontSize: 14 },
  followBtn: { borderWidth: 1.5, borderColor: '#fff', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 4, minWidth: 70, alignItems: 'center' },
  followingBtn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  followText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20 },
  actions: { position: 'absolute', right: 8, bottom: 80, alignItems: 'center', gap: 20 },
  actionBtn: { alignItems: 'center', gap: 3, minHeight: 44 },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  discWrap: { marginTop: 4, alignItems: 'center' },
  disc: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  retryBtn: { marginTop: 20, backgroundColor: '#fe2c55', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
});
