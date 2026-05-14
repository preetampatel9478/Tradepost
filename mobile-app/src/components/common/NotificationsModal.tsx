import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

export type ApiNotification = {
  _id: string;
  type: 'like' | 'comment';
  post?: {
    _id: string;
    content?: string;
    mediaUrls?: string[];
  } | string | null;
  comment?: string | null;
  message?: string;
  read?: boolean;
  createdAt: string;
  actor?: {
    _id: string;
    userId: string;
    name?: string;
    profilePhoto?: string;
  };
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

export default function NotificationsModal({
  visible,
  onClose,
  onMarkedRead,
  onOpenPost,
  onOpenProfile,
}: {
  visible: boolean;
  onClose: () => void;
  onMarkedRead?: () => void;
  onOpenPost?: (postId: string) => void;
  onOpenProfile?: (userId: string) => void;
}) {
  const { theme, colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notifications?limit=50&skip=0');
      setItems((res.data?.items as ApiNotification[]) || []);
    } catch (e: any) {
      setItems([]);
      setError(e?.response?.data?.message || e?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      onMarkedRead?.();
    } catch {
      // ignore
    }
  }, [onMarkedRead]);

  useEffect(() => {
    if (!visible) return;
    fetchNotifications();
  }, [visible, fetchNotifications]);

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      setItems([]);
      setError(null);
    }
  }, [visible]);

  const renderItem = ({ item }: { item: ApiNotification }) => {
    const actor = item.actor;
    const handle = actor?.userId || 'Trader';
    const displayName = actor?.name?.trim() ? actor?.name : handle;

    const title =
      item.type === 'like'
        ? `${displayName} liked your post`
        : `${displayName} commented on your post`;
    const subtitle = item.type === 'comment' ? String(item.message || '').trim() : '';

    const postObj = typeof item.post === 'object' && item.post ? item.post : null;
    const postContentSnippet = postObj?.content ? postObj.content.slice(0, 60) + (postObj.content.length > 60 ? '...' : '') : '';
    const postMediaUrl = postObj?.mediaUrls?.[0] || null;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={async () => {
          if (!item.read) {
            try {
              await api.put(`/notifications/${encodeURIComponent(item._id)}/read`);
              setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
              onMarkedRead?.();
            } catch {
              // ignore
            }
          }
          const pId = postObj?._id || (typeof item.post === 'string' ? item.post : null);
          if (pId) {
            onOpenPost?.(pId);
          }
        }}
        style={[
          styles.row,
          {
            borderColor: item.read ? colors.border : colors.verifiedBlue,
            backgroundColor: item.read ? colors.card : (theme === 'light' ? '#F0F9FF' : '#1A233A'),
            borderWidth: item.read ? 1 : 1.5,
          },
        ]}
      >
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation();
            if (actor?.userId) {
              onOpenProfile?.(actor.userId);
            }
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.avatar, { borderColor: item.read ? colors.border : colors.verifiedBlue, backgroundColor: colors.searchBg, borderWidth: item.read ? 1 : 2 }]}> 
            {actor?.profilePhoto ? (
              <Image source={{ uri: actor.profilePhoto }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarFallback, { color: colors.text }]}>{handle.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={[styles.title, { color: colors.text, fontWeight: item.read ? '600' : '800' }]} numberOfLines={2}>
              {title}
            </Text>
            <Text style={[styles.time, { color: item.read ? colors.textSecondary : colors.verifiedBlue, fontWeight: item.read ? '400' : '600' }]}>{timeAgo(item.createdAt)}</Text>
          </View>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: item.read ? colors.textSecondary : colors.text, fontWeight: item.read ? '400' : '500' }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          
          {(postContentSnippet || postMediaUrl) && (
            <View style={[styles.postPreview, { backgroundColor: colors.searchBg, borderColor: colors.border }]}> 
              {postMediaUrl && (
                <Image source={{ uri: postMediaUrl }} style={styles.postPreviewImage} />
              )}
              {postContentSnippet ? (
                <Text style={[styles.postPreviewText, { color: colors.textSecondary }]} numberOfLines={1}>
                  "{postContentSnippet}"
                </Text>
              ) : null}
            </View>
          )}
        </View>
        
        {!item.read && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.verifiedBlue, marginLeft: 8, marginTop: 4 }} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView
          intensity={theme === 'light' ? 5 : 18}
          tint={theme === 'light' ? 'light' : 'dark'}
          style={StyleSheet.absoluteFillObject}
        />
      </Pressable>

      <View style={styles.sheetWrap}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}> 
          <View style={[styles.header, { borderBottomColor: colors.border }]}> 
            <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
            <View style={styles.headerRight}>
              {unreadCount > 0 ? (
                <TouchableOpacity onPress={markAllRead} activeOpacity={0.85}>
                  <Text style={[styles.headerAction, { color: colors.verifiedBlue }]}>Mark all read</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={styles.closeBtn}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerPad}>
              <ActivityIndicator color={colors.verifiedBlue} />
              <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 10 }]}>Loading…</Text>
            </View>
          ) : error ? (
            <View style={styles.centerPad}>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>{error}</Text>
              <TouchableOpacity onPress={fetchNotifications} activeOpacity={0.85} style={[styles.retryBtn, { borderColor: colors.border }]}> 
                <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.centerPad}>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>No notifications yet.</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => i._id}
              renderItem={renderItem}
              contentContainerStyle={styles.listPad}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerAction: {
    fontSize: 13,
    fontWeight: '800',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPad: {
    padding: 14,
    paddingBottom: 22,
  },
  centerPad: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    fontSize: 16,
    fontWeight: '900',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  postPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  postPreviewImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 8,
  },
  postPreviewText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 11,
    fontWeight: '700',
  },
  markReadBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
