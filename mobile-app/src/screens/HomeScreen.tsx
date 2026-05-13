import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Rocket,
  Search,
  Share2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import ProfileModal from '../components/common/ProfileModal';
import PublicProfileModal from '../components/common/PublicProfileModal';
import { CommentsModal } from '../components/common/CommentsModal';
import NotificationsModal from '../components/common/NotificationsModal';
import ReportPostModal from '../components/common/ReportPostModal';
import { useTheme } from '../contexts/ThemeContext';
import {
  fetchPosts,
  deletePost,
  likePost,
  patchPostEngagement,
  type ApiPost,
  unlikePost,
} from '../store/slices/postSlice';
import { disconnectSocket, getAuthedSocket } from '../services/socket';
import api from '../services/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const feedScrollRef = useRef<ScrollView | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [commentsForPostId, setCommentsForPostId] = useState<string | null>(null);
  const [publicProfileUserId, setPublicProfileUserId] = useState<string | null>(null);
  const [publicProfileVisible, setPublicProfileVisible] = useState(false);
  const [reportingPost, setReportingPost] = useState<ApiPost | null>(null);
  const user = useAppSelector(state => state.auth.user);
  const userName = user?.name ?? 'Trader';
  const userAvatar = user?.avatar;
  const userInitials = getInitials(userName);
  const currentUserVerified = user?.isVerified ?? false;
  const currentUserId = user?.id ? String(user.id) : '';
  const currentUserHandle = user?.userId ? String(user.userId) : '';
  const postsState = useAppSelector(state => state.posts);
  const { theme, colors } = useTheme();

  const isLoadingRef = useRef(false);
  useEffect(() => {
    isLoadingRef.current = postsState.isLoading;
  }, [postsState.isLoading]);

  const scrollFeedToTop = useCallback((animated: boolean) => {
    feedScrollRef.current?.scrollTo({ y: 0, animated });
  }, []);

  const refreshFeed = useCallback(() => {
    if (isLoadingRef.current) return;
    dispatch(fetchPosts());
  }, [dispatch]);

  const refreshUnreadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadNotifications(Number(res.data?.unread ?? 0));
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadNotifications();
      return () => undefined;
    }, [refreshUnreadNotifications])
  );

  useEffect(() => {
    // Initial load
    refreshFeed();
  }, [refreshFeed]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      scrollFeedToTop(true);
      refreshUnreadNotifications();
      refreshFeed();
    });

    return unsubscribe;
  }, [navigation, refreshFeed, refreshUnreadNotifications, scrollFeedToTop]);

  useEffect(() => {
    let socketCleanup: (() => void) | null = null;

    (async () => {
      try {
        const socket = await getAuthedSocket();
        const handler = (payload: { postId: string; likeCount: number; commentCount: number }) => {
          dispatch(patchPostEngagement(payload));
        };
        const notifHandler = () => {
          refreshUnreadNotifications();
        };
        socket.on('posts:engagementUpdated', handler);
        socket.on('notifications:new', notifHandler);
        socketCleanup = () => {
          socket.off('posts:engagementUpdated', handler);
          socket.off('notifications:new', notifHandler);
        };
      } catch {
        // ignore
      }
    })();

    return () => {
      socketCleanup?.();
      disconnectSocket();
    };
  }, [dispatch, refreshUnreadNotifications]);

  const posts: ApiPost[] = postsState.posts as ApiPost[];

  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<
    Array<{ _id: string; userId: string; profilePhoto?: string }>
  >([]);
  const [userSearching, setUserSearching] = useState(false);

  useEffect(() => {
    const trimmed = userQuery.trim();
    const t = setTimeout(async () => {
      if (!trimmed) {
        setUserResults([]);
        setUserSearching(false);
        return;
      }

      setUserSearching(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(trimmed)}`);
        setUserResults((res.data as any[]) || []);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearching(false);
      }
    }, 280);

    return () => clearTimeout(t);
  }, [userQuery]);

  const openPublicProfile = (userId: string | undefined) => {
    const trimmed = String(userId || '').trim();
    if (!trimmed) return;
    setPublicProfileUserId(trimmed);
    setPublicProfileVisible(true);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
      />
      <View style={[styles.topGlow, styles.topGlowOne]} />
      <View style={[styles.topGlow, styles.topGlowTwo]} />
      <View style={[styles.topGlow, styles.topGlowThree]} />

      <ScrollView
        ref={r => {
          feedScrollRef.current = r;
        }}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 16) + 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.avatarButton}
            onPress={() => setModalVisible(true)}
          >
            <View
              style={[
                styles.avatarShell,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitials, { color: colors.text }]}>{userInitials}</Text>
              )}
              <View style={[styles.activeDotGlow, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <View style={[styles.activeDot, { borderColor: colors.card }]} />
              </View>
            </View>
          </TouchableOpacity>

          <BlurView
            intensity={theme === 'light' ? 0 : 28}
            tint={theme === 'light' ? 'light' : 'dark'}
            style={[
              styles.searchShell,
              { backgroundColor: colors.searchBg, borderColor: colors.border },
            ]}
          >
            <Search size={18} color={theme === 'light' ? '#64748B' : '#94A3B8'} strokeWidth={2.2} />
            <TextInput
              placeholder="Search users..."
              placeholderTextColor={theme === 'light' ? '#64748B' : '#94A3B8'}
              style={[styles.searchInput, { color: colors.text }]}
              value={userQuery}
              onChangeText={setUserQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </BlurView>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.notifButton,
              { backgroundColor: colors.searchBg, borderColor: colors.border },
            ]}
            onPress={() => setNotificationsVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color={colors.textSecondary} strokeWidth={2.2} />
            {unreadNotifications > 0 ? (
              <View
                style={[
                  styles.notifBadge,
                  { backgroundColor: colors.bearish, borderColor: colors.card },
                ]}
              >
                <Text style={styles.notifBadgeText}>
                  {unreadNotifications > 99 ? '99+' : String(unreadNotifications)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {userSearching || userResults.length ? (
          <View
            style={[
              styles.userResultsCard,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            {userSearching ? (
              <Text style={[styles.userResultsHint, { color: colors.textSecondary }]}>
                Searching…
              </Text>
            ) : null}
            {userResults.map(u => (
              <TouchableOpacity
                key={u._id}
                activeOpacity={0.85}
                style={[styles.userRow, { borderTopColor: colors.border }]}
                onPress={() => openPublicProfile(u.userId)}
              >
                <View
                  style={[
                    styles.userAvatar,
                    { borderColor: colors.border, backgroundColor: colors.searchBg },
                  ]}
                >
                  {u.profilePhoto ? (
                    <Image source={{ uri: u.profilePhoto }} style={styles.userAvatarImg} />
                  ) : (
                    <Text style={[styles.userAvatarFallback, { color: colors.text }]}>
                      {(u.userId || 'T').slice(0, 1).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.text }]}>{u.userId}</Text>
                  <Text style={[styles.userHandle, { color: colors.textSecondary }]}>
                    @{u.userId}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {postsState.error ? (
          <View
            style={[
              styles.errorBanner,
              {
                borderColor: colors.border,
                backgroundColor: theme === 'light' ? '#FEF2F2' : 'rgba(244, 63, 94, 0.08)',
              },
            ]}
          >
            <Text
              style={[styles.errorText, { color: theme === 'light' ? '#B91C1C' : colors.bearish }]}
            >
              {postsState.error}
            </Text>
          </View>
        ) : null}

        {!postsState.isLoading && !postsState.error && posts.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Go to “Post Your Opinion” and publish your first post.
            </Text>
          </View>
        ) : null}

        {posts.map((post: ApiPost) => (
          <OpinionCard
            key={post._id}
            post={post}
            onOpenComments={postId => setCommentsForPostId(postId)}
            onOpenProfile={userId => openPublicProfile(userId)}
            onReportPost={() => setReportingPost(post)}
            onDeletePost={async (postId) => {
              try {
                await api.delete(`/posts/${postId}`);
                dispatch(deletePost(postId));
              } catch (error) {
                Alert.alert('Error', 'Failed to delete post.');
              }
            }}
            currentUserId={currentUserId}
            currentUserHandle={currentUserHandle}
          />
        ))}
      </ScrollView>
      <ProfileModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        onMarkedRead={() => setUnreadNotifications(0)}
      />
      <PublicProfileModal
        visible={publicProfileVisible}
        userId={publicProfileUserId}
        onClose={() => setPublicProfileVisible(false)}
      />
      <CommentsModal
        visible={Boolean(commentsForPostId)}
        postId={commentsForPostId}
        onClose={() => setCommentsForPostId(null)}
      />
      <ReportPostModal
        visible={Boolean(reportingPost)}
        post={reportingPost}
        onClose={() => setReportingPost(null)}
      />
    </View>
  );
}

function OpinionCard({
  post,
  onOpenComments,
  onOpenProfile,
  onReportPost,
  onDeletePost,
  currentUserId,
  currentUserHandle,
}: {
  post: ApiPost;
  onOpenComments: (postId: string) => void;
  onOpenProfile: (userId: string) => void;
  onReportPost: () => void;
  onDeletePost?: (postId: string) => void;
  currentUserId: string;
  currentUserHandle: string;
}) {
  const sentiment = post.sentiment || 'neutral';
  const bullish = sentiment === 'bullish';
  const showSentiment = sentiment === 'bullish' || sentiment === 'bearish';
  const { theme, colors } = useTheme();
  const dispatch = useAppDispatch();

  const likeCount = Number(post.likeCount) || 0;
  const commentCount = Number(post.commentCount) || 0;
  const isLiked = Boolean(post.isLiked);

  const mediaUrls = useMemo(
    () => (post.mediaUrls || []).filter(Boolean).slice(0, 5),
    [post.mediaUrls]
  );
  const carouselRef = useRef<ScrollView | null>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const displayName = useMemo(() => post.author?.userId || 'Trader', [post.author?.userId]);
  const handle = useMemo(
    () => (post.author?.userId ? `@${post.author.userId}` : '@trader'),
    [post.author?.userId]
  );
  const avatarUrl = post.author?.profilePhoto;
  const authorUserId = post.author?.userId;
  const canReport = useMemo(() => {
    const authorId = String(post.author?._id || '').trim();
    const authorHandle = String(post.author?.userId || '').trim();
    const myId = String(currentUserId || '').trim();
    const myHandle = String(currentUserHandle || '').trim();
    const isOwnById = Boolean(myId && authorId && myId === authorId);
    const isOwnByHandle = Boolean(
      myHandle && authorHandle && myHandle.toLowerCase() === authorHandle.toLowerCase()
    );
    return !(isOwnById || isOwnByHandle);
  }, [currentUserHandle, currentUserId, post.author?._id, post.author?.userId]);

  const handleOptionsPress = useCallback(() => {
    if (canReport) {
      Alert.alert(
        'Post Options',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Report', style: 'destructive', onPress: onReportPost },
        ]
      );
    } else {
      Alert.alert(
        'Post Options',
        'Would you like to delete this post?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: () => {
              if (onDeletePost) onDeletePost(post._id);
            } 
          },
        ]
      );
    }
  }, [canReport, onReportPost, onDeletePost, post._id]);

  const createdAt = useMemo(() => {
    const d = new Date(post.createdAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }, [post.createdAt]);

  const scrollToIndex = (index: number) => {
    if (!carouselRef.current || !carouselWidth) return;
    carouselRef.current.scrollTo({ x: index * carouselWidth, animated: true });
  };

  const goPrev = () => {
    const next = Math.max(0, carouselIndex - 1);
    setCarouselIndex(next);
    scrollToIndex(next);
  };

  const goNext = () => {
    const next = Math.min(mediaUrls.length - 1, carouselIndex + 1);
    setCarouselIndex(next);
    scrollToIndex(next);
  };

  return (
    <View style={[styles.cardShell, theme === 'light' && styles.cardLightShadow]}>
      <BlurView
        intensity={theme === 'light' ? 0 : 22}
        tint={theme === 'light' ? 'light' : 'dark'}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: theme === 'light' ? 0 : 1,
          },
        ]}
      >
        <View style={styles.cardTopRow}>
          <TouchableOpacity
            style={styles.identityRow}
            activeOpacity={0.85}
            onPress={() => (authorUserId ? onOpenProfile(authorUserId) : null)}
          >
            <View style={[styles.cardAvatarWrap, { borderColor: colors.border }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.cardAvatarImage} />
              ) : (
                <View
                  style={[
                    styles.cardAvatarFallback,
                    { backgroundColor: theme === 'light' ? '#F1F5F9' : '#1E293B' },
                  ]}
                >
                  <Text style={[styles.cardAvatarText, { color: colors.text }]}>
                    {getInitials(displayName)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.identityCopy}>
              <Text style={[styles.cardName, { color: colors.text }]}>{displayName}</Text>
              <Text style={[styles.cardHandle, { color: colors.textSecondary }]}>
                {handle}
                {createdAt ? ` · ${createdAt}` : ''}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.cardTopRight}>
            {showSentiment ? (
              <View
                style={[
                  styles.sentimentBadge,
                  bullish
                    ? {
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderColor: 'rgba(16, 185, 129, 0.2)',
                      }
                    : {
                        backgroundColor: 'rgba(244, 63, 94, 0.15)',
                        borderColor: 'rgba(244, 63, 94, 0.2)',
                      },
                ]}
              >
                {bullish ? (
                  <Rocket size={15} color={colors.bullish} strokeWidth={2.4} />
                ) : (
                  <TrendingDown size={15} color={colors.bearish} strokeWidth={2.6} />
                )}
                <Text
                  style={[
                    styles.sentimentText,
                    bullish ? { color: colors.bullish } : { color: colors.bearish },
                  ]}
                >
                  {sentiment.toUpperCase()}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOptionsPress}
              style={[
                styles.reportBtn,
                { borderColor: colors.border, backgroundColor: colors.searchBg },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Post options"
            >
              <MoreHorizontal size={16} color={colors.textSecondary} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.postContent, { color: colors.text }]}>
          <HighlightedText text={post.content} />
        </Text>

        {!!mediaUrls.length && (
          <View style={styles.mediaSection}>
            {mediaUrls.length === 1 ? (
              <View style={[styles.mediaSingleWrap, { borderColor: colors.border }]}>
                <Image
                  source={{ uri: mediaUrls[0] }}
                  style={styles.mediaSingleImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View
                style={[
                  styles.carouselWrap,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
                onLayout={e => {
                  const w = Math.floor(e.nativeEvent.layout.width);
                  if (w && w !== carouselWidth) setCarouselWidth(w);
                }}
              >
                <ScrollView
                  ref={r => {
                    carouselRef.current = r;
                  }}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={e => {
                    if (!carouselWidth) return;
                    const x = e.nativeEvent.contentOffset.x;
                    const idx = Math.round(x / carouselWidth);
                    setCarouselIndex(Math.max(0, Math.min(mediaUrls.length - 1, idx)));
                  }}
                >
                  {mediaUrls.map((url, idx) => (
                    <View
                      key={`${url}_${idx}`}
                      style={{ width: carouselWidth || Dimensions.get('window').width }}
                    >
                      <Image
                        source={{ uri: url }}
                        style={styles.carouselImage}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.carouselArrow,
                    styles.carouselArrowLeft,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  activeOpacity={0.85}
                  onPress={goPrev}
                  disabled={carouselIndex <= 0}
                >
                  <ChevronLeft size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.carouselArrow,
                    styles.carouselArrowRight,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  activeOpacity={0.85}
                  onPress={goNext}
                  disabled={carouselIndex >= mediaUrls.length - 1}
                >
                  <ChevronRight size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={[styles.engagementRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.engagementItem}
            activeOpacity={0.8}
            onPress={() => {
              if (isLiked) dispatch(unlikePost({ postId: post._id }));
              else dispatch(likePost({ postId: post._id }));
            }}
          >
            <Heart
              size={18}
              color={isLiked ? colors.bearish : colors.textSecondary}
              fill={isLiked ? colors.bearish : 'transparent'}
              strokeWidth={2.2}
            />
            <Text style={[styles.engagementText, { color: colors.textSecondary }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.engagementItem}
            activeOpacity={0.8}
            onPress={() => onOpenComments(post._id)}
          >
            <MessageCircle size={18} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={[styles.engagementText, { color: colors.textSecondary }]}>
              {commentCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.engagementItem}
            activeOpacity={0.8}
            onPress={async () => {
              try {
                const media = Array.isArray(post.mediaUrls) ? post.mediaUrls.filter(Boolean) : [];
                const firstUrl = media.length ? `\n${media[0]}` : '';
                await Share.share({ message: `${post.content}${firstUrl}` });
              } catch {
                // ignore
              }
            }}
          >
            <Share2 size={18} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={[styles.engagementText, { color: colors.textSecondary }]}>0</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.disclaimerBox,
            { backgroundColor: theme === 'light' ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)' },
          ]}
        >
          <Text style={[styles.disclaimerText, { color: colors.disclaimer }]}>
            This post is my opinion, not a suggestion. Consult a SEBI registered advisor before
            investing.
          </Text>
        </View>
      </BlurView>
    </View>
  );
}

function HighlightedText({ text }: { text: string }) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const tokens = useMemo(() => {
    const regex = /([@#$][A-Za-z0-9_]{1,32})/g;
    return String(text || '')
      .split(regex)
      .filter(t => t.length > 0);
  }, [text]);

  return (
    <Text>
      {tokens.map((token, idx) => {
        const isMention = token.startsWith('@');
        const isTag = token.startsWith('#');
        const isStock = token.startsWith('$');
        if (!isMention && !isTag && !isStock) return <Text key={`${idx}-t`}>{token}</Text>;
        return (
          <Text
            key={`${idx}-h`}
            style={[
              styles.highlightToken,
              {
                color: isMention ? colors.verifiedBlue : isStock ? colors.bearish : colors.bullish,
              },
            ]}
            onPress={
              isTag
                ? () => {
                    const parent = navigation.getParent?.();
                    if (parent) parent.navigate('TagFeed', { tag: token });
                    else navigation.navigate('TagFeed', { tag: token });
                  }
                : undefined
            }
          >
            {token}
          </Text>
        );
      })}
    </Text>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'VT';
  }

  return parts
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  topGlow: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.85,
  },
  topGlowOne: {
    top: -120,
    right: -60,
    width: 220,
    height: 220,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  topGlowTwo: {
    top: 160,
    left: -90,
    width: 180,
    height: 180,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  topGlowThree: {
    bottom: 240,
    right: -100,
    width: 240,
    height: 240,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Ensure 12px gap
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 14,
  },

  errorBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
  },

  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  avatarButton: {
    marginRight: 0,
  },
  avatarShell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarInitials: {
    color: '#E2E8F0',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  activeDotGlow: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  searchShell: {
    flex: 1,
    height: 48, // matching Avatar height
    borderRadius: 24, // perfectly pill-shaped
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    overflow: 'hidden',
  },
  notifButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  searchInput: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  userResultsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  userResultsHint: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '800',
  },
  userRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userAvatarFallback: {
    fontSize: 14,
    fontWeight: '900',
  },
  userName: {
    fontSize: 13,
    fontWeight: '900',
  },
  userHandle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  feedIntroCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  feedIntroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  feedIntroLabel: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  feedIntroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    maxWidth: '88%',
  },
  feedIntroText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
  },
  verificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  verificationText: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '700',
  },
  cardShell: {
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  cardLightShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cardAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  cardAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tickBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#0F172A',
    borderRadius: 999,
  },
  identityCopy: {
    flex: 1,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardHandle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  bullishBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    borderColor: 'rgba(34, 197, 94, 0.22)',
  },
  bearishBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.22)',
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  bullishText: {
    color: '#86EFAC',
  },
  bearishText: {
    color: '#FDBA74',
  },
  tradeTypePill: {
    alignSelf: 'flex-start',
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tradeTypeText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '800',
  },
  postContent: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  mediaSection: {
    marginBottom: 12,
  },
  mediaSingleWrap: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mediaSingleImage: {
    width: '100%',
    height: '100%',
  },
  carouselWrap: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  carouselImage: {
    width: '100%',
    height: 260,
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
  },
  carouselArrowLeft: {
    left: 10,
  },
  carouselArrowRight: {
    right: 10,
  },
  highlightToken: {
    fontWeight: '900',
  },
  visualShell: {
    marginBottom: 14,
  },
  visualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visualLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  visualMeta: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  pnlShell: {
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
  },
  pnlHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  pnlTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  pnlMeta: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  pnlButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pnlButtonText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  pnlTable: {
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  pnlTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  pnlCellLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  pnlCellValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pnlPositive: {
    color: '#86EFAC',
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  engagementText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimerBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
  },
  disclaimerText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
