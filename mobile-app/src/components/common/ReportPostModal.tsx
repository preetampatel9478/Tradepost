import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { ChevronRight, X } from 'lucide-react-native';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import type { ApiPost } from '../../store/slices/postSlice';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'fake_stock_tips'
  | 'scam'
  | 'hate_speech'
  | 'misinformation';

const REASONS: Array<{ key: ReportReason; label: string }> = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'fake_stock_tips', label: 'Fake stock tips' },
  { key: 'scam', label: 'Scam' },
  { key: 'hate_speech', label: 'Hate speech' },
  { key: 'misinformation', label: 'Misinformation' },
];

export default function ReportPostModal({
  visible,
  post,
  onClose,
  onSubmitted,
}: {
  visible: boolean;
  post: ApiPost | null;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const { theme, colors } = useTheme();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const postId = post?._id;
  const authorHandle = useMemo(() => post?.author?.userId || 'trader', [post?.author?.userId]);

  useEffect(() => {
    if (!visible) {
      setReason('spam');
      setNote('');
      setSubmitting(false);
    }
  }, [visible]);

  const submit = async () => {
    if (!postId || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/posts/${encodeURIComponent(postId)}/report`, {
        reason,
        note: note.trim() || undefined,
      });
      onSubmitted?.();
      Alert.alert('Reported', 'Thanks for reporting. We’ll review it.');
      onClose();
    } catch (e: any) {
      Alert.alert('Could not report', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <BlurView
          intensity={theme === 'light' ? 0 : 24}
          tint={theme === 'light' ? 'light' : 'dark'}
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Report post</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                Reporting @{authorHandle}
              </Text>
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={[styles.closeBtn, { borderColor: colors.border }]}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Reason</Text>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.key}
              activeOpacity={0.85}
              onPress={() => setReason(r.key)}
              style={[
                styles.choiceRow,
                {
                  borderColor: colors.border,
                  backgroundColor: reason === r.key ? colors.searchBg : colors.card,
                },
              ]}
            >
              <Text style={[styles.choiceText, { color: colors.text }]}>{r.label}</Text>
              {reason === r.key ? (
                <Text style={[styles.choiceMeta, { color: colors.verifiedBlue }]}>Selected</Text>
              ) : (
                <ChevronRight size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>Optional note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add context (optional)"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.searchBg }]}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={submit}
            disabled={!postId || submitting}
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.verifiedBlue,
                opacity: !postId || submitting ? 0.6 : 1,
              },
            ]}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit report</Text>}
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    maxHeight: '84%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 6,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  choiceMeta: {
    fontSize: 12,
    fontWeight: '900',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 92,
    textAlignVertical: 'top',
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
