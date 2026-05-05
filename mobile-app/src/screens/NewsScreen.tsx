import React, { useCallback, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image,
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { X, TrendingUp, TrendingDown, Info } from 'lucide-react-native';
import { useAppDispatch } from '../hooks/reduxHooks';
import { createPost } from '../store/slices/postSlice';
import { getApiErrorMessage } from '../utils/apiError';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { compressForProduction } from '../utils/imageProcessor';

interface PostFormData {
  opinion: string;
}

type ComposerMedia = {
  uri: string;
  name: string;
  mimeType: string;
};

export default function ComposePostScreen({ navigation }: any) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [isPosting, setIsPosting] = useState(false);
  const [sentiment, setSentiment] = useState<'BULLISH' | 'BEARISH' | null>(null);
  const [attachedMedia, setAttachedMedia] = useState<ComposerMedia[]>([]);

  const screenWidth = Dimensions.get('window').width;
  const contentWidth = Math.max(0, screenWidth - 40); // ScrollView content has 20px padding on each side
  const thumbGap = 10;
  const thumbSize = Math.floor((contentWidth - thumbGap * 2) / 3);
  
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<PostFormData>({
    defaultValues: { opinion: '' }
  });

  const resetDraft = useCallback(() => {
    reset({ opinion: '' });
    setSentiment(null);
    setAttachedMedia([]);
    setIsPosting(false);
  }, [reset]);

  // Tabs keep screens mounted by default; clear draft when leaving this screen.
  useFocusEffect(
    useCallback(() => {
      return () => {
        resetDraft();
      };
    }, [resetDraft])
  );

  const opinionValue = watch('opinion');
  const isPostDisabled = !opinionValue.trim() || isPosting;

  const pickImageFromLibrary = async () => {
    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (libPerm.status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      // multi-select (supported on newer OS versions)
      allowsMultipleSelection: true as any,
      selectionLimit: 5 as any,
    } as any);

    if (result.canceled || !result.assets?.length) return;

    const assets = result.assets.slice(0, 5);
    const processedAll: ComposerMedia[] = [];
    for (const asset of assets) {
      const processed = await compressForProduction(asset.uri);
      processedAll.push({
        uri: processed.uri,
        name: `post_${Date.now()}_${Math.floor(Math.random() * 1e9)}.webp`,
        mimeType: 'image/webp',
      });
    }
    setAttachedMedia(processedAll);
  };

  const removeSelectedImage = (index: number) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachedMedia = async (): Promise<string[]> => {
    if (!attachedMedia.length) return [];

    const formData = new FormData();

    for (const media of attachedMedia.slice(0, 5)) {
      formData.append('media', {
        uri: media.uri,
        name: media.name,
        type: media.mimeType,
      } as any);
    }

    const res = await api.post('/posts/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const mediaUrls = res?.data?.mediaUrls;
    return Array.isArray(mediaUrls) ? mediaUrls : [];
  };

  const onSubmit = async (data: PostFormData) => {
    if (!data.opinion.trim()) {
      Alert.alert('Validation Error', 'You cannot create an empty post.');
      return;
    }

    setIsPosting(true);
    try {
      const apiSentiment = sentiment === 'BULLISH' ? 'bullish' : sentiment === 'BEARISH' ? 'bearish' : 'neutral';
      const mediaUrls = await uploadAttachedMedia();
      await dispatch(createPost({ content: data.opinion.trim(), sentiment: apiSentiment, mediaUrls })).unwrap();
      Alert.alert('Success', 'Your opinion has been published!');
      resetDraft();
      navigation?.navigate?.('Home');
    } catch (error) {
      Alert.alert('Post Failed', getApiErrorMessage(error));
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 1. Header Cleanup: Sleek Top-Right Post Button */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation?.goBack()} disabled={isPosting}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.postButton, 
              isPostDisabled ? { backgroundColor: colors.border } : { backgroundColor: colors.verifiedBlue }
            ]} 
            onPress={handleSubmit(onSubmit)}
            disabled={isPostDisabled}
          >
            {isPosting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Input Area */}
          <Controller
            control={control}
            name="opinion"
            rules={{ maxLength: 500 }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Write your opinion… use @mention, #tag, $stock"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isPosting}
                />
                <Text style={[styles.charCount, { color: value.length === 500 ? colors.bearish : colors.textSecondary }]}>
                  {value.length}/500
                </Text>
              </View>
            )}
          />

          {/* Attachment: Image (Gallery) */}
          <View style={[styles.attachmentRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[styles.attachmentBtn, { borderColor: colors.border }]}
              onPress={pickImageFromLibrary}
              disabled={isPosting}
              activeOpacity={0.85}
            >
              <Text style={[styles.attachmentText, { color: colors.textSecondary }]}>
                {attachedMedia.length ? 'Change Images' : 'Select Images'}
              </Text>
            </TouchableOpacity>
          </View>
          {!!attachedMedia.length && (
            <View style={styles.previewWrap}>
              <View style={styles.previewGrid}>
                {attachedMedia.slice(0, 5).map((m, idx) => (
                  <View
                    key={`${m.uri}_${idx}`}
                    style={[
                      styles.previewItem,
                      {
                        width: thumbSize,
                        height: thumbSize,
                        borderColor: colors.border,
                        marginRight: (idx + 1) % 3 === 0 ? 0 : thumbGap,
                        marginBottom: thumbGap,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: m.uri }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeSelectedImage(idx)}
                      style={[styles.removeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      activeOpacity={0.85}
                      hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                      disabled={isPosting}
                    >
                      <X size={14} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <Text style={[styles.attachmentHint, { color: colors.textSecondary }]}>Selected image preview</Text>
            </View>
          )}

          {/* Priority: Sentiment Toggle */}
          <View style={styles.sentimentSection}>
             <TouchableOpacity
               style={[
                 styles.sentimentCard, 
                 { borderColor: colors.border },
                 sentiment === 'BULLISH' && { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.bullish }
               ]}
               onPress={() => setSentiment('BULLISH')}
               disabled={isPosting}
             >
               <TrendingUp size={20} color={sentiment === 'BULLISH' ? colors.bullish : colors.textSecondary} />
               <Text style={[styles.sentimentText, { color: sentiment === 'BULLISH' ? colors.bullish : colors.textSecondary }]}>
                 Bullish 📈
               </Text>
             </TouchableOpacity>

             <TouchableOpacity
               style={[
                 styles.sentimentCard, 
                 { borderColor: colors.border },
                 sentiment === 'BEARISH' && { backgroundColor: 'rgba(244, 63, 94, 0.1)', borderColor: colors.bearish }
               ]}
               onPress={() => setSentiment('BEARISH')}
               disabled={isPosting}
             >
               <TrendingDown size={20} color={sentiment === 'BEARISH' ? colors.bearish : colors.textSecondary} />
               <Text style={[styles.sentimentText, { color: sentiment === 'BEARISH' ? colors.bearish : colors.textSecondary }]}>
                 Bearish 📉
               </Text>
             </TouchableOpacity>
          </View>

        </ScrollView>

        {/* 3. SEBI Safety & Compliance Footer */}
        <View style={[styles.safetyFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Info size={14} color={colors.disclaimer} style={{ marginTop: 2, marginRight: 6 }} />
          <Text style={[styles.safetyText, { color: colors.disclaimer }]}>
            Disclaimer: This post represents my personal opinion and is for educational purposes only. It is NOT financial advice. Always consult a SEBI registered advisor.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, width: '100%' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    borderBottomWidth: 1 
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center'
  },
  postButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  textInput: { fontSize: 18, minHeight: 140, lineHeight: 28 },
  charCount: { textAlign: 'right', fontSize: 12, marginTop: 4 },

  attachmentRow: {
    flexDirection: 'row',
    marginTop: 14,
    padding: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  attachmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentText: { fontWeight: '700', fontSize: 13 },
  attachmentHint: { marginTop: 8, fontSize: 12, fontWeight: '600' },
  previewWrap: { marginTop: 12 },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  previewItem: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  
  sentimentSection: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 16 },
  sentimentCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 8
  },
  sentimentText: { fontWeight: '600', fontSize: 15 },
  
  safetyFooter: { 
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, 
    borderTopWidth: 1, alignItems: 'flex-start' 
  },
  safetyText: { flex: 1, fontSize: 12, fontStyle: 'italic', lineHeight: 18 }
});
