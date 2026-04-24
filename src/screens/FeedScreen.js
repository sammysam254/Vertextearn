import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableWithoutFeedback, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, Alert, StatusBar, Platform,
} from 'react-native';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const FEED_ITEM_HEIGHT = H;

// ── Verification badge ─────────────────────────────────────────────────────
function VerifyBadge({ type }) {
  if (!type || type === 'none' || type === 'eligible_blue') return null;
  const color = type === 'blue' ? '#1d9bf0' : '#000';
  return (
    <Ionicons name="checkmark-circle" size={15} color={color} style={{ marginLeft: 3, marginTop: 1 }} />
  );
}

// ── Single video item ──────────────────────────────────────────────────────
function VideoItem({ item, isActive, onLike, onComment, onSave, onFollow }) {
  const videoRef  = useRef(null);
  const [muted, setMuted]     = useState(false);
  const [liked, setLiked]     = useState(item.is_liked || false);
  const [saved, setSaved]     = useState(item.is_saved || false);
  const [likes, setLikes]     = useState(item.likes_count || 0);
  const [loading, setLoading] = useState(true);
  const [showMuteIcon, setShowMuteIcon] = useState(false);
  const lastTap = useRef(0);
  const muteTimer = useRef(null);

  // Play/pause based on active index
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
    }
  }, [isActive]);

  const handleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap = like
      if (!liked) {
        setLiked(true);
        setLikes(l => l + 1);
        onLike(item.id);
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      // Single tap after delay = toggle mute
      setTimeout(() => {
        if (Date.now() - lastTap.current >= DOUBLE_TAP_DELAY - 10) {
          setMuted(m => {
            const next = !m;
            // Show mute/unmute icon briefly
            setShowMuteIcon(true);
            clearTimeout(muteTimer.current);
            muteTimer.current = setTimeout(() => setShowMuteIcon(false), 1200);
            return next;
          });
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleLikeBtn = () => {
    setLiked(l => !l);
    setLikes(l => liked ? l - 1 : l + 1);
    onLike(item.id);
  };

  const handleSave = () => {
    setSaved(s => !s);
    onSave(item.id);
  };

  return (
    <View style={styles.itemWrap}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={StyleSheet.absoluteFill}>
          {item.video_url ? (
            <ExpoVideo
              ref={videoRef}
              source={{ uri: item.video_url }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted={muted}
              shouldPlay={isActive}
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              useNativeControls={false}
              progressUpdateIntervalMillis={500}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="videocam-off-outline" size={48} color="#333" />
            </View>
          )}

          {/* Loading spinner */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#fff" size="large" />
            </View>
          )}

          {/* Mute/unmute flash icon */}
          {showMuteIcon && (
            <View style={styles.muteFlash}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={36} color="#fff" />
            </View>
          )}

          {/* Dark gradient at bottom */}
          <View style={styles.bottomGrad} pointerEvents="none" />
        </View>
      </TouchableWithoutFeedback>

      {/* Caption + user info */}
      <View style={styles.infoWrap} pointerEvents="none">
        <View style={styles.userRow}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>
              {(item.user?.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.username}>@{item.user?.username}</Text>
              <VerifyBadge type={item.user?.verification_type} />
            </View>
          </View>
        </View>
        <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
      </View>

      {/* Right action buttons */}
      <View style={styles.actionsWrap}>
        {/* Like */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleLikeBtn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={32} color={liked ? '#fe2c55' : '#fff'} />
          <Text style={styles.actionCount}>{likes > 999 ? `${(likes/1000).toFixed(1)}k` : likes}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(item)}>
          <Ionicons name="chatbubble-outline" size={29} color="#fff" />
          <Text style={styles.actionCount}>{item.comments_count || 0}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={29} color={saved ? '#ffe066' : '#fff'} />
          <Text style={styles.actionCount}>{item.saves_count || 0}</Text>
        </TouchableOpacity>

        {/* Follow */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => onFollow(item.user?.id)}>
          <Ionicons name="person-add-outline" size={27} color="#fff" />
        </TouchableOpacity>

        {/* Mute indicator */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => {
          setMuted(m => !m);
          setShowMuteIcon(true);
          clearTimeout(muteTimer.current);
          muteTimer.current = setTimeout(() => setShowMuteIcon(false), 1200);
        }}>
          <Ionicons name={muted ? 'volume-mute-outline' : 'volume-high-outline'} size={26} color={muted ? '#fe2c55' : '#fff'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Feed screen ────────────────────────────────────────────────────────────
export default function FeedScreen({ navigation }) {
  const [videos, setVideos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const { getToken, API_URL } = useAuth();

  const fetchFeed = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/feed/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Feed error:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchFeed();
    return () => {};
  }, []));

  const handleLike = async (videoId) => {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/videos/${videoId}/like/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {}
  };

  const handleSave = async (videoId) => {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/videos/${videoId}/save/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {}
  };

  const handleFollow = async (userId) => {
    if (!userId) return;
    try {
      const token = await getToken();
      await fetch(`${API_URL}/profile/${userId}/follow/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {}
  };

  const handleComment = (video) => {
    setSelectedVideo(video);
    setShowComments(true);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  if (loading) return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator color="#fe2c55" size="large" />
    </View>
  );

  if (!videos.length) return (
    <View style={styles.emptyScreen}>
      <Ionicons name="videocam-off-outline" size={56} color="#333" />
      <Text style={styles.emptyText}>No videos yet</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Upload')}>
        <Text style={styles.emptyBtnText}>Be the first to post</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <FlatList
        data={videos}
        keyExtractor={item => String(item.id)}
        pagingEnabled
        snapToInterval={FEED_ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: FEED_ITEM_HEIGHT, offset: FEED_ITEM_HEIGHT * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <VideoItem
            item={item}
            isActive={index === activeIndex}
            onLike={handleLike}
            onComment={handleComment}
            onSave={handleSave}
            onFollow={handleFollow}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loadingScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  emptyScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { color: '#555', fontSize: 16 },
  emptyBtn: { backgroundColor: '#fe2c55', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },

  itemWrap: { width: W, height: FEED_ITEM_HEIGHT, backgroundColor: '#000' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  muteFlash: { position: 'absolute', top: '45%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 50, padding: 14 },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, backgroundColor: 'transparent',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' },

  infoWrap: { position: 'absolute', bottom: 90, left: 14, right: 80 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fe2c55', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarLetter: { color: '#fff', fontWeight: '900', fontSize: 16 },
  username: { color: '#fff', fontWeight: '700', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  caption: { color: '#eee', fontSize: 14, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  actionsWrap: { position: 'absolute', right: 12, bottom: 100, alignItems: 'center', gap: 18 },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});
