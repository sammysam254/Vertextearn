import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, Dimensions, StyleSheet,
  Text, TouchableOpacity, Animated, Platform,
  ActivityIndicator, RefreshControl, Image, Share,
} from 'react-native';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
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

// ─── Red progress bar shown while video loads ──────────────────────────────
function LoadingBar({ visible }) {
  const anim = useRef(new Animated.Value(0)).current;
  const loop = useRef(null);

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      loop.current = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: false,
        })
      );
      loop.current.start();
    } else {
      loop.current?.stop();
      anim.setValue(0);
    }
    return () => loop.current?.stop();
  }, [visible]);

  if (!visible) return null;

  const width = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0%', '70%', '100%'],
  });

  return (
    <View style={lbStyles.track}>
      <Animated.View style={[lbStyles.bar, { width }]} />
    </View>
  );
}

const lbStyles = StyleSheet.create({
  track: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 100,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#fe2c55',
    borderRadius: 2,
  },
});

// ─── Single video item ─────────────────────────────────────────────────────
function VideoItem({ item, isActive, shouldPreload, onLikeChange, onUnload }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(item.is_liked);
  const [saved, setSaved] = useState(item.is_saved);
  const [likes, setLikes] = useState(item.likes_count);
  const [saves, setSaves] = useState(item.saves_count);
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;
  const tapTimer = useRef(null);
  const { apiFetch } = useAuth();

  // ── Play / pause / unload based on isActive ──────────────────────────────
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      setPaused(false);
      videoRef.current.playAsync().catch(() => {});
    } else {
      // Stop and unload when scrolled past — free memory
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
      if (!shouldPreload) {
        videoRef.current.unloadAsync().catch(() => {});
        setIsLoaded(false);
      }
    }
  }, [isActive, shouldPreload]);

  const flashPauseIcon = (show) => {
    Animated.sequence([
      Animated.timing(pauseIconOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(pauseIconOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  // ── Single tap = pause/play  Double tap = like ────────────────────────────
  const handleTap = () => {
    if (tapTimer.current) {
      // Double tap
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      handleDoubleTap();
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        // Single tap — toggle pause
        if (!videoRef.current) return;
        if (paused) {
          videoRef.current.playAsync().catch(() => {});
          setPaused(false);
        } else {
          videoRef.current.pauseAsync().catch(() => {});
          setPaused(true);
        }
        flashPauseIcon(!paused);
        Haptics.selectionAsync();
      }, 220);
    }
  };

  const showHeart = () => {
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      Animated.delay(500),
      Animated.timing(heartScale, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const handleDoubleTap = async () => {
    if (!liked) {
      setLiked(true);
      setLikes(l => l + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try { await apiFetch(`/videos/${item.id}/like/`, { method: 'POST' }); } catch {}
      onLikeChange?.();
    }
    showHeart();
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
    try { await apiFetch(`/videos/${item.id}/save/`, { method: 'POST' }); }
    catch { setSaved(wasSaved); }
  };

  const toggleFollow = async () => {
    try {
      await apiFetch(`/profile/${item.user?.username}/follow/`, { method: 'POST' });
      setFollowing(f => !f);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        title: `Watch @${item.user?.username} on Vertext`,
        message: `Check out this video on Vertext!\n\n"${item.caption}"\n\nby @${item.user?.username}\n\nhttps://vertext-backend-h1e0.onrender.com`,
        url: item.video_url || 'https://vertext-backend-h1e0.onrender.com',
      });
    } catch (e) {
      if (e.message !== 'User did not share') {
        console.log('Share error:', e);
      }
    }
  };

  const showVideo = (isActive || shouldPreload) && item.video_url && !loadError;

  return (
    <View style={styles.videoContainer}>

      {/* Loading bar — red sweep at top */}
      <LoadingBar visible={isActive && isBuffering && !paused} />

      {/* Video */}
      {showVideo ? (
        <ExpoVideo
          ref={videoRef}
          source={{
            uri: item.video_url,
            // Stream in 2-second segments (progressive download)
            overrideFileExtensionAndroid: 'mp4',
          }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={false}
          shouldPlay={isActive && !paused}
          useNativeControls={false}
          progressUpdateIntervalMillis={500}
          onLoad={() => { setIsLoaded(true); setIsBuffering(false); }}
          onLoadStart={() => setIsBuffering(true)}
          onReadyForDisplay={() => setIsBuffering(false)}
          onPlaybackStatusUpdate={(s) => {
            setIsBuffering(s.isBuffering || false);
          }}
          onError={() => setLoadError(true)}
        />
      ) : (
        <View style={styles.noVideo}>
          {item.thumbnail_url
            ? <Image source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <View style={{ flex: 1, backgroundColor: '#0a0a0a' }} />
          }
          {loadError && (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={28} color="#fe2c55" />
              <Text style={styles.errorText}>Video failed to load</Text>
            </View>
          )}
        </View>
      )}

      {/* Tap zone — covers whole screen */}
      <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} onResponderRelease={handleTap} />

      {/* Pause icon flash */}
      <Animated.View style={[styles.pauseIcon, { opacity: pauseIconOpacity }]} pointerEvents="none">
        <Ionicons name={paused ? 'pause' : 'play'} size={72} color="rgba(255,255,255,0.85)" />
      </Animated.View>

      {/* Double-tap heart */}
      <Animated.View
        style={[styles.heartOverlay, { transform: [{ scale: heartScale }], opacity: heartScale }]}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 90 }}>❤️</Text>
      </Animated.View>

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'transparent', 'transparent', 'rgba(0,0,0,0.88)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Ad badge */}
      {item.is_ad && (
        <View style={styles.adBadge} pointerEvents="none">
          <Text style={styles.adText}>SPONSORED</Text>
        </View>
      )}

      {/* Bottom info */}
      <View style={styles.bottomInfo} pointerEvents="box-none">
        <TouchableOpacity style={styles.userRow} onPress={() => {}} activeOpacity={0.8}>
          <View style={styles.avatarCircle}>
            {item.user?.avatar
              ? <Image source={{ uri: item.user.avatar }} style={styles.avatarImg} />
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
        </TouchableOpacity>
        {!!item.caption && (
          <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
        )}
      </View>

      {/* Right action bar */}
      <View style={styles.actions} pointerEvents="box-none">
        {/* Like */}
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={34} color={liked ? '#fe2c55' : '#fff'} />
          <Text style={styles.actionLabel}>{fmt(likes)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#fff" />
          <Text style={styles.actionLabel}>{fmt(item.comments_count)}</Text>
        </TouchableOpacity>

        {/* Share — fully working */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={32} color="#fff" />
          <Text style={styles.actionLabel}>{fmt(item.shares_count)}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={styles.actionBtn} onPress={toggleSave}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={30} color={saved ? '#ffd700' : '#fff'} />
          <Text style={styles.actionLabel}>{fmt(saves)}</Text>
        </TouchableOpacity>

        {/* Disc */}
        <View style={styles.discWrap}>
          <Animated.View style={styles.disc}>
            <Text style={{ fontSize: 18 }}>🎵</Text>
          </Animated.View>
        </View>
      </View>

      <CommentsModal visible={showComments} onClose={() => setShowComments(false)} videoId={item.id} />
    </View>
  );
}

// ─── Feed ──────────────────────────────────────────────────────────────────
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
    } catch {
      setError('Could not load videos. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { loadFeed(); }, [tab]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIdx(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 55 }).current;

  if (loading) return (
    <View style={styles.center}>
      {/* Red progress bar at very top when initially loading */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <LoadingBar visible={true} />
      </View>
      <Text style={{ color: '#555', fontSize: 15, marginTop: 60 }}>Loading Vertext...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Ionicons name="wifi-outline" size={52} color="#333" />
      <Text style={{ color: '#555', marginTop: 14, textAlign: 'center', paddingHorizontal: 40 }}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => loadFeed()}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (videos.length === 0) return (
    <View style={styles.center}>
      <Ionicons name="videocam-outline" size={68} color="#222" />
      <Text style={{ color: '#444', marginTop: 18, fontSize: 17, fontWeight: '700' }}>No Videos Yet</Text>
      <Text style={{ color: '#333', marginTop: 6, fontSize: 13 }}>Upload the first video!</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Tab bar */}
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
            // Preload next 5 videos, unload everything else
            shouldPreload={index > activeIdx && index <= activeIdx + 5}
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
        // windowSize controls how many screens are rendered — 11 = 5 above + active + 5 below
        windowSize={11}
        maxToRenderPerBatch={3}
        initialNumToRender={2}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(true)} tintColor="#fe2c55" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  videoContainer: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000', overflow: 'hidden' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  noVideo: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
  errorBox: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)', padding: 20, borderRadius: 14 },
  errorText: { color: '#fe2c55', marginTop: 8, fontSize: 13 },
  gradient: { ...StyleSheet.absoluteFillObject },
  pauseIcon: {
    position: 'absolute', top: '38%', left: '38%',
    justifyContent: 'center', alignItems: 'center',
  },
  heartOverlay: { position: 'absolute', top: '30%', left: '28%' },
  adBadge: { position: 'absolute', top: 86, left: 12, backgroundColor: 'rgba(254,44,85,0.92)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  adText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bottomInfo: { position: 'absolute', bottom: 68, left: 0, right: 82, padding: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarLetter: { color: '#fff', fontWeight: '900', fontSize: 18 },
  username: { color: '#fff', fontWeight: '700', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  verified: { color: '#20d5ec', fontSize: 14 },
  followBtn: { borderWidth: 1.5, borderColor: '#fff', borderRadius: 5, paddingHorizontal: 12, paddingVertical: 4 },
  followingBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.5)' },
  followText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  actions: { position: 'absolute', right: 6, bottom: 78, alignItems: 'center', gap: 18 },
  actionBtn: { alignItems: 'center', gap: 3, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  discWrap: { marginTop: 4 },
  disc: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  tabs: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', justifyContent: 'center', gap: 32,
    paddingTop: Platform.OS === 'android' ? 44 : 62,
    paddingBottom: 10,
  },
  tabBtn: { alignItems: 'center' },
  tabText: { color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  tabActive: { color: '#fff' },
  tabUnderline: { height: 2, width: 22, backgroundColor: '#fff', marginTop: 3, borderRadius: 1 },
  retryBtn: { marginTop: 22, backgroundColor: '#fe2c55', paddingHorizontal: 34, paddingVertical: 13, borderRadius: 10 },
});
