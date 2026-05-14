import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { ChevronLeft, ChevronRight, Heart, MessageCircle, MoreHorizontal, Rocket, Share2, TrendingDown, Play } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { likePost, unlikePost, type ApiPost } from '../../store/slices/postSlice';
import { useVideoPlayer, VideoView } from 'expo-video';

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

export function HighlightedText({ text }: { text: string }) {
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

export function MediaItem({ url, style, isActive = true }: { url: string, style: any, isActive?: boolean }) {
  const isVideo = url.toLowerCase().match(/\.(mp4|mov|m4v)(\?.*)?$/);
  
  const [isPaused, setIsPaused] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  const player = useVideoPlayer(url, player => {
    player.loop = true;
    if (isActive && !isPaused) player.play();
  });
  
  React.useEffect(() => {
    if (isActive && !isPaused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isPaused, player]);

  const togglePlayPause = () => {
    setIsPaused(prev => !prev);
    setShowPlayIcon(true);
    setTimeout(() => {
      setShowPlayIcon(false);
    }, 1000);
  };

  if (isVideo) {
    return (
      <TouchableOpacity activeOpacity={1} style={style} onPress={togglePlayPause}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls={false}
          contentFit="cover"
        />
        {showPlayIcon && (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
            <Play size={48} color="rgba(255, 255, 255, 0.7)" fill="rgba(255, 255, 255, 0.7)" />
          </View>
        )}
      </TouchableOpacity>
    );
  }
  return <Image source={{ uri: url }} style={style} resizeMode="cover" />;
}

export default function OpinionCard({
  post,
  isActive = true,
  onOpenComments,
  onOpenProfile,
  onReportPost,
  onDeletePost,
  currentUserId,
  currentUserHandle,
  onPostUpdated,
}: {
  post: ApiPost;
  isActive?: boolean;
  onOpenComments: (postId: string) => void;
  onOpenProfile: (userId: string) => void;
  onReportPost?: () => void;
  onDeletePost?: (postId: string) => void;
  currentUserId?: string;
  currentUserHandle?: string;
  onPostUpdated?: (updated: ApiPost) => void;
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
    if (!currentUserId && !currentUserHandle) return false;
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
      if (onReportPost) {
        Alert.alert(
          'Post Options',
          'What would you like to do?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Report', style: 'destructive', onPress: onReportPost },
          ]
        );
      }
    } else {
      if (onDeletePost) {
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

  const toggleLike = async () => {
    try {
      const action = isLiked ? unlikePost({ postId: post._id }) : likePost({ postId: post._id });
      const result = await dispatch(action).unwrap();
      if (onPostUpdated) {
        onPostUpdated(result);
      }
    } catch {
      // ignore
    }
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

            {(onReportPost || onDeletePost) && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOptionsPress}
                style={[
                  styles.reportBtn,
                  { borderColor: colors.border, backgroundColor: 'transparent' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Post options"
              >
                <MoreHorizontal size={16} color={colors.textSecondary} strokeWidth={2.4} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={[styles.postContent, { color: colors.text }]}>
          <HighlightedText text={post.content} />
        </Text>

        {!!mediaUrls.length && (
          <View style={styles.mediaSection}>
            {mediaUrls.length === 1 ? (
              <View style={[styles.mediaSingleWrap, { borderColor: colors.border }]}>
                <MediaItem url={mediaUrls[0]} style={styles.mediaSingleImage} isActive={isActive} />
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
                      <MediaItem url={url} style={styles.carouselImage} isActive={isActive && carouselIndex === idx} />
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
            onPress={toggleLike}
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

const styles = StyleSheet.create({
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
  sentimentText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
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
});
