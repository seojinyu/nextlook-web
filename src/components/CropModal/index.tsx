/**
 * Web-only image crop modal using react-image-crop.
 * - 자유 비율 드래그 crop
 * - 인앱 브라우저(네이버·카톡) 대응: 인라인 CSS + touch-action: none
 * - 로드 실패 시 원본을 그대로 넘겨 파이프라인 유지
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { injectCropCss } from './inlineCss';
import { getCroppedImage, type PixelCrop } from './canvasHelpers';
import { styles } from './styles';

interface Props {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onComplete: (croppedUri: string) => void;
}

export default function CropModal({ visible, imageUri, onCancel, onComplete }: Props) {
  const [crop, setCrop] = useState<any>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ReactCrop, setReactCrop] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // react-image-crop 라이브러리 lazy load
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || ReactCrop) return;
    let cancelled = false;
    (async () => {
      try {
        injectCropCss();
        const mod = await import('react-image-crop');
        if (cancelled) return;
        const Comp = mod.default;
        if (typeof Comp !== 'function' && typeof Comp !== 'object') {
          console.error('[CropModal] ReactCrop is invalid:', typeof Comp);
          setLoadError(true);
          return;
        }
        setReactCrop(() => Comp);
      } catch (e) {
        console.error('[CropModal] failed to load react-image-crop:', e);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, ReactCrop]);

  // 로드 실패 시 원본 그대로 진행
  useEffect(() => {
    if (loadError && imageUri && visible) {
      console.warn('[CropModal] crop unavailable, skipping to next step');
      onComplete(imageUri);
    }
  }, [loadError, imageUri, visible, onComplete]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const initial = {
      unit: 'px' as const,
      x: width * 0.05,
      y: height * 0.05,
      width: width * 0.9,
      height: height * 0.9,
    };
    setCrop(initial);
    setCompletedCrop(initial);
  }, []);

  const handleDone = useCallback(async () => {
    if (!imageUri || !completedCrop || !imgRef.current) {
      if (imageUri) onComplete(imageUri);
      return;
    }
    setProcessing(true);
    try {
      const croppedUri = await getCroppedImage(imgRef.current, completedCrop);
      onComplete(croppedUri);
    } catch (e) {
      console.error('[CropModal] crop failed:', e);
      if (imageUri) onComplete(imageUri);
    } finally {
      setProcessing(false);
    }
  }, [imageUri, completedCrop, onComplete]);

  const resetCrop = useCallback(() => {
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    setCrop({ unit: 'px', x: 0, y: 0, width, height });
  }, []);

  if (!visible || !imageUri) return null;
  if (Platform.OS !== 'web') return null;

  // 라이브러리 로딩 중
  if (!ReactCrop && !loadError) {
    return (
      <View style={styles.overlay}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1B6B4A" />
          <Text style={styles.loaderText}>사진 편집기 로드 중...</Text>
        </View>
      </View>
    );
  }

  if (loadError) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.title}>사진 자르기</Text>
          <TouchableOpacity onPress={handleDone} style={styles.headerBtn} disabled={processing}>
            {processing ? (
              <ActivityIndicator color="#1B6B4A" size="small" />
            ) : (
              <Text style={styles.doneText}>완료</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cropWrap}>
          <div
            style={{
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            } as any}
          >
            <ReactCrop
              crop={crop}
              onChange={(c: any) => setCrop(c)}
              onComplete={(c: PixelCrop) => setCompletedCrop(c)}
              keepSelection
              minWidth={30}
              minHeight={30}
              ruleOfThirds
            >
              <img
                ref={(el: HTMLImageElement | null) => { if (el) imgRef.current = el; }}
                src={imageUri}
                alt="crop"
                crossOrigin="anonymous"
                onLoad={onImageLoad}
                draggable={false}
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  display: 'block',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitUserDrag: 'none',
                  pointerEvents: 'auto',
                } as any}
              />
            </ReactCrop>
          </div>
        </View>

        <View style={styles.controls}>
          <Text style={styles.help}>
            모서리·가장자리를 드래그해서 원하는 크기와 위치로 자유롭게 자르세요
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={resetCrop}>
            <Text style={styles.resetBtnText}>전체 선택 (원본)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
