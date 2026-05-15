import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, Dimensions, TouchableOpacity, Image, Share, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Heart, MessageCircle, Share2, MoreHorizontal, Play } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import api from '../services/api';
import { ApiPost } from '../store/slices/postSlice';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { CommentsModal } from '../components/common/CommentsModal';
import PublicProfileModal from '../components/common/PublicProfileModal';
import ReportPostModal from '../components/common/ReportPostModal';
import { useAppSelector } from '../hooks/reduxHooks';
import { BlurView } from 'expo-blur';
import { getValidatedMediaUrl } from '../utils/mediaHelper';

import { LinearGradient } from 'expo-linear-gradient';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

function getInitials(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VT';
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const ShortItem = ({
  post,
  isActive,
  insets,
  currentUserHandle,
  onOpenComments,
  onOpenProfile,
  onReport,
  onToggleLike
}: {
  post: ApiPost;
  isActive: boolean;
  insets: any;
  currentUserHandle?: string;
  onOpenComments: (id: string) => void;
  onOpenProfile: (id: string) => void;
  onReport: (post: ApiPost) => void;
  onToggleLike: (post: ApiPost) => void;
}) => {
  const { colors } = useTheme();
  const [isPaused, setIsPaused] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [localFollowed, setLocalFollowed] = useState(false);
  
  const videoUrl = React.useMemo(() => {
    return post.mediaUrls?.find(url => url.toLowerCase().match(/\.(mp4|mov|m4v)(\?.*)?$/)) || post.mediaUrls?.[0] || '';
  }, [post.mediaUrls]);

  const videoSource = React.useMemo(() => {
    return getValidatedMediaUrl(videoUrl);
  }, [videoUrl]);

  const player = useVideoPlayer(videoSource ? { uri: videoSource } : null, p => {
    if (!videoSource) return;
    p.loop = true;
    if (isActive && !isPaused) p.play();
  });

  useEffect(() => {
    if (!videoSource) return;
    if (isActive && !isPaused) {
      player.play();
    } else {
      player.pause();
    }
  }, [videoSource, isActive, isPaused, player]);

  const togglePlayPause = () => {
    setIsPaused(prev => !prev);
    setShowPlayIcon(true);
    setTimeout(() => {
      setShowPlayIcon(false);
    }, 1000);
  };

  const isLiked = Boolean(post.isLiked);
  const likeCount = Number(post.likeCount) || 0;
  const commentCount = Number(post.commentCount) || 0;
  
  const displayName = post.author?.userId || 'Trader';
  const avatarUrl = post.author?.profilePhoto;

  const isOwnPost = currentUserHandle === displayName;

  const handleInlineFollow = async () => {
    if (localFollowed || isOwnPost) return;
    try {
      setLocalFollowed(true);
      await api.post(`/users/u/${encodeURIComponent(displayName)}/follow`);
    } catch (e) {
      console.error(e);
      setLocalFollowed(false); // revert on failure
    }
  };

  return (
    <View style={[styles.shortContainer, { height: WINDOW_HEIGHT }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={togglePlayPause}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          allowsPictureInPicture={false}
          nativeControls={false}
          contentFit="cover"
          surfaceType={Platform.OS === 'android' ? 'textureView' : undefined}
        />
        
        {showPlayIcon && (
          <View style={styles.centerPlayIcon}>
            <Play size={60} color="rgba(255, 255, 255, 0.7)" fill="rgba(255, 255, 255, 0.7)" />
          </View>
        )}
      </Pressable>

      <View style={styles.overlay} pointerEvents="box-none">
        {/* Right side interactions */}
        <View style={[styles.rightActions, { bottom: insets.bottom + 100 }]}>
          <TouchableOpacity activeOpacity={0.8} style={styles.actionButton} onPress={() => onToggleLike(post)}>
             <Heart size={32} color={isLiked ? '#FF3B30' : '#FFFFFF'} fill={isLiked ? '#FF3B30' : 'transparent'} strokeWidth={isLiked ? 0 : 2} style={styles.iconShadow} />
             <Text style={styles.actionText}>{likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={styles.actionButton} onPress={() => onOpenComments(post._id)}>
             <MessageCircle size={32} color="#FFFFFF" strokeWidth={2} style={styles.iconShadow} />
             <Text style={styles.actionText}>{commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={styles.actionButton} onPress={async () => {
             try {
                await Share.share({ message: `${post.content}\n${videoUrl}` });
              } catch {}
          }}>
             <Share2 size={30} color="#FFFFFF" strokeWidth={2} style={styles.iconShadow} />
             <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={styles.actionButton} onPress={() => onReport(post)}>
             <MoreHorizontal size={24} color="#FFFFFF" strokeWidth={2.4} style={styles.iconShadow} />
          </TouchableOpacity>
        </View>

        {/* Bottom Left Info */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={[styles.bottomInfo, { paddingBottom: insets.bottom + 90 }]}
        >
          <View style={styles.profileRow}>
            <TouchableOpacity activeOpacity={0.8} style={styles.profileInfo} onPress={() => onOpenProfile(post.author?.userId || '')}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                   <Text style={styles.avatarFallbackText}>{getInitials(displayName)}</Text>
                </View>
              )}
              <Text style={styles.authorName}>@{displayName}</Text>
            </TouchableOpacity>

            {!isOwnPost && (
              !localFollowed ? (
                <TouchableOpacity 
                  style={styles.followButton} 
                  activeOpacity={0.8}
                  onPress={handleInlineFollow}
                >
                  <Text style={styles.followButtonText}>Follow</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.followButton, { borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.followButtonText, { color: '#E0E0E0' }]}>Following</Text>
                </View>
              )
            )}
          </View>
          <Text style={styles.contentDesc} numberOfLines={2}>
            {post.content}
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
};

export default function StockScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [commentsForPostId, setCommentsForPostId] = useState<string | null>(null);
  const [reportingPost, setReportingPost] = useState<ApiPost | null>(null);
  const [publicProfileUserId, setPublicProfileUserId] = useState<string | null>(null);
  const [publicProfileVisible, setPublicProfileVisible] = useState(false);

  const user = useAppSelector(state => state.auth.user);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const fetchShorts = async () => {
    try {
      const res = await api.get('/posts?hasVideo=true');
      const fetchedPosts = res.data || [];
      setPosts(fetchedPosts);
      if (fetchedPosts.length > 0 && !activeVideoId) {
        setActiveVideoId(fetchedPosts[0]._id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveVideoId(viewableItems[0].item._id);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60
  }).current;

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setRefreshing(true);
      fetchShorts();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchShorts();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShorts();
  }, []);

  const handlePostUpdated = (updated: ApiPost) => {
    setPosts(prev => prev.map(p => (p._id === updated._id ? updated : p)));
  };

  const handleOpenComments = (postId: string) => {
    setCommentsForPostId(postId);
  };

  const handleOpenProfile = (userId: string) => {
    setPublicProfileUserId(userId);
    setPublicProfileVisible(true);
  };

  const handleReportPost = (post: ApiPost) => {
    setReportingPost(post);
  };

  const handleToggleLike = async (post: ApiPost) => {
    try {
      const isCurrentlyLiked = post.isLiked;
      const url = `/posts/${post._id}/like`;
      const res = isCurrentlyLiked ? await api.delete(url) : await api.post(url, {});
      
      setPosts(prev => prev.map(p => {
        if (p._id === post._id) {
          return {
             ...p,
             isLiked: res.data.isLiked,
             likeCount: res.data.likeCount
          };
        }
        return p;
      }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {loading && posts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.verifiedBlue} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No shorts found.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id || String(Math.random())}
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={'#FFFFFF'}
            />
          }
          renderItem={({ item }) => (
            <ShortItem
              post={item}
              isActive={isFocused && activeVideoId === item._id}
              insets={insets}
              currentUserHandle={user?.userId}
              onOpenComments={handleOpenComments}
              onOpenProfile={handleOpenProfile}
              onReport={handleReportPost}
              onToggleLike={handleToggleLike}
            />
          )}
        />
      )}

      {commentsForPostId && (
        <CommentsModal
          visible={!!commentsForPostId}
          onClose={() => setCommentsForPostId(null)}
          postId={commentsForPostId}
        />
      )}

      {publicProfileVisible && publicProfileUserId && (
        <PublicProfileModal
          visible={publicProfileVisible}
          onClose={() => setPublicProfileVisible(false)}
          userId={publicProfileUserId}
        />
      )}

      {reportingPost && (
        <ReportPostModal
          visible={true}
          onClose={() => setReportingPost(null)}
          post={reportingPost}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  listContent: {
    paddingBottom: 100,
  },
  shortContainer: {
    width: WINDOW_WIDTH,
    backgroundColor: '#000',
    position: 'relative',
  },
  centerPlayIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    zIndex: 10,
    gap: 22,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 40,
    zIndex: 5,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#333',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  followButton: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  contentDesc: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
