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
import OpinionCard from '../components/common/OpinionCard';

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
            <OpinionCard
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
