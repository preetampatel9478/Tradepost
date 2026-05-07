import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  Dimensions,
  PanResponder
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
import * as FileSystem from 'expo-file-system';
import Svg, { Image as SvgImage, Path } from 'react-native-svg';

interface PostFormData {
  opinion: string;
}

type ComposerMedia = {
  uri: string;
  name: string;
  mimeType: string;
  width: number;
  height: number;
};

type NormalizedPoint = { x: number; y: number };
type Stroke = {
  color: string;
  widthRatio: number;
  points: NormalizedPoint[];
};

export default function ComposePostScreen({ navigation }: any) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [isPosting, setIsPosting] = useState(false);
  const [sentiment, setSentiment] = useState<'BULLISH' | 'BEARISH' | null>(null);
  const [attachedMedia, setAttachedMedia] = useState<ComposerMedia[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editorPreviewSize, setEditorPreviewSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [activePencilColor, setActivePencilColor] = useState<string>(colors.verifiedBlue);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const exportSvgRef = useRef<any>(null);

  const screenWidth = Dimensions.get('window').width;
  const contentWidth = Math.max(0, screenWidth - 40); // ScrollView content has 20px padding on each side
  const thumbGap = 10;
  const thumbSize = Math.floor((contentWidth - thumbGap * 2) / 3);

  const editorColors = useMemo(
    () => [colors.verifiedBlue, colors.bullish, colors.bearish, colors.text],
    [colors.bearish, colors.bullish, colors.text, colors.verifiedBlue]
  );
  
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<PostFormData>({
    defaultValues: { opinion: '' }
  });

  const resetDraft = useCallback(() => {
    reset({ opinion: '' });
    setSentiment(null);
    setAttachedMedia([]);
    setEditingIndex(null);
    setStrokes([]);
    setIsSavingEdit(false);
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
    if (attachedMedia.length >= 5) {
      Alert.alert('Limit reached', 'You can attach up to 5 images.');
      return;
    }

    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (libPerm.status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      // Crop UI (single image per pick; users can add up to 5 by repeating).
      allowsEditing: true,
    } as any);

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const processed = await compressForProduction(asset.uri);
    setAttachedMedia((prev) => [
      ...prev,
      {
        uri: processed.uri,
        width: processed.width,
        height: processed.height,
        name: `post_${Date.now()}_${Math.floor(Math.random() * 1e9)}.webp`,
        mimeType: 'image/webp',
      },
    ].slice(0, 5));
  };

  const removeSelectedImage = (index: number) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  };

  const openEditorForIndex = (index: number) => {
    const media = attachedMedia[index];
    if (!media) return;

    const ratio = media.height / Math.max(1, media.width);
    const maxPreviewHeight = 520;
    let previewWidth = contentWidth;
    let previewHeight = contentWidth * ratio;
    if (previewHeight > maxPreviewHeight) {
      previewHeight = maxPreviewHeight;
      previewWidth = previewHeight / ratio;
    }

    setEditorPreviewSize({ width: previewWidth, height: previewHeight });
    setActivePencilColor(colors.verifiedBlue);
    setStrokes([]);
    setEditingIndex(index);
  };

  const closeEditor = () => {
    if (isSavingEdit) return;
    setEditingIndex(null);
    setStrokes([]);
  };

  const undoLastStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const clearStrokes = () => {
    setStrokes([]);
  };

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const buildPathD = (points: NormalizedPoint[], width: number, height: number) => {
    if (!points.length) return '';
    const first = points[0];
    let d = `M ${first.x * width} ${first.y * height}`;
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      d += ` L ${p.x * width} ${p.y * height}`;
    }
    return d;
  };

  const editorPanResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => editingIndex !== null && !isSavingEdit,
      onMoveShouldSetPanResponder: () => editingIndex !== null && !isSavingEdit,
      onPanResponderGrant: (evt) => {
        if (editingIndex === null) return;
        if (!editorPreviewSize.width || !editorPreviewSize.height) return;

        const x = clamp01(evt.nativeEvent.locationX / editorPreviewSize.width);
        const y = clamp01(evt.nativeEvent.locationY / editorPreviewSize.height);
        const defaultStrokePx = 4;
        const widthRatio = defaultStrokePx / editorPreviewSize.width;

        setStrokes((prev) => [
          ...prev,
          {
            color: activePencilColor,
            widthRatio,
            points: [{ x, y }],
          },
        ]);
      },
      onPanResponderMove: (evt) => {
        if (editingIndex === null) return;
        if (!editorPreviewSize.width || !editorPreviewSize.height) return;

        const x = clamp01(evt.nativeEvent.locationX / editorPreviewSize.width);
        const y = clamp01(evt.nativeEvent.locationY / editorPreviewSize.height);

        setStrokes((prev) => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];
          const updatedLast: Stroke = { ...last, points: [...last.points, { x, y }] };
          return [...prev.slice(0, -1), updatedLast];
        });
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: () => undefined,
      onPanResponderTerminate: () => undefined,
    });
  }, [activePencilColor, editingIndex, editorPreviewSize.height, editorPreviewSize.width, isSavingEdit]);

  const renderStrokes = (renderWidth: number, renderHeight: number) => {
    return strokes
      .map((s, idx) => {
        const d = buildPathD(s.points, renderWidth, renderHeight);
        if (!d) return null;
        return (
          <Path
            key={`stroke_${idx}`}
            d={d}
            stroke={s.color}
            strokeWidth={Math.max(1, s.widthRatio * renderWidth)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.95}
          />
        );
      })
      .filter(Boolean);
  };

  const exportCurrentEdit = async () => {
    if (editingIndex === null) return;
    const media = attachedMedia[editingIndex];
    if (!media) return;

    if (!strokes.length) {
      closeEditor();
      return;
    }

    setIsSavingEdit(true);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const svg = exportSvgRef.current;
        if (!svg || typeof svg.toDataURL !== 'function') {
          reject(new Error('Image editor is not ready yet.'));
          return;
        }

        try {
          svg.toDataURL((data: string) => {
            if (!data) reject(new Error('Failed to export image.'));
            else resolve(data);
          });
        } catch (e) {
          reject(e);
        }
      });

      if (!FileSystem.cacheDirectory) {
        throw new Error('File system is not available.');
      }

      const pngUri = `${FileSystem.cacheDirectory}opinion_edit_${Date.now()}_${Math.floor(Math.random() * 1e9)}.png`;
      await FileSystem.writeAsStringAsync(pngUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      const processed = await compressForProduction(pngUri);
      setAttachedMedia((prev) => {
        const next = [...prev];
        const current = next[editingIndex];
        if (!current) return prev;
        next[editingIndex] = {
          ...current,
          uri: processed.uri,
          width: processed.width,
          height: processed.height,
          name: `post_${Date.now()}_${Math.floor(Math.random() * 1e9)}.webp`,
          mimeType: 'image/webp',
        };
        return next;
      });

      closeEditor();
    } catch (e) {
      Alert.alert('Edit failed', getApiErrorMessage(e));
    } finally {
      setIsSavingEdit(false);
    }
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
                {attachedMedia.length ? 'Add Another Image' : 'Select Image'}
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
                      onPress={() => openEditorForIndex(idx)}
                      style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      activeOpacity={0.85}
                      disabled={isPosting}
                    >
                      <Text style={[styles.editBtnText, { color: colors.text }]}>Edit</Text>
                    </TouchableOpacity>
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
              <Text style={[styles.attachmentHint, { color: colors.textSecondary }]}>Tap Edit to crop/mark on an image</Text>
            </View>
          )}

          {editingIndex !== null && attachedMedia[editingIndex] ? (
            <View style={[styles.editorWrap, { borderColor: colors.border, backgroundColor: colors.card }]}> 
              <View style={styles.editorHeaderRow}>
                <Text style={[styles.editorTitle, { color: colors.text }]}>Edit image</Text>
                <TouchableOpacity onPress={closeEditor} disabled={isSavingEdit} activeOpacity={0.85}>
                  <Text style={[styles.editorLink, { color: colors.textSecondary }]}>Close</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editorToolbar}>
                <View style={styles.colorRow}>
                  {editorColors.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setActivePencilColor(c)}
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor: c,
                          borderColor: activePencilColor === c ? colors.verifiedBlue : colors.border,
                        },
                      ]}
                      activeOpacity={0.85}
                      disabled={isSavingEdit}
                    />
                  ))}
                </View>

                <View style={styles.editorActionsRow}>
                  <TouchableOpacity
                    onPress={undoLastStroke}
                    style={[styles.editorActionBtn, { borderColor: colors.border }]}
                    activeOpacity={0.85}
                    disabled={isSavingEdit || strokes.length === 0}
                  >
                    <Text style={[styles.editorActionText, { color: colors.textSecondary }]}>Undo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={clearStrokes}
                    style={[styles.editorActionBtn, { borderColor: colors.border }]}
                    activeOpacity={0.85}
                    disabled={isSavingEdit || strokes.length === 0}
                  >
                    <Text style={[styles.editorActionText, { color: colors.textSecondary }]}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={exportCurrentEdit}
                    style={[styles.editorSaveBtn, { backgroundColor: colors.verifiedBlue }]}
                    activeOpacity={0.85}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.editorSaveText}>Done</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Preview (draw directly on this) */}
              <View style={styles.editorPreviewOuter}>
                <View
                  style={[
                    styles.editorPreview,
                    {
                      width: editorPreviewSize.width,
                      height: editorPreviewSize.height,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  {...editorPanResponder.panHandlers}
                >
                  <Svg width={editorPreviewSize.width} height={editorPreviewSize.height}>
                    <SvgImage
                      href={{ uri: attachedMedia[editingIndex].uri }}
                      width={editorPreviewSize.width}
                      height={editorPreviewSize.height}
                      preserveAspectRatio="xMidYMid slice"
                    />
                    {renderStrokes(editorPreviewSize.width, editorPreviewSize.height) as any}
                  </Svg>
                </View>
              </View>

              {/* Hidden export surface (full resolution) */}
              <View style={styles.hiddenExportSurface} pointerEvents="none">
                <Svg
                  ref={exportSvgRef}
                  width={attachedMedia[editingIndex].width}
                  height={attachedMedia[editingIndex].height}
                >
                  <SvgImage
                    href={{ uri: attachedMedia[editingIndex].uri }}
                    width={attachedMedia[editingIndex].width}
                    height={attachedMedia[editingIndex].height}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  {renderStrokes(attachedMedia[editingIndex].width, attachedMedia[editingIndex].height) as any}
                </Svg>
              </View>
            </View>
          ) : null}

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
  editBtn: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { fontWeight: '800', fontSize: 12 },

  editorWrap: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  editorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  editorTitle: { fontWeight: '900', fontSize: 14 },
  editorLink: { fontWeight: '800', fontSize: 12 },

  editorToolbar: { gap: 10, marginBottom: 10 },
  colorRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
  },
  editorActionsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  editorActionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorActionText: { fontWeight: '800', fontSize: 12 },
  editorSaveBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorSaveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },

  editorPreviewOuter: { alignItems: 'center' },
  editorPreview: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hiddenExportSurface: {
    position: 'absolute',
    left: -10000,
    top: -10000,
    width: 1,
    height: 1,
    opacity: 0,
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
