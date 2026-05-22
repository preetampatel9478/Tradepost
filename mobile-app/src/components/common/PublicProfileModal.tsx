import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { CommentsModal } from './CommentsModal';

const { width } = Dimensions.get('window');

type PublicProfile = {
  id: string;
  userId: string;
  name?: string;
  bio?: string;
  avatar?: string;
  createdAt?: string;
  allianceCount: number;
  postCount: number;
  isInAlliance?: boolean;
  isAllianceRequestSent?: boolean;
};

interface PublicProfileModalProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
}

export default function PublicProfileModal({ visible, userId, onClose }: PublicProfileModalProps) {
  const { theme, colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [followBusy, setFollowBusy] = useState(false);

  const [commentsForPostId, setCommentsForPostId] = useState<string | null>(null);

  const translateY = useRef(new Animated.Value(22)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const postMediaWidth = Math.max(220, width - 64);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 220 : 160,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: visible ? 0 : 22,
        damping: 18,
        stiffness: 140,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  useEffect(() => {
    if (!visible || !userId) return;

    let isMounted = true;
    setLoading(true);
    setProfile(null);

    (async () => {
      try {
        const res = await api.get(`/users/u/${encodeURIComponent(userId)}`);
        if (!isMounted) return;
        setProfile(res.data as PublicProfile);
      } catch {
        if (!isMounted) return;
        setProfile(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, userId]);

  useEffect(() => {
    if (!visible || !userId) return;

    let isMounted = true;
    setPostsLoading(true);
    setPosts([]);

    (async () => {
      try {
        const res = await api.get(`/users/u/${encodeURIComponent(userId)}/posts?limit=30&skip=0`);
        if (!isMounted) return;
        setPosts((res.data?.items as any[]) || []);
      } catch {
        if (!isMounted) return;
        setPosts([]);
      } finally {
        if (isMounted) setPostsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, userId]);

  const initials = useMemo(() => {
    const name = String(profile?.name || profile?.userId || 'Trader').trim();
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }, [profile?.name, profile?.userId]);

  const displayName = profile?.name?.trim() ? String(profile?.name).trim() : profile?.userId || 'Trader';
  const handle = profile?.userId ? `@${profile.userId}` : '';
  const bio = String(profile?.bio || '').trim();

  const allianceCount = Number(profile?.allianceCount || 0);
  const postCount = Number(profile?.postCount || 0);

  const isInAlliance = Boolean(profile?.isInAlliance);
  const isAllianceRequestSent = Boolean(profile?.isAllianceRequestSent);

  const formatCount = (n: number) => {
    if (!Number.isFinite(n)) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${Math.round(n / 1000)}k`;
    if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const toggleAlliance = async () => {
    if (!userId || !profile) return;
    if (followBusy) return;

    setFollowBusy(true);
    try {
      if (isInAlliance || isAllianceRequestSent) {
        // Un-alliance or cancel request
        const res = await api.delete(`/users/u/${encodeURIComponent(userId)}/alliance`);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isInAlliance: false,
                isAllianceRequestSent: false,
                allianceCount: Number(res.data?.targetAllianceCount ?? Math.max(0, (prev.allianceCount || 0) - 1)),
              }
            : prev
        );
      } else {
        // Send alliance request
        const res = await api.post(`/users/u/${encodeURIComponent(userId)}/alliance`);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isAllianceRequestSent: true,
                isInAlliance: res.data?.isInAlliance || false, // depending on auto-accept logic
                allianceCount: Number(res.data?.targetAllianceCount ?? (prev.allianceCount || 0) + (res.data?.isInAlliance ? 1 : 0)),
              }
            : prev
        );
      }
    } catch (e: any) {
      console.log('Alliance error', getApiErrorMessage(e));
    } finally {
      setFollowBusy(false);
    }
  };

  const close = () => {
    setCommentsForPostId(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity,
                backgroundColor: theme === 'light' ? 'rgba(15, 23, 42, 0.22)' : 'rgba(15, 23, 42, 0.62)',
              },
            ]}
          >
            <BlurView
              intensity={theme === 'light' ? 5 : 20}
              tint={theme === 'light' ? 'light' : 'dark'}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.cardShell,
            {
              transform: [{ translateY }],
              opacity,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
            <TouchableOpacity onPress={close} activeOpacity={0.85}>
              <Text style={[styles.closeText, { color: colors.verifiedBlue }]}>Close</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={colors.verifiedBlue} />
              <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 10 }]}>Loading profile…</Text>
            </View>
          ) : !profile ? (
            <View style={styles.centerPad}>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>Profile not available.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <View style={styles.heroRow}>
                <View style={[styles.avatarWrap, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  {profile.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
                  ) : (
                    <Text style={[styles.avatarFallback, { color: colors.text }]}>{initials}</Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {handle ? <Text style={[styles.handle, { color: colors.textSecondary }]}>{handle}</Text> : null}
                  {bio ? (
                    <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={3}>
                      {bio}
                    </Text>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.followButton,
                  {
                    backgroundColor: (isInAlliance || isAllianceRequestSent) ? colors.card : colors.verifiedBlue,
                    borderColor: colors.border,
                  },
                ]}
                onPress={toggleAlliance}
                disabled={followBusy}
              >
                <Text style={[styles.followText, { color: (isInAlliance || isAllianceRequestSent) ? colors.text : '#fff' }]}
                >
                  {followBusy ? 'Please wait…' : isInAlliance ? 'In Alliance' : isAllianceRequestSent ? 'Alliance Request Sent' : 'Send Alliance Request'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(allianceCount)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Alliance Members</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: colors.text }]}>🔥</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>30 Day Streak</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statCol}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{formatCount(postCount)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Posts</Text>

              {postsLoading ? (
                <View style={styles.centerPad}>
                  <ActivityIndicator color={colors.verifiedBlue} />
                  <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 10 }]}>Loading posts…</Text>
                </View>
              ) : posts.length === 0 ? (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>No posts yet.</Text>
              ) : (
                posts.map((p: any) => (
                  <View key={String(p._id)} style={[styles.postCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                  >
                    <Text style={[styles.postMeta, { color: colors.textSecondary }]}>
                      {new Date(p.createdAt).toLocaleString()} • {String(p.sentiment || 'neutral')}
                    </Text>
                    <Text style={[styles.postBody, { color: colors.text }]}>{String(p.content || '')}</Text>

                    {Array.isArray(p.mediaUrls) && p.mediaUrls.filter(Boolean).length ? (
                      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.mediaStrip}>
                        {p.mediaUrls
                          .filter(Boolean)
                          .slice(0, 5)
                          .map((uri: string, idx: number) => (
                            <View
                              key={`${String(p._id)}_${idx}`}
                              style={[styles.mediaFrame, { width: postMediaWidth, borderColor: colors.border, backgroundColor: colors.searchBg }]}
                            >
                              <Image source={{ uri }} style={styles.mediaImage} resizeMode="cover" />
                            </View>
                          ))}
                      </ScrollView>
                    ) : null}

                    <Text style={[styles.postMeta, { color: colors.textSecondary, marginTop: 10 }]}
                    >
                      ❤ {Number(p.likeCount || 0)}   💬 {Number(p.commentCount || 0)}
                    </Text>

                    <View style={styles.postActionsRow}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.actionChip, { borderColor: colors.border, backgroundColor: colors.searchBg }]}
                        onPress={() => setCommentsForPostId(String(p._id))}
                      >
                        <Text style={[styles.actionChipText, { color: colors.text }]}>View comments</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </Animated.View>

        <CommentsModal
          visible={Boolean(commentsForPostId)}
          postId={commentsForPostId}
          onClose={() => setCommentsForPostId(null)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardShell: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '88%',
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  centerPad: {
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 18,
    fontWeight: '900',
  },
  name: {
    fontSize: 18,
    fontWeight: '900',
  },
  handle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  bio: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  followButton: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  followText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  statsRow: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 26,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '900',
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  postMeta: {
    fontSize: 12,
    fontWeight: '800',
  },
  postBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  mediaStrip: {
    marginTop: 12,
  },
  mediaFrame: {
    height: 210,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 12,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  postActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
