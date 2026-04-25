import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, Dimensions, StyleSheet,
  Text, TouchableOpacity, Animated, Platform,
  RefreshControl, Image, Share,
} from 'react-native';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth, getCachedFeed, setCachedFeed } from '../context/AuthContext';
import CommentsModal from '../components/CommentsModal';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

function fmt(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

// ── Red sweeping progress bar at very top ─────────────────────────────────
function LoadingBar({ visible }) {
  const x = useRef(new Animated.Value(-SCREEN_W)).current;
  const anim = useRef(null);

  useEffect(() => {
    if (visible) {
      x.setValue(-SCREEN_W);
      anim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(x, { toValue: SCREEN_W, duration: 900, useNativeDriver: true }),
          Animated.timing(x, { toValue: -SCREEN_W, duration: 0, useNativeDriver: true }),
        ])
      );
      anim.current.start();
    } else {
      anim.current?.stop();
    }
    return () => anim.current?.stop();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={lb.track} pointerEvents="none">
      <Animated.View style={[lb.bar, { transform: [{ translateX: x }] }]} />
    </View>
  );
}

const lb = StyleSheet.create({
  track: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 3, backgroundColor: 'transparent', zIndex: 999, overflow: 'hidden',
  },
  bar: {
    width: SCREEN_W * 0.6, height: 3,
    backgroundColor: '#fe2c55',
    borderRadius: 2,
    shadowColor: '#fe2c55', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
  },
});

// ── Video card ─────────────────────────────────────────────────────────────
function VideoItem({ item, isActive, shouldPreload, onRefresh }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(item.is_liked);
  const [saved, setSaved] = useState(item.is_saved);
  const [likes, setLikes] = useState(item.likes_count);
  const [saves, setSaves] = useState(item.saves_count);
  const [views, setViews] = useState(item.views_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [following, setFollowing] = useState(item.user?.is_followed || false);
  const [deleted, setDeleted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const viewCounted = useRef(false);
  const viewTimer = useRef(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const pauseOpacity = useRef(new Animated.Value(0)).current;
  const tapTimer = useRef(null);
  const { apiFetch, user: authUser, guardDemo } = useAuth();

  // ── Control playback ──────────────────────────────────────────────────────
  // viewCounted resets only once per video mount, not per active change
  useEffect(() => { viewCounted.current = false; }, [item.id]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      setPaused(false);
      videoRef.current.playAsync().catch(() => {});
      // Count view after 5 seconds - only once per session
      if (!viewCounted.current) {
        viewTimer.current = setTimeout(async () => {
          if (!viewCounted.current) {
            viewCounted.current = true;
            try {
              const res = await apiFetch(`/videos/${item.id}/view/`, { method: 'POST' });
              if (res?.counted) setViews(v => v + 1);
            } catch {}
          }
        }, 5000);
      }
    } else {
      clearTimeout(viewTimer.current);
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
      if (!shouldPreload) {
        videoRef.current.unloadAsync().catch(() => {});
      }
    }
    return () => clearTimeout(viewTimer.current);
  }, [isActive, shouldPreload]);

  const flashIcon = () => {
    pauseOpacity.setValue(0.9);
    Animated.timing(pauseOpacity, { toValue: 0, duration: 500, delay: 300, useNativeDriver: true }).start();
  };

  // ── Tap handler — single=pause/play, double=like ─────────────────────────
  const handleTap = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      // Double tap = like
      if (!liked) {
        setLiked(true);
        setLikes(l => l + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        apiFetch(`/videos/${item.id}/like/`, { method: 'POST' }).catch(() => {});
        onRefresh?.();
      }
      heartScale.setValue(0);
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 22 }),
        Animated.delay(500),
        Animated.timing(heartScale, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        // Single tap = pause / resume
        if (!videoRef.current) return;
        if (paused) {
          videoRef.current.playAsync().catch(() => {});
          setPaused(false);
        } else {
          videoRef.current.pauseAsync().catch(() => {});
          setPaused(true);
        }
        flashIcon();
        Haptics.selectionAsync();
      }, 230);
    }
  };

  const toggleLike = async () => {
    if (guardDemo('like videos')) return;
    const was = liked;
    setLiked(!was); setLikes(l => was ? l - 1 : l + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await apiFetch(`/videos/${item.id}/like/`, { method: 'POST' }); onRefresh?.(); }
    catch { setLiked(was); setLikes(l => was ? l + 1 : l - 1); }
  };

  const toggleSave = async () => {
    if (guardDemo('save videos')) return;
    const was = saved;
    setSaved(!was); setSaves(s => was ? s - 1 : s + 1);
    try { await apiFetch(`/videos/${item.id}/save/`, { method: 'POST' }); }
    catch { setSaved(was); }
  };

  const deleteVideo = async () => {
    const { Alert } = require('react-native');
    Alert.alert('Delete Video', 'Are you sure you want to delete this video?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/videos/${item.id}/delete/`, { method: 'DELETE' });
          setDeleted(true);
        } catch (e) {
          Alert.alert('Error', 'Could not delete video');
        }
      }},
    ]);
  };

  const toggleFollow = async () => {
    if (guardDemo('follow creators')) return;
    try {
      await apiFetch(`/profile/u/${item.user?.username}/follow/`, { method: 'POST' });
      setFollowing(f => !f);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: `@${item.user?.username} on Vertext`,
        message: `Watch this on Vertext!\n\n"${item.caption}"\n— @${item.user?.username}\n\nhttps://vertext-backend-h1e0.onrender.com`,
      });
    } catch {}
  };

  const canShow = (isActive || shouldPreload) && !!item.video_url && !loadError;
  if (deleted) return null;

  return (
    <View style={S.card}>
      {/* Loading bar — slides across top while buffering */}
      <LoadingBar visible={isActive && buffering && !paused && !loadError} />

      {/* Video player */}
      {canShow ? (
        <ExpoVideo
          ref={videoRef}
          source={{ uri: item.video_url }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={false}
          shouldPlay={isActive && !paused}
          useNativeControls={false}
          progressUpdateIntervalMillis={250}
          onLoadStart={() => setBuffering(true)}
          onLoad={() => setBuffering(false)}
          onReadyForDisplay={() => setBuffering(false)}
          onPlaybackStatusUpdate={s => setBuffering(!!s.isBuffering)}
          onError={() => { setLoadError(true); setBuffering(false); }}
        />
      ) : (
        <View style={S.noVideo}>
          {item.thumbnail_url
            ? <Image source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <View style={{ flex: 1, backgroundColor: '#0a0a0a' }} />
          }
          {loadError && (
            <View style={S.errBox}>
              <Ionicons name="warning-outline" size={26} color="#fe2c55" />
              <Text style={S.errText}>Video failed to load</Text>
            </View>
          )}
        </View>
      )}

      {/* Full-screen tap zone */}
      <View style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleTap}
      />

      {/* Pause/play flash icon */}
      <Animated.View style={[S.pauseWrap, { opacity: pauseOpacity }]} pointerEvents="none">
        <View style={S.pauseCircle}>
          <Ionicons name={paused ? 'pause' : 'play'} size={44} color="#fff" />
        </View>
      </Animated.View>

      {/* Like heart animation */}
      <Animated.View style={[S.heart, { transform: [{ scale: heartScale }], opacity: heartScale }]} pointerEvents="none">
        <Text style={{ fontSize: 85 }}>❤️</Text>
      </Animated.View>

      {/* Dark gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'transparent', 'transparent', 'rgba(0,0,0,0.9)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Ad label */}
      {item.is_ad && (
        <View style={S.adBadge} pointerEvents="none">
          <Text style={S.adText}>SPONSORED</Text>
        </View>
      )}

      {/* Bottom: user + caption + views */}
      <View style={S.bottom} pointerEvents="box-none">
        <View style={S.userRow}>
          <View style={S.avatar}>
            {item.user?.avatar
              ? <Image source={{ uri: item.user.avatar }} style={S.avatarImg} />
              : <Text style={S.avatarLetter}>{item.user?.username?.[0]?.toUpperCase() || '?'}</Text>
            }
          </View>
          <Text style={S.username}>@{item.user?.username}</Text>
          {item.user?.is_verified && (
            <View style={[S.badgeWrap, item.user?.verification_type === 'blue' ? S.badgeBlue : S.badgeBlack]}>
              <Text style={S.badgeTick}>✓</Text>
            </View>
          )}
          <TouchableOpacity style={[S.followBtn, following && S.followingBtn]} onPress={toggleFollow}>
            <Text style={S.followTxt}>{following ? 'Following' : 'Follow'}</Text>
          </TouchableOpacity>
        </View>
        {!!item.caption && <Text style={S.caption} numberOfLines={3}>{item.caption}</Text>}
        <View style={S.viewsRow}>
          <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.7)" />
          <Text style={S.viewsTxt}>{fmt(views)} views</Text>
        </View>
      </View>

      {/* Right actions */}
      <View style={S.actions} pointerEvents="box-none">
        <TouchableOpacity style={S.btn} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={33} color={liked ? '#fe2c55' : '#fff'} />
          <Text style={S.btnLbl}>{fmt(likes)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.btn} onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-ellipses-outline" size={31} color="#fff" />
          <Text style={S.btnLbl}>{fmt(item.comments_count)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.btn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={31} color="#fff" />
        </TouchableOpacity>
        {item.user?.id === authUser?.id && (
          <TouchableOpacity style={S.btn} onPress={deleteVideo}>
            <Ionicons name="trash-outline" size={28} color="#ff4444" />
            <Text style={{color:'#ff4444', fontSize:11, marginTop:2}}>Delete</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={S.btn} onPress={handleShare}>
          <Text style={S.btnLbl}>{fmt(item.shares_count)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.btn} onPress={toggleSave}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={29} color={saved ? '#ffd700' : '#fff'} />
          <Text style={S.btnLbl}>{fmt(saves)}</Text>
        </TouchableOpacity>
        <View style={S.disc}><Text style={{ fontSize: 17 }}>🎵</Text></View>
      </View>

      <CommentsModal visible={showComments} onClose={() => setShowComments(false)} videoId={item.id} />
    </View>
  );
}

// ── Main feed screen ───────────────────────────────────────────────────────
export default function FeedScreen() {
  const [videos, setVideos] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [tab, setTab] = useState('foryou');
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingFresh, setFetchingFresh] = useState(false);
  const [error, setError] = useState('');
  const { apiFetch, user: authUser, guardDemo } = useAuth();

  const loadFeed = useCallback(async (isRefresh = false) => {
    setError('');

    // ── Step 1: Show cached data instantly (< 100ms) ──────────────────────
    if (!isRefresh) {
      const cached = await getCachedFeed();
      if (cached && cached.length > 0) {
        setVideos(cached);
        setInitialLoad(false);
        // Now fetch fresh in background without blocking UI
        setFetchingFresh(true);
        try {
          const fresh = await apiFetch('/feed/');
          const data = Array.isArray(fresh) ? fresh : (fresh.results || []);
          setVideos(data);
          await setCachedFeed(data);
        } catch {}
        setFetchingFresh(false);
        return;
      }
    }

    // ── Step 2: No cache — fetch with loading state ───────────────────────
    if (isRefresh) setRefreshing(true);
    else setInitialLoad(true);

    try {
      const endpoint = tab === 'foryou' ? '/feed/' : '/feed/following/';
      const data = await apiFetch(endpoint);
      const arr = Array.isArray(data) ? data : (data.results || []);
      setVideos(arr);
      await setCachedFeed(arr);
    } catch {
      if (videos.length === 0) setError('Could not load videos. Pull to retry.');
    } finally {
      setInitialLoad(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { loadFeed(); }, [tab]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIdx(viewableItems[0].index ?? 0);
  }, []);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 55 }).current;

  // ── Startup loading screen — shows red bar at top, no spinner ─────────────
  if (initialLoad) return (
    <View style={S.center}>
      <LoadingBar visible={true} />
      <View style={S.logoWrap}>
        <Text style={S.logoV}>V</Text>
        <Text style={S.logoTxt}>Vertext</Text>
      </View>
    </View>
  );

  if (error && videos.length === 0) return (
    <View style={S.center}>
      <Ionicons name="wifi-outline" size={50} color="#333" />
      <Text style={{ color: '#555', marginTop: 14, textAlign: 'center', paddingHorizontal: 40 }}>{error}</Text>
      <TouchableOpacity style={S.retryBtn} onPress={() => loadFeed()}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (!initialLoad && videos.length === 0) return (
    <View style={S.center}>
      <Ionicons name="videocam-outline" size={64} color="#222" />
      <Text style={{ color: '#444', marginTop: 16, fontSize: 16, fontWeight: '700' }}>No Videos Yet</Text>
      <Text style={{ color: '#333', marginTop: 6, fontSize: 13 }}>Be the first to upload!</Text>
    </View>
  );

  return (
    <View style={S.root}>
      {/* Background refresh indicator — subtle red bar at top */}
      <LoadingBar visible={fetchingFresh || refreshing} />

      {/* Tab bar */}
      <View style={S.tabs} pointerEvents="box-none">
        {['following', 'foryou'].map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={S.tabBtn}>
            <Text style={[S.tabTxt, tab === t && S.tabActive]}>
              {t === 'foryou' ? 'For You' : 'Following'}
            </Text>
            {tab === t && <View style={S.tabLine} />}
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
            shouldPreload={index > activeIdx && index <= activeIdx + 5}
            onRefresh={loadFeed}
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
        windowSize={13}
        maxToRenderPerBatch={3}
        initialNumToRender={1}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(true)} tintColor="#fe2c55" />
        }
      />
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  card: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000', overflow: 'hidden' },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  logoWrap: { alignItems: 'center' },
  logoV: { fontSize: 56, fontWeight: '900', color: '#fe2c55' },
  logoTxt: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: -8, letterSpacing: 2 },
  noVideo: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
  errBox: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 18, borderRadius: 12 },
  errText: { color: '#fe2c55', marginTop: 7, fontSize: 13 },
  pauseWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  pauseCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  heart: { position: 'absolute', top: '30%', left: '26%' },
  adBadge: { position: 'absolute', top: 88, left: 12, backgroundColor: 'rgba(254,44,85,0.92)', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  adText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bottom: { position: 'absolute', bottom: 68, left: 0, right: 84, padding: 14 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, flexWrap: 'wrap', gap: 6 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarLetter: { color: '#fff', fontWeight: '900', fontSize: 18 },
  username: { color: '#fff', fontWeight: '700', fontSize: 15 },
  badgeWrap: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginLeft: 3 },
  badgeBlue: { backgroundColor: '#1d9bf0' },
  badgeBlack: { backgroundColor: '#333', borderWidth: 1, borderColor: '#888' },
  badgeTick: { color: '#fff', fontSize: 10, fontWeight: '900', lineHeight: 13 },
  followBtn: { borderWidth: 1.5, borderColor: '#fff', borderRadius: 5, paddingHorizontal: 12, paddingVertical: 4 },
  followingBtn: { backgroundColor: 'rgba(255,255,255,0.18)' },
  followTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  actions: { position: 'absolute', right: 6, bottom: 76, alignItems: 'center', gap: 16 },
  btn: { alignItems: 'center', gap: 3, minWidth: 46, minHeight: 46, justifyContent: 'center' },
  btnLbl: { color: '#fff', fontSize: 12, fontWeight: '700' },
  disc: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', marginTop: 2 },
  tabs: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, flexDirection: 'row', justifyContent: 'center', gap: 32, paddingTop: Platform.OS === 'android' ? 44 : 62, paddingBottom: 10 },
  tabBtn: { alignItems: 'center' },
  tabTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '700' },
  tabActive: { color: '#fff' },
  tabLine: { height: 2, width: 22, backgroundColor: '#fff', marginTop: 3, borderRadius: 1 },
  retryBtn: { marginTop: 22, backgroundColor: '#fe2c55', paddingHorizontal: 34, paddingVertical: 13, borderRadius: 10 },
});
