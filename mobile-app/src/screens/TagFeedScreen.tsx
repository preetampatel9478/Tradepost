import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Rocket, Share2, TrendingDown } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch } from '../hooks/reduxHooks';
import { likePost, type ApiPost, unlikePost } from '../store/slices/postSlice';
import PublicProfileModal from '../components/common/PublicProfileModal';
import { CommentsModal } from '../components/common/CommentsModal';

type RouteParams = { tag?: string };

export default function TagFeedScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();

  const tag = useMemo(() => {
    const raw = String((route.params as RouteParams | undefined)?.tag ?? '').trim();
    if (!raw) return '';
    return raw.startsWith('#') ? raw : `#${raw}`;
  }, [route.params]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);

  const [commentsForPostId, setCommentsForPostId] = useState<string | null>(null);
  const [publicProfileUserId, setPublicProfileUserId] = useState<string | null>(null);
  const [publicProfileVisible, setPublicProfileVisible] = useState(false);

  const fetchTagPosts = useCallback(async () => {
    if (!tag) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/posts?tag=${encodeURIComponent(tag)}`);
      setPosts((res.data as ApiPost[]) || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    fetchTagPosts();
  }, [fetchTagPosts]);

  const openPublicProfile = (userId: string | undefined) => {
    const trimmed = String(userId || '').trim();
    if (!trimmed) return;
    setPublicProfileUserId(trimmed);
    setPublicProfileVisible(true);
  };

  const onPostUpdated = useCallback((updated: ApiPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  }, []);

  const onEngagementUpdated = useCallback((payload: { postId: string; likeCount?: number; commentCount?: number }) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id !== payload.postId
          ? p
          : {
              ...p,
              ...(typeof payload.likeCount === 'number' ? { likeCount: payload.likeCount } : {}),
              ...(typeof payload.commentCount === 'number' ? { commentCount: payload.commentCount } : {}),
            }
      )
    );
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: Math.max(insets.top, 18), paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <ChevronLeft size={18} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>{tag || '#tag'}</Text>

          <View style={{ width: 40, height: 40 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator />
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.errorText, { color: colors.bearish }]}>{error}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={fetchTagPosts}
            style={[styles.retryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={[styles.centerText, { color: colors.textSecondary }]}>No posts found for {tag}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 110 }}
          showsVerticalScrollIndicator={false}
        >
          {posts.map((p) => (
            <TagOpinionCard
              key={p._id}
              post={p}
              onOpenComments={(id) => setCommentsForPostId(id)}
              onOpenProfile={(userId) => openPublicProfile(userId)}
              onPostUpdated={onPostUpdated}
            />
          ))}
        </ScrollView>
      )}

      <CommentsModal
        visible={Boolean(commentsForPostId)}
        postId={commentsForPostId}
        onClose={() => setCommentsForPostId(null)}
        onEngagementUpdated={onEngagementUpdated}
      />

      <PublicProfileModal
        visible={publicProfileVisible}
        userId={publicProfileUserId}
        onClose={() => setPublicProfileVisible(false)}
      />
    </View>
  );

  function TagOpinionCard({
    post,
    onOpenComments,
    onOpenProfile,
    onPostUpdated,
  }: {
    post: ApiPost;
    onOpenComments: (postId: string) => void;
    onOpenProfile: (userId: string) => void;
    onPostUpdated: (updated: ApiPost) => void;
  }) {
    const sentiment = post.sentiment || 'neutral';
    const bullish = sentiment === 'bullish';
    const showSentiment = sentiment === 'bullish' || sentiment === 'bearish';

    const likeCount = Number(post.likeCount) || 0;
    const commentCount = Number(post.commentCount) || 0;
    const isLiked = Boolean(post.isLiked);

    const mediaUrls = useMemo(() => (post.mediaUrls || []).filter(Boolean).slice(0, 5), [post.mediaUrls]);

    const carouselRef = React.useRef<ScrollView | null>(null);
    const [carouselWidth, setCarouselWidth] = useState(0);
    const [carouselIndex, setCarouselIndex] = useState(0);

    const goPrev = useCallback(() => {
      if (!carouselWidth) return;
      const nextIndex = Math.max(0, carouselIndex - 1);
      carouselRef.current?.scrollTo({ x: nextIndex * carouselWidth, animated: true });
      setCarouselIndex(nextIndex);
    }, [carouselIndex, carouselWidth]);

    const goNext = useCallback(() => {
      if (!carouselWidth) return;
      const nextIndex = Math.min(mediaUrls.length - 1, carouselIndex + 1);
      carouselRef.current?.scrollTo({ x: nextIndex * carouselWidth, animated: true });
      setCarouselIndex(nextIndex);
    }, [carouselIndex, carouselWidth, mediaUrls.length]);

    const displayName = useMemo(() => post.author?.userId || 'Trader', [post.author?.userId]);
    const handle = useMemo(() => (post.author?.userId ? `@${post.author.userId}` : '@trader'), [post.author?.userId]);
    const avatarUrl = post.author?.profilePhoto;
    const authorUserId = post.author?.userId;
    const createdAt = useMemo(() => {
      const d = new Date(post.createdAt);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString();
    }, [post.createdAt]);

    const toggleLike = async () => {
      try {
        const action = isLiked ? unlikePost({ postId: post._id }) : likePost({ postId: post._id });
        const result = await dispatch(action).unwrap();
        onPostUpdated(result);
      } catch {
        // ignore
      }
    };

    return (
      <View style={[cardStyles.cardShell, theme === 'light' && cardStyles.cardLightShadow]}>
        <BlurView
          intensity={theme === 'light' ? 0 : 22}
          tint={theme === 'light' ? 'light' : 'dark'}
          style={[
            cardStyles.card,
            { backgroundColor: colors.card, borderColor: colors.border, borderWidth: theme === 'light' ? 0 : 1 },
          ]}
        >
          <View style={cardStyles.cardTopRow}>
            <TouchableOpacity
              style={cardStyles.identityRow}
              activeOpacity={0.85}
              onPress={() => (authorUserId ? onOpenProfile(authorUserId) : null)}
            >
              <View style={[cardStyles.cardAvatarWrap, { borderColor: colors.border }]}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={cardStyles.cardAvatarImage} />
                ) : (
                  <View
                    style={[
                      cardStyles.cardAvatarFallback,
                      { backgroundColor: theme === 'light' ? '#F1F5F9' : '#1E293B' },
                    ]}
                  >
                    <Text style={[cardStyles.cardAvatarText, { color: colors.text }]}>{getInitials(displayName)}</Text>
                  </View>
                )}
              </View>

              <View style={cardStyles.identityCopy}>
                <Text style={[cardStyles.cardName, { color: colors.text }]}>{displayName}</Text>
                <Text style={[cardStyles.cardHandle, { color: colors.textSecondary }]}>
                  {handle}
                  {createdAt ? ` · ${createdAt}` : ''}
                </Text>
              </View>
            </TouchableOpacity>

            {showSentiment ? (
              <View
                style={[
                  cardStyles.sentimentBadge,
                  bullish
                    ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.2)' }
                    : { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.2)' },
                ]}
              >
                {bullish ? (
                  <Rocket size={15} color={colors.bullish} strokeWidth={2.4} />
                ) : (
                  <TrendingDown size={15} color={colors.bearish} strokeWidth={2.6} />
                )}
                <Text
                  style={[cardStyles.sentimentText, bullish ? { color: colors.bullish } : { color: colors.bearish }]}
                >
                  {sentiment.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[cardStyles.postContent, { color: colors.text }]}>{post.content}</Text>

          {!!mediaUrls.length && (
            <View style={cardStyles.mediaSection}>
              {mediaUrls.length === 1 ? (
                <View style={[cardStyles.mediaSingleWrap, { borderColor: colors.border }]}>
                  <Image source={{ uri: mediaUrls[0] }} style={cardStyles.mediaSingleImage} resizeMode="cover" />
                </View>
              ) : (
                <View
                  style={[cardStyles.carouselWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onLayout={(e) => {
                    const w = Math.floor(e.nativeEvent.layout.width);
                    if (w && w !== carouselWidth) setCarouselWidth(w);
                  }}
                >
                  <ScrollView
                    ref={(r) => {
                      carouselRef.current = r;
                    }}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={(e) => {
                      if (!carouselWidth) return;
                      const x = e.nativeEvent.contentOffset.x;
                      const idx = Math.round(x / carouselWidth);
                      setCarouselIndex(Math.max(0, Math.min(mediaUrls.length - 1, idx)));
                    }}
                  >
                    {mediaUrls.map((url, idx) => (
                      <View key={`${url}_${idx}`} style={{ width: carouselWidth || Dimensions.get('window').width }}>
                        <Image source={{ uri: url }} style={cardStyles.carouselImage} resizeMode="cover" />
                      </View>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={[
                      cardStyles.carouselArrow,
                      cardStyles.carouselArrowLeft,
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
                      cardStyles.carouselArrow,
                      cardStyles.carouselArrowRight,
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

          <View style={[cardStyles.engagementRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={cardStyles.engagementItem} activeOpacity={0.8} onPress={toggleLike}>
              <Heart
                size={18}
                color={isLiked ? colors.bearish : colors.textSecondary}
                fill={isLiked ? colors.bearish : 'transparent'}
                strokeWidth={2.2}
              />
              <Text style={[cardStyles.engagementText, { color: colors.textSecondary }]}>{likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cardStyles.engagementItem} activeOpacity={0.8} onPress={() => onOpenComments(post._id)}>
              <MessageCircle size={18} color={colors.textSecondary} strokeWidth={2.2} />
              <Text style={[cardStyles.engagementText, { color: colors.textSecondary }]}>{commentCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={cardStyles.engagementItem}
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
              <Text style={[cardStyles.engagementText, { color: colors.textSecondary }]}>0</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              cardStyles.disclaimerBox,
              { backgroundColor: theme === 'light' ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)' },
            ]}
          >
            <Text style={[cardStyles.disclaimerText, { color: colors.disclaimer }]}>
              This post is my opinion, not a suggestion. Consult a SEBI registered advisor before investing.
            </Text>
          </View>
        </BlurView>
      </View>
    );
  }
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'VT';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { height: 40, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  refreshText: { fontSize: 12, fontWeight: '900' },
  title: { fontSize: 16, fontWeight: '900' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  centerText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  errorText: { fontSize: 13, fontWeight: '900', textAlign: 'center' },
  retryBtn: { marginTop: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  retryText: { fontSize: 13, fontWeight: '900' },
});

const cardStyles = StyleSheet.create({
  cardShell: {
    borderRadius: 18,
    marginBottom: 14,
  },
  cardLightShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardAvatarImage: { width: '100%', height: '100%' },
  cardAvatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { fontSize: 14, fontWeight: '900' },
  identityCopy: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '900' },
  cardHandle: { marginTop: 2, fontSize: 12, fontWeight: '700' },
  sentimentBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sentimentText: { fontSize: 11, fontWeight: '900' },
  postContent: { paddingHorizontal: 14, paddingTop: 10, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  mediaSection: { marginTop: 12, paddingHorizontal: 14, paddingBottom: 12 },
  mediaSingleWrap: { width: '100%', height: 240, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  mediaSingleImage: { width: '100%', height: '100%' },

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
  engagementRow: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  engagementItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  engagementText: { fontSize: 12, fontWeight: '800' },

  disclaimerBox: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disclaimerText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
