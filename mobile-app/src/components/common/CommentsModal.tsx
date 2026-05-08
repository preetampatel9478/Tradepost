import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { createComment } from '../../store/slices/postSlice';

export interface ApiComment {
  _id: string;
  post: string;
  parentComment?: string | null;
  author: {
    _id: string;
    userId: string;
    profilePhoto?: string;
  };
  content: string;
  isDeleted?: boolean;
  createdAt: string;
}

export function CommentsModal({
  visible,
  postId,
  onClose,
  onEngagementUpdated,
}: {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  onEngagementUpdated?: (payload: { postId: string; likeCount?: number; commentCount?: number }) => void;
}) {
  const dispatch = useAppDispatch();
  const { theme, colors } = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<ApiComment[]>([]);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ApiComment | null>(null);

  const commentsById = useMemo(() => {
    const map = new Map<string, ApiComment>();
    for (const c of comments) map.set(c._id, c);
    return map;
  }, [comments]);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/comments/${postId}`);
      setComments((res.data as ApiComment[]) || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!visible || !postId) return;
    fetchComments();
  }, [visible, postId, fetchComments]);

  useEffect(() => {
    if (!visible) {
      setText('');
      setReplyTo(null);
      setError(null);
      setComments([]);
      setLoading(false);
      setSending(false);
    }
  }, [visible]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!postId || !trimmed || sending) return;

    setSending(true);
    const result = await dispatch(
      createComment({
        postId,
        content: trimmed,
        parentCommentId: replyTo?._id,
      })
    );
    setSending(false);

    if (createComment.fulfilled.match(result)) {
      const newComment = result.payload.comment as ApiComment;
      setComments((prev) => [...prev, newComment]);
      onEngagementUpdated?.({
        postId,
        likeCount: (result.payload as any)?.likeCount,
        commentCount: (result.payload as any)?.commentCount,
      });
      setText('');
      setReplyTo(null);
      setError(null);
      return;
    }

    setError((result.payload as any) || 'Failed to send comment');
  };

  const renderItem = ({ item }: { item: ApiComment }) => {
    const parentId = item.parentComment ? String(item.parentComment) : null;
    const isReply = Boolean(parentId);
    const parent = parentId ? commentsById.get(parentId) : null;

    return (
      <View style={[styles.commentRow, isReply && styles.replyIndent]}> 
        {isReply ? <View style={[styles.replyBar, { backgroundColor: colors.border }]} /> : null}
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <View style={[styles.avatarWrap, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              {item.author?.profilePhoto ? (
                <Image source={{ uri: item.author.profilePhoto }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarFallback, { color: colors.text }]}>
                  {(item.author?.userId || 'T').slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.userId, { color: colors.text }]}>{item.author?.userId || 'Trader'}</Text>
              {isReply && parent ? (
                <Text style={[styles.replyingTo, { color: colors.textSecondary }]}>
                  Replying to @{parent.author?.userId || 'trader'}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setReplyTo(item)}
              style={[styles.replyBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.replyBtnText, { color: colors.textSecondary }]}>Reply</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.commentText, { color: colors.text }]}>
            {item.isDeleted ? 'Deleted' : item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <BlurView
          intensity={theme === 'light' ? 0 : 24}
          tint={theme === 'light' ? 'light' : 'dark'}
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.title, { color: colors.text }]}>Comments</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={[styles.closeBtn, { borderColor: colors.border }]}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
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
                onPress={fetchComments}
                style={[styles.retryBtn, { borderColor: colors.border, backgroundColor: colors.searchBg }]}
              >
                <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c._id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={[styles.composerWrap, { borderTopColor: colors.border }]}> 
            {replyTo ? (
              <View style={[styles.replyPill, { borderColor: colors.border, backgroundColor: colors.searchBg }]}> 
                <Text style={[styles.replyPillText, { color: colors.textSecondary }]}>
                  Replying to @{replyTo.author?.userId || 'trader'}
                </Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setReplyTo(null)}>
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.composerRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={replyTo ? 'Write a reply…' : 'Write a comment…'}
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.searchBg, borderColor: colors.border },
                ]}
                multiline
              />
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={sending || !text.trim()}
                onPress={onSend}
                style={[
                  styles.sendBtn,
                  { borderColor: colors.border, backgroundColor: colors.card, opacity: sending || !text.trim() ? 0.55 : 1 },
                ]}
              >
                <Text style={[styles.sendText, { color: colors.text }]}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 70,
    bottom: 24,
  },
  sheet: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  centerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  retryBtn: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  commentRow: {
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
  },
  replyIndent: {
    paddingLeft: 22,
  },
  replyBar: {
    width: 3,
    borderRadius: 2,
    marginTop: 6,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    fontSize: 13,
    fontWeight: '900',
  },
  headerText: {
    flex: 1,
  },
  userId: {
    fontSize: 13,
    fontWeight: '900',
  },
  replyingTo: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  replyBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  commentText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  composerWrap: {
    borderTopWidth: 1,
    padding: 12,
    gap: 10,
  },
  replyPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  composerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  sendBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
