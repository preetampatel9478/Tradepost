import React, { useCallback, useMemo, useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Modal,
  Image,
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Dimensions,
  PixelRatio,
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
import { compressForProduction, prepareForEditing } from '../utils/imageProcessor';
import { compressVideoForProduction } from '../utils/videoProcessor';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
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
  type?: 'image' | 'video';
  duration?: number;
};

type NormalizedPoint = { x: number; y: number };
type Stroke = {
  color: string;
  widthRatio: number;
  points: NormalizedPoint[];
};

type CropRect = { x: number; y: number; width: number; height: number };
type BoundsRect = { x: number; y: number; width: number; height: number };

export default function ComposePostScreen({ navigation }: any) {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [isPosting, setIsPosting] = useState(false);
  const [sentiment, setSentiment] = useState<'BULLISH' | 'BEARISH' | null>(null);
  const [attachedMedia, setAttachedMedia] = useState<ComposerMedia[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editorFrameSize, setEditorFrameSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [editorTargetFrame, setEditorTargetFrame] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [editorMode, setEditorMode] = useState<'crop' | 'draw'>('crop');
  const [editorScale, setEditorScale] = useState(1);
  const [editorTranslate, setEditorTranslate] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [activePencilColor, setActivePencilColor] = useState<string>(colors.verifiedBlue);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const exportSvgRef = useRef<any>(null);

  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartCenterRef = useRef<{ x: number; y: number } | null>(null);
  const gestureStartScaleRef = useRef<number>(1);
  const gestureStartTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const cropDragModeRef = useRef<
    | { type: 'none' }
    | { type: 'move'; startX: number; startY: number; startRect: CropRect }
    | { type: 'resize'; corner: 'tl' | 'tr' | 'bl' | 'br'; startX: number; startY: number; startRect: CropRect }
    | { type: 'resize-edge'; edge: 'l' | 'r' | 't' | 'b'; startX: number; startY: number; startRect: CropRect }
  >({ type: 'none' });

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
      // We do cropping inside our full-screen editor to avoid Android gesture-navigation conflicts.
      allowsEditing: false,
    } as any);

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const processed = await prepareForEditing(asset.uri);
    setAttachedMedia((prev) => [
      ...prev,
      {
        uri: processed.uri,
        width: processed.width,
        height: processed.height,
        name: `post_${Date.now()}_${Math.floor(Math.random() * 1e9)}.jpg`,
        mimeType: 'image/jpeg',
      },
    ].slice(0, 5));
  };

  const pickVideoFromLibrary = async () => {
    if (attachedMedia.length >= 5) {
      Alert.alert('Limit reached', 'You can attach up to 5 items.');
      return;
    }

    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (libPerm.status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      allowsEditing: false,
    } as any);

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const durationMs = asset.duration ?? 0;
    const durationSec = durationMs / 1000;
    if (durationSec > 35) {
      Alert.alert('Video too long', 'Please select a video that is 35 seconds or shorter.');
      return;
    }

    setAttachedMedia((prev) => [
      ...prev,
      {
        uri: asset.uri,
        width: asset.width || 0,
        height: asset.height || 0,
        name: asset.fileName || `post_video_${Date.now()}.mp4`,
        mimeType: asset.mimeType || 'video/mp4',
        type: 'video',
        duration: durationSec,
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

    setEditorFrameSize({ width: 0, height: 0 });
    // Keep the edit box smaller than the screen and match the image aspect ratio
    // so the full image is visible by default (no unintended cropping/jitter).
    const { width: screenW, height: screenH } = Dimensions.get('window');
    const horizontalPadding = 32; // editor body padding (16 left + 16 right)
    // Larger than before (closer to full-screen), but still inset to avoid gesture-nav edges.
    const maxW = Math.max(260, Math.floor((screenW - horizontalPadding) * 0.96));
    const maxH = Math.max(260, Math.floor(screenH * 0.7));
    const ratio = media.height / Math.max(1, media.width);
    let frameW = Math.floor(maxW);
    let frameH = Math.floor(frameW * ratio);
    if (frameH > maxH) {
      frameH = Math.floor(maxH);
      frameW = Math.floor(frameH / Math.max(0.0001, ratio));
    }
    setEditorTargetFrame({ width: frameW, height: frameH });
    setEditorMode('crop');
    setEditorScale(1);
    setEditorTranslate({ x: 0, y: 0 });
    setActivePencilColor(colors.verifiedBlue);
    setStrokes([]);
    setEditingIndex(index);
  };

  const closeEditor = () => {
    if (isSavingEdit) return;
    setEditingIndex(null);
    setStrokes([]);
    setEditorMode('crop');
    setEditorScale(1);
    setEditorTranslate({ x: 0, y: 0 });
    setEditorFrameSize({ width: 0, height: 0 });
    setEditorTargetFrame({ width: 0, height: 0 });
    setCropRect({ x: 0, y: 0, width: 0, height: 0 });
    pinchStartDistanceRef.current = null;
    pinchStartCenterRef.current = null;
  };

  const undoLastStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const clearStrokes = () => {
    setStrokes([]);
  };

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const getTouchDistance = (touches: any[]) => {
    if (!touches || touches.length < 2) return 0;
    const [a, b] = touches;
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: any[]) => {
    if (!touches || touches.length < 2) return { x: 0, y: 0 };
    const [a, b] = touches;
    return { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
  };

  const getImageBoundsContain = (frameW: number, frameH: number, imgW: number, imgH: number) => {
    if (!frameW || !frameH || !imgW || !imgH) {
      return { bounds: { x: 0, y: 0, width: frameW || 0, height: frameH || 0 }, scale: 1 };
    }
    const scale = Math.min(frameW / imgW, frameH / imgH);
    const width = imgW * scale;
    const height = imgH * scale;
    const x = (frameW - width) / 2;
    const y = (frameH - height) / 2;
    return { bounds: { x, y, width, height }, scale };
  };

  const getBaseCoverScale = (frameW: number, frameH: number, imgW: number, imgH: number) => {
    if (!frameW || !frameH || !imgW || !imgH) return 1;
    return Math.max(frameW / imgW, frameH / imgH);
  };

  const clampTranslateForCover = (
    frameW: number,
    frameH: number,
    imgW: number,
    imgH: number,
    userScale: number,
    translate: { x: number; y: number }
  ) => {
    const baseScale = getBaseCoverScale(frameW, frameH, imgW, imgH);
    const totalScale = baseScale * userScale;
    const scaledW = imgW * totalScale;
    const scaledH = imgH * totalScale;
    const maxOffsetX = Math.max(0, (scaledW - frameW) / 2);
    const maxOffsetY = Math.max(0, (scaledH - frameH) / 2);

    return {
      x: clamp(translate.x, -maxOffsetX, maxOffsetX),
      y: clamp(translate.y, -maxOffsetY, maxOffsetY),
    };
  };

  const clampCropRect = (rect: CropRect, bounds: BoundsRect) => {
    const minSize = Math.min(120, Math.max(56, Math.floor(Math.min(bounds.width, bounds.height) * 0.2)));
    const width = clamp(rect.width, minSize, bounds.width);
    const height = clamp(rect.height, minSize, bounds.height);
    const x = clamp(rect.x, bounds.x, Math.max(bounds.x, bounds.x + bounds.width - width));
    const y = clamp(rect.y, bounds.y, Math.max(bounds.y, bounds.y + bounds.height - height));
    return { x, y, width, height };
  };

  const isInsideRect = (x: number, y: number, rect: CropRect) => {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  };

  const hitTestCorner = (x: number, y: number, rect: CropRect, radius: number) => {
    const corners: Array<{ corner: 'tl' | 'tr' | 'bl' | 'br'; cx: number; cy: number }> = [
      { corner: 'tl', cx: rect.x, cy: rect.y },
      { corner: 'tr', cx: rect.x + rect.width, cy: rect.y },
      { corner: 'bl', cx: rect.x, cy: rect.y + rect.height },
      { corner: 'br', cx: rect.x + rect.width, cy: rect.y + rect.height },
    ];

    for (const c of corners) {
      const dx = x - c.cx;
      const dy = y - c.cy;
      if (dx * dx + dy * dy <= radius * radius) return c.corner;
    }
    return null;
  };

  const hitTestEdge = (x: number, y: number, rect: CropRect, threshold: number) => {
    if (!isInsideRect(x, y, rect)) return null;
    const leftDist = Math.abs(x - rect.x);
    const rightDist = Math.abs(x - (rect.x + rect.width));
    const topDist = Math.abs(y - rect.y);
    const bottomDist = Math.abs(y - (rect.y + rect.height));

    const min = Math.min(leftDist, rightDist, topDist, bottomDist);
    if (min > threshold) return null;
    if (min === leftDist) return 'l' as const;
    if (min === rightDist) return 'r' as const;
    if (min === topDist) return 't' as const;
    return 'b' as const;
  };

  const cropOverlayPanResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: (evt) => {
        if (editingIndex === null || isSavingEdit) return false;
        if (editorMode !== 'crop') return false;
        // Never steal multi-touch; leave pinch zoom to the image PanResponder.
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length >= 2) return false;
        if (!editorFrameSize.width || !editorFrameSize.height) return false;
        if (!cropRect.width || !cropRect.height) return false;

        // Coordinates must be frame-relative (overlay fills the whole frame).
        const x = evt.nativeEvent.locationX;
        const y = evt.nativeEvent.locationY;
        const handleRadius = 28;
        const corner = hitTestCorner(x, y, cropRect, handleRadius);
        if (corner) return true;
        const edge = hitTestEdge(x, y, cropRect, 22);
        if (edge) return true;
        return isInsideRect(x, y, cropRect);
      },
      onStartShouldSetPanResponder: (evt) => {
        // Keep logic identical for platforms that don't honor capture consistently.
        if (editingIndex === null || isSavingEdit) return false;
        if (editorMode !== 'crop') return false;
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length >= 2) return false;
        if (!editorFrameSize.width || !editorFrameSize.height) return false;
        if (!cropRect.width || !cropRect.height) return false;

        const x = evt.nativeEvent.locationX;
        const y = evt.nativeEvent.locationY;
        const handleRadius = 28;
        const corner = hitTestCorner(x, y, cropRect, handleRadius);
        if (corner) return true;
        const edge = hitTestEdge(x, y, cropRect, 22);
        if (edge) return true;
        return isInsideRect(x, y, cropRect);
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const y = evt.nativeEvent.locationY;
        const handleRadius = 28;
        const corner = hitTestCorner(x, y, cropRect, handleRadius);
        if (corner) {
          cropDragModeRef.current = { type: 'resize', corner, startX: x, startY: y, startRect: cropRect };
          return;
        }
        const edge = hitTestEdge(x, y, cropRect, 22);
        if (edge) {
          cropDragModeRef.current = { type: 'resize-edge', edge, startX: x, startY: y, startRect: cropRect };
          return;
        }
        if (isInsideRect(x, y, cropRect)) {
          cropDragModeRef.current = { type: 'move', startX: x, startY: y, startRect: cropRect };
          return;
        }
        cropDragModeRef.current = { type: 'none' };
      },
      onPanResponderMove: (evt, gestureState) => {
        if (editingIndex === null) return;
        const media = attachedMedia[editingIndex];
        if (!media) return;
        if (!editorFrameSize.width || !editorFrameSize.height) return;
        const frameW = editorFrameSize.width;
        const frameH = editorFrameSize.height;
        const { bounds } = getImageBoundsContain(frameW, frameH, media.width, media.height);
        const mode = cropDragModeRef.current;
        if (mode.type === 'none') return;

        const dx = gestureState.dx;
        const dy = gestureState.dy;

        if (mode.type === 'move') {
          const next = clampCropRect(
            {
              ...mode.startRect,
              x: mode.startRect.x + dx,
              y: mode.startRect.y + dy,
            },
            bounds
          );
          setCropRect(next);
          return;
        }

        if (mode.type === 'resize') {
          const r = mode.startRect;
          let x = r.x;
          let y = r.y;
          let w = r.width;
          let h = r.height;

          if (mode.corner === 'tl') {
            x = r.x + dx;
            y = r.y + dy;
            w = r.width - dx;
            h = r.height - dy;
          } else if (mode.corner === 'tr') {
            y = r.y + dy;
            w = r.width + dx;
            h = r.height - dy;
          } else if (mode.corner === 'bl') {
            x = r.x + dx;
            w = r.width - dx;
            h = r.height + dy;
          } else if (mode.corner === 'br') {
            w = r.width + dx;
            h = r.height + dy;
          }

          const normalized: CropRect = {
            x: Math.min(x, x + w),
            y: Math.min(y, y + h),
            width: Math.abs(w),
            height: Math.abs(h),
          };
          setCropRect(clampCropRect(normalized, bounds));
          return;
        }

        if (mode.type === 'resize-edge') {
          const r = mode.startRect;
          let x = r.x;
          let y = r.y;
          let w = r.width;
          let h = r.height;

          if (mode.edge === 'l') {
            x = r.x + dx;
            w = r.width - dx;
          } else if (mode.edge === 'r') {
            w = r.width + dx;
          } else if (mode.edge === 't') {
            y = r.y + dy;
            h = r.height - dy;
          } else if (mode.edge === 'b') {
            h = r.height + dy;
          }

          const normalized: CropRect = {
            x: Math.min(x, x + w),
            y: Math.min(y, y + h),
            width: Math.abs(w),
            height: Math.abs(h),
          };
          setCropRect(clampCropRect(normalized, bounds));
        }
      },
      onPanResponderRelease: () => {
        cropDragModeRef.current = { type: 'none' };
      },
      onPanResponderTerminate: () => {
        cropDragModeRef.current = { type: 'none' };
      },
    });
  }, [cropRect, editingIndex, editorFrameSize.height, editorFrameSize.width, editorMode, isSavingEdit]);

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
      // No image zoom/pan. Crop is done by dragging the crop lines; draw mode captures touches for strokes.
      onStartShouldSetPanResponder: () => editingIndex !== null && !isSavingEdit && editorMode === 'draw',
      onMoveShouldSetPanResponder: () => editingIndex !== null && !isSavingEdit && editorMode === 'draw',
      onPanResponderGrant: (evt) => {
        if (editingIndex === null) return;
        const media = attachedMedia[editingIndex];
        if (!media) return;
        if (!editorFrameSize.width || !editorFrameSize.height) return;

        if (editorMode !== 'draw') return;

        const x = clamp01(evt.nativeEvent.locationX / editorFrameSize.width);
        const y = clamp01(evt.nativeEvent.locationY / editorFrameSize.height);
        const defaultStrokePx = 4;
        const widthRatio = defaultStrokePx / Math.max(1, editorFrameSize.width);

        setStrokes((prev) => [
          ...prev,
          {
            color: activePencilColor,
            widthRatio,
            points: [{ x, y }],
          },
        ]);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (editingIndex === null) return;
        const media = attachedMedia[editingIndex];
        if (!media) return;
        if (!editorFrameSize.width || !editorFrameSize.height) return;

        if (editorMode === 'draw') {
          const x = clamp01(evt.nativeEvent.locationX / editorFrameSize.width);
          const y = clamp01(evt.nativeEvent.locationY / editorFrameSize.height);

          setStrokes((prev) => {
            if (!prev.length) return prev;
            const last = prev[prev.length - 1];
            const updatedLast: Stroke = { ...last, points: [...last.points, { x, y }] };
            return [...prev.slice(0, -1), updatedLast];
          });
        }
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: () => {
        pinchStartDistanceRef.current = null;
        pinchStartCenterRef.current = null;
      },
      onPanResponderTerminate: () => {
        pinchStartDistanceRef.current = null;
        pinchStartCenterRef.current = null;
      },
    });
  }, [
    activePencilColor,
    attachedMedia,
    editingIndex,
    editorFrameSize.height,
    editorFrameSize.width,
    editorMode,
    isSavingEdit,
  ]);

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

    const hasDrawEdits = strokes.length > 0;
    if (!editorFrameSize.width || !editorFrameSize.height) {
      Alert.alert('Edit failed', 'Editor is not ready yet.');
      return;
    }

    const frameW0 = editorFrameSize.width;
    const frameH0 = editorFrameSize.height;
    const eps = 0.75;
    const { bounds: imageBounds0 } = getImageBoundsContain(frameW0, frameH0, media.width, media.height);
    const cropIsFullImage =
      !(cropRect.width > 0 && cropRect.height > 0) ||
      (Math.abs(cropRect.x - imageBounds0.x) <= eps &&
        Math.abs(cropRect.y - imageBounds0.y) <= eps &&
        Math.abs(cropRect.width - imageBounds0.width) <= eps &&
        Math.abs(cropRect.height - imageBounds0.height) <= eps);
    const hasCropEdits = editorMode === 'crop' && !cropIsFullImage;

    if (!hasDrawEdits && !hasCropEdits) {
      closeEditor();
      return;
    }

    setIsSavingEdit(true);
    try {
      const frameW = editorFrameSize.width;
      const frameH = editorFrameSize.height;
      const { bounds: imageBounds, scale: totalScale } = getImageBoundsContain(frameW, frameH, media.width, media.height);
      const imageX0 = imageBounds.x;
      const imageY0 = imageBounds.y;

      const cropFrame = cropRect.width && cropRect.height ? cropRect : imageBounds;
      const originX = clamp((cropFrame.x - imageX0) / totalScale, 0, Math.max(0, media.width - 1));
      const originY = clamp((cropFrame.y - imageY0) / totalScale, 0, Math.max(0, media.height - 1));
      const cropW = clamp(cropFrame.width / totalScale, 1, media.width - originX);
      const cropH = clamp(cropFrame.height / totalScale, 1, media.height - originY);

      // Crop mode: true pixel crop (box-defined).
      if (editorMode === 'crop') {
        const cropped = await ImageManipulator.manipulateAsync(
          media.uri,
          [
            {
              crop: {
                originX: Math.round(originX),
                originY: Math.round(originY),
                width: Math.round(cropW),
                height: Math.round(cropH),
              },
            },
          ],
          { compress: 1, format: ImageManipulator.SaveFormat.PNG }
        );

        const processed = await prepareForEditing(cropped.uri);
        setAttachedMedia((prev) => {
          const next = [...prev];
          const current = next[editingIndex];
          if (!current) return prev;
          next[editingIndex] = {
            ...current,
            uri: processed.uri,
            width: processed.width,
            height: processed.height,
            name: `post_${Date.now()}_${Math.floor(Math.random() * 1e9)}.jpg`,
            mimeType: 'image/jpeg',
          };
          return next;
        });

        closeEditor();
        return;
      }

      // Drawing path: export what user sees in the editor frame.
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

      const cacheUri = FileSystem.Paths?.cache?.uri;
      if (!cacheUri) {
        throw new Error('File system is not available.');
      }

      const pngUri = `${cacheUri}opinion_edit_${Date.now()}_${Math.floor(Math.random() * 1e9)}.png`;
      await FileSystem.writeAsStringAsync(pngUri, base64, { encoding: 'base64' });

      const processed = await prepareForEditing(pngUri);
      setAttachedMedia((prev) => {
        const next = [...prev];
        const current = next[editingIndex];
        if (!current) return prev;
        next[editingIndex] = {
          ...current,
          uri: processed.uri,
          width: processed.width,
          height: processed.height,
          name: `post_${Date.now()}_${Math.floor(Math.random() * 1e9)}.jpg`,
          mimeType: 'image/jpeg',
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
      if (media.type === 'video' || (media.mimeType && media.mimeType.startsWith('video'))) {
        // Compress video (best-effort). If compressor not installed, original will be returned.
        const processed = await compressVideoForProduction(media.uri);
        const name = media.name || `post_video_${Date.now()}.mp4`;
        formData.append('media', {
          uri: processed.uri,
          name,
          type: media.mimeType || 'video/mp4',
        } as any);
      } else {
        // Convert to WebP for upload (smaller + consistent).
        const uploadImage = await compressForProduction(media.uri);
        formData.append('media', {
          uri: uploadImage.uri,
          name: `post_${Date.now()}_${Math.floor(Math.random() * 1e9)}.webp`,
          type: 'image/webp',
        } as any);
      }
    }

    const res = await api.post('/posts/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // Important: Increase timeout for large video uploads
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

            <TouchableOpacity
              style={[styles.attachmentBtn, { borderColor: colors.border, marginLeft: 10 }]}
              onPress={pickVideoFromLibrary}
              disabled={isPosting}
              activeOpacity={0.85}
            >
              <Text style={[styles.attachmentText, { color: colors.textSecondary }]}>Select Video (≤35s)</Text>
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
                      resizeMode="contain"
                    />
                    {m.type === 'video' ? (
                      <View style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={[styles.editBtnText, { color: colors.text }]}>{m.duration ? `${Math.round(m.duration)}s` : 'Video'}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => openEditorForIndex(idx)}
                        style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        activeOpacity={0.85}
                        disabled={isPosting}
                      >
                        <Text style={[styles.editBtnText, { color: colors.text }]}>Edit</Text>
                      </TouchableOpacity>
                    )}
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

          {/* Full-screen editor modal */}
          <Modal
            visible={editingIndex !== null && !!attachedMedia[editingIndex]}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={closeEditor}
          >
            {editingIndex !== null && attachedMedia[editingIndex] ? (
              <SafeAreaView style={[styles.editorModalContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.editorModalHeader, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity onPress={closeEditor} disabled={isSavingEdit} activeOpacity={0.85}>
                    <Text style={[styles.editorModalHeaderText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.editorModalTitle, { color: colors.text }]}>Edit image</Text>
                  <TouchableOpacity onPress={exportCurrentEdit} disabled={isSavingEdit} activeOpacity={0.85}>
                    {isSavingEdit ? (
                      <ActivityIndicator size="small" color={colors.verifiedBlue} />
                    ) : (
                      <Text style={[styles.editorModalHeaderText, { color: colors.verifiedBlue }]}>Done</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.editorModalToolbar}>
                  <View style={[styles.modeRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <TouchableOpacity
                      onPress={() => setEditorMode('crop')}
                      style={[
                        styles.modeBtn,
                        editorMode === 'crop' && { backgroundColor: colors.verifiedBlue },
                      ]}
                      activeOpacity={0.85}
                      disabled={isSavingEdit}
                    >
                      <Text
                        style={[
                          styles.modeBtnText,
                          { color: editorMode === 'crop' ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        Crop
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEditorMode('draw')}
                      style={[
                        styles.modeBtn,
                        editorMode === 'draw' && { backgroundColor: colors.verifiedBlue },
                      ]}
                      activeOpacity={0.85}
                      disabled={isSavingEdit}
                    >
                      <Text
                        style={[
                          styles.modeBtnText,
                          { color: editorMode === 'draw' ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        Draw
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {editorMode === 'crop' ? (
                    <Text style={[styles.cropHint, { color: colors.textSecondary }]}>
                      Drag edges / corners (blue lines) to crop
                    </Text>
                  ) : null}

                  {editorMode === 'draw' ? (
                    <View style={styles.drawToolsRow}>
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
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={styles.editorModalBody}>
                  <View
                    style={[
                      styles.editorFullFrame,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        width: editorTargetFrame.width || undefined,
                        height: editorTargetFrame.height || undefined,
                      },
                    ]}
                    onLayout={(e) => {
                      const { width, height } = e.nativeEvent.layout;
                      if (!width || !height) return;
                      setEditorFrameSize({ width, height });

                      // Initialize crop box to cover the full visible image area by default
                      // so we don't "auto-crop" anything before the user adjusts.
                      setCropRect((prev) => {
                        if (prev.width && prev.height) return prev;
                        const media = attachedMedia[editingIndex];
                        if (!media) return prev;
                        const { bounds } = getImageBoundsContain(width, height, media.width, media.height);
                        return clampCropRect(bounds, bounds);
                      });
                    }}
                    {...editorPanResponder.panHandlers}
                  >
                    {editorFrameSize.width && editorFrameSize.height ? (
                      <Svg width={editorFrameSize.width} height={editorFrameSize.height}>
                        {(() => {
                          const media = attachedMedia[editingIndex];
                          const frameW = editorFrameSize.width;
                          const frameH = editorFrameSize.height;
                          const { bounds } = getImageBoundsContain(frameW, frameH, media.width, media.height);
                          const imageW = bounds.width;
                          const imageH = bounds.height;
                          const x0 = bounds.x;
                          const y0 = bounds.y;
                          return (
                            <>
                              <SvgImage
                                href={{ uri: media.uri }}
                                x={x0}
                                y={y0}
                                width={imageW}
                                height={imageH}
                                preserveAspectRatio="none"
                              />
                              {editorMode === 'draw' ? (renderStrokes(frameW, frameH) as any) : null}
                            </>
                          );
                        })()}
                      </Svg>
                    ) : null}

                    {/* Crop box overlay (simple adjustable rectangle) */}
                    {editorMode === 'crop' && cropRect.width && cropRect.height ? (
                      <View style={styles.cropOverlay} {...cropOverlayPanResponder.panHandlers}>
                        {/* Dim outside */}
                        <View
                          pointerEvents="none"
                          style={[styles.cropDim, { left: 0, top: 0, right: 0, height: cropRect.y }]}
                        />
                        <View
                          pointerEvents="none"
                          style={[
                            styles.cropDim,
                            {
                              left: 0,
                              top: cropRect.y,
                              width: cropRect.x,
                              height: cropRect.height,
                            },
                          ]}
                        />
                        <View
                          pointerEvents="none"
                          style={[
                            styles.cropDim,
                            {
                              left: cropRect.x + cropRect.width,
                              top: cropRect.y,
                              right: 0,
                              height: cropRect.height,
                            },
                          ]}
                        />
                        <View
                          pointerEvents="none"
                          style={[
                            styles.cropDim,
                            {
                              left: 0,
                              top: cropRect.y + cropRect.height,
                              right: 0,
                              bottom: 0,
                            },
                          ]}
                        />

                        {/* Actual crop box */}
                        <View
                          pointerEvents="none"
                          style={[
                            styles.cropBox,
                            {
                              left: cropRect.x,
                              top: cropRect.y,
                              width: cropRect.width,
                              height: cropRect.height,
                              borderColor: colors.verifiedBlue,
                            },
                          ]}
                        >
                          {/* Corner handles */}
                          <View
                            style={[
                              styles.cropHandle,
                              {
                                left: -11,
                                top: -11,
                                borderColor: colors.verifiedBlue,
                                backgroundColor: colors.card,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.cropHandle,
                              {
                                right: -11,
                                top: -11,
                                borderColor: colors.verifiedBlue,
                                backgroundColor: colors.card,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.cropHandle,
                              {
                                left: -11,
                                bottom: -11,
                                borderColor: colors.verifiedBlue,
                                backgroundColor: colors.card,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.cropHandle,
                              {
                                right: -11,
                                bottom: -11,
                                borderColor: colors.verifiedBlue,
                                backgroundColor: colors.card,
                              },
                            ]}
                          />

                          {/* Edge handles (midpoints) */}
                          <View
                            style={[
                              styles.cropHandle,
                              {
                                left: cropRect.width / 2 - 9,
                                top: -11,
                                borderColor: colors.verifiedBlue,
                                backgroundColor: colors.card,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.cropHandle,
                              {
                                left: cropRect.width / 2 - 9,
                                bottom: -11,
                                borderColor: colors.verifiedBlue,
                                backgroundColor: colors.card,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.cropHandle,
                              {
                                left: -11,
                                top: cropRect.height / 2 - 9,
                                borderColor: colors.verifiedBlue,
                                backgroundColor: colors.card,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.cropHandle,
                              {
                                right: -11,
                                top: cropRect.height / 2 - 9,
                                borderColor: colors.verifiedBlue,
                                backgroundColor: colors.card,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>

                  {/* Hidden export surface (cropped + strokes) */}
                  <View style={styles.hiddenExportSurface} pointerEvents="none">
                    {(() => {
                      const media = attachedMedia[editingIndex];
                      const frameW = editorFrameSize.width;
                      const frameH = editorFrameSize.height;
                      if (!frameW || !frameH) return null;

                      const mult = Math.min(3, Math.max(2, PixelRatio.get()));
                      const exportW = Math.round(frameW * mult);
                      const exportH = Math.round(frameH * mult);

                      const { bounds } = getImageBoundsContain(frameW, frameH, media.width, media.height);
                      const imageW = bounds.width;
                      const imageH = bounds.height;
                      const x0 = bounds.x;
                      const y0 = bounds.y;

                      return (
                        <Svg ref={exportSvgRef} width={exportW} height={exportH}>
                          <SvgImage
                            href={{ uri: media.uri }}
                            x={x0 * mult}
                            y={y0 * mult}
                            width={imageW * mult}
                            height={imageH * mult}
                            preserveAspectRatio="none"
                          />
                          {strokes.length ? (renderStrokes(exportW, exportH) as any) : null}
                        </Svg>
                      );
                    })()}
                  </View>
                </View>
              </SafeAreaView>
            ) : null}
          </Modal>

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
    backgroundColor: 'transparent',
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
  editorModalContainer: { flex: 1 },
  editorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  editorModalHeaderText: { fontWeight: '900', fontSize: 14 },
  editorModalTitle: { fontWeight: '900', fontSize: 14 },
  editorModalToolbar: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  modeRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modeBtn: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnText: { fontWeight: '900', fontSize: 12 },
  drawToolsRow: { gap: 10 },
  cropHint: { fontSize: 12, fontWeight: '700' },
  editorModalBody: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  editorFullFrame: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'visible',
  },
  cropOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  cropDim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 2.5,
    borderRadius: 8,
  },
  cropHandle: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
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
