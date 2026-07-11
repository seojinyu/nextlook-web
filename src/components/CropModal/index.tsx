/**
 * Web-only image crop modal.
 *
 * 설계:
 * - react-image-crop을 정적 import (동적 import는 인앱 브라우저에서 종종 실패)
 * - 인라인 CSS 주입으로 CDN CSS 차단 인앱 브라우저 대응
 * - touch-action: none 으로 모바일 드래그 안정성 확보
 * - blob URL 대상이라 crossOrigin 불필요 (오히려 일부 브라우저에서 오류 유발)
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import ReactCrop from 'react-image-crop';
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
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // 인앱 브라우저 CDN CSS 차단 대비 인라인 CSS 주입 (한 번만)
  useEffect(() => {
    if (visible && Platform.OS === 'web') {
      injectCropCss();
    }
  }, [visible]);

  // 새 이미지가 들어오면 상태 리셋
  useEffect(() => {
    if (imageUri) {
      setImgLoaded(false);
      setCrop(undefined);
      setCompletedCrop(null);
    }
  }, [imageUri]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    const { width, height } = img;
    console.log('[CropModal] 이미지 로드:', width, 'x', height);

    // 초기 crop: 중앙 90%
    const initial: PixelCrop = {
      unit: 'px',
      x: width * 0.05,
      y: height * 0.05,
      width: width * 0.9,
      height: height * 0.9,
    };
    setCrop(initial);
    setCompletedCrop(initial);
    setImgLoaded(true);
  }, []);

  const handleDone = useCallback(async () => {
    if (!imageUri) return;
    if (!completedCrop || !imgRef.current) {
      onComplete(imageUri);
      return;
    }
    setProcessing(true);
    try {
      const croppedUri = await getCroppedImage(imgRef.current, completedCrop);
      console.log('[CropModal] 자르기 완료');
      onComplete(croppedUri);
    } catch (e) {
      console.error('[CropModal] 자르기 실패, 원본 사용:', e);
      onComplete(imageUri);
    } finally {
      setProcessing(false);
    }
  }, [imageUri, completedCrop, onComplete]);

  const resetCrop = useCallback(() => {
    if (!imgRef.current) return;
    const { width, height } = imgRef.current;
    const full: PixelCrop = { unit: 'px', x: 0, y: 0, width, height };
    setCrop(full);
    setCompletedCrop(full);
  }, []);

  if (!visible || !imageUri) return null;
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.title}>사진 자르기</Text>
          <TouchableOpacity
            onPress={handleDone}
            style={styles.headerBtn}
            disabled={processing || !imgLoaded}
          >
            {processing ? (
              <ActivityIndicator color="#1B6B4A" size="small" />
            ) : (
              <Text style={[styles.doneText, !imgLoaded && { opacity: 0.4 }]}>완료</Text>
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
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              keepSelection
              minWidth={30}
              minHeight={30}
              ruleOfThirds
            >
              <img
                ref={(el) => { if (el) imgRef.current = el; }}
                src={imageUri}
                alt="자를 사진"
                onLoad={onImageLoad}
                draggable={false}
                style={{
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  display: 'block',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  pointerEvents: 'auto',
                } as any}
              />
            </ReactCrop>
          </div>

          {!imgLoaded && (
            <View style={{ position: 'absolute', top: '50%', left: '50%' } as any}>
              <ActivityIndicator size="large" color="#1B6B4A" />
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <Text style={styles.help}>
            모서리·가장자리를 드래그해서 원하는 크기와 위치로 자유롭게 자르세요
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={resetCrop} disabled={!imgLoaded}>
            <Text style={styles.resetBtnText}>전체 선택 (원본)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
