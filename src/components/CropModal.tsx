/**
 * Web-only image crop modal using react-image-crop.
 * Provides native photo-editor-like UX:
 * - Drag corners/edges to resize crop area freely
 * - Drag inside to move
 * - Aspect ratio unlocked by default
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';

interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'px' | '%';
}

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

  // react-image-crop 라이브러리 lazy load (웹에서만)
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || ReactCrop) return;
    let cancelled = false;
    (async () => {
      try {
        // 인앱 브라우저(네이버 등)는 외부 CDN CSS를 블록할 수 있어 인라인으로 주입
        if (!document.querySelector('style[data-react-image-crop-inline]')) {
          const style = document.createElement('style');
          style.setAttribute('data-react-image-crop-inline', 'true');
          style.textContent = REACT_CROP_INLINE_CSS;
          document.head.appendChild(style);
        }

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
    // 초기 crop 영역: 이미지 전체
    setCrop({
      unit: 'px',
      x: width * 0.05,
      y: height * 0.05,
      width: width * 0.9,
      height: height * 0.9,
    });
    setCompletedCrop({
      unit: 'px',
      x: width * 0.05,
      y: height * 0.05,
      width: width * 0.9,
      height: height * 0.9,
    });
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
    setCrop({
      unit: 'px',
      x: 0,
      y: 0,
      width,
      height,
    });
  }, []);

  if (!visible || !imageUri) return null;
  if (Platform.OS !== 'web') return null;

  // Cropper 로딩 중
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

/** Canvas API를 사용해 실제로 이미지를 자름 */
async function getCroppedImage(
  image: HTMLImageElement,
  crop: PixelCrop
): Promise<string> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas is empty'));
      resolve(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.92);
  });
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
  },
  loader: {
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: { fontSize: 14, color: '#1A1A1A', fontWeight: '600' },
  container: {
    width: '94%',
    maxWidth: 560,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#EDEAE6',
  },
  headerBtn: { minWidth: 60 },
  cancelText: { color: '#7A7570', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  doneText: { color: '#1B6B4A', fontSize: 15, fontWeight: '700', textAlign: 'right' },

  cropWrap: {
    padding: 16,
    backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 300,
  },
  controls: {
    padding: 16,
    backgroundColor: '#FAFAF8',
  },
  help: { fontSize: 12, color: '#7A7570', textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  resetBtn: {
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F0EDEA', alignItems: 'center',
  },
  resetBtnText: { color: '#1A1A1A', fontSize: 13, fontWeight: '700' },
});

/**
 * react-image-crop v11 최소 CSS (인앱 브라우저용 인라인)
 * 네이버/카톡 등 인앱 브라우저가 외부 CDN CSS를 차단해도 동작하도록 인라인 주입.
 * touch-action: none 이 핵심 — 모바일 드래그 조작에 필수.
 */
const REACT_CROP_INLINE_CSS = `
.ReactCrop {
  position: relative;
  display: inline-block;
  cursor: crosshair;
  overflow: hidden;
  max-width: 100%;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.ReactCrop *,
.ReactCrop *::before,
.ReactCrop *::after {
  box-sizing: border-box;
}
.ReactCrop--disabled,
.ReactCrop--locked { cursor: inherit; }
.ReactCrop__child-wrapper {
  overflow: hidden;
  max-height: inherit;
  touch-action: none;
}
.ReactCrop__child-wrapper > img,
.ReactCrop__child-wrapper > video {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  touch-action: none;
  -webkit-user-drag: none;
}
.ReactCrop:not(.ReactCrop--disabled) .ReactCrop__crop-selection { cursor: move; }
.ReactCrop--disabled .ReactCrop__crop-selection { cursor: inherit; }
.ReactCrop__crop-mask {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  width: 100%; height: 100%;
}
.ReactCrop__crop-selection {
  position: absolute;
  top: 0; left: 0;
  transform: translate3d(0, 0, 0);
  box-sizing: border-box;
  cursor: move;
  box-shadow: 0 0 0 9999em rgba(0,0,0,0.5);
  touch-action: none;
  border: 1px dashed #fff;
}
.ReactCrop--invisible-crop .ReactCrop__crop-mask,
.ReactCrop--invisible-crop .ReactCrop__crop-selection { display: none; }
.ReactCrop__rule-of-thirds-vt::before,
.ReactCrop__rule-of-thirds-vt::after,
.ReactCrop__rule-of-thirds-hz::before,
.ReactCrop__rule-of-thirds-hz::after {
  content: '';
  display: block;
  position: absolute;
  background-color: rgba(255,255,255,0.4);
}
.ReactCrop__rule-of-thirds-vt::before,
.ReactCrop__rule-of-thirds-vt::after { width: 1px; height: 100%; }
.ReactCrop__rule-of-thirds-vt::before { left: 33.3333%; }
.ReactCrop__rule-of-thirds-vt::after  { left: 66.6666%; }
.ReactCrop__rule-of-thirds-hz::before,
.ReactCrop__rule-of-thirds-hz::after { width: 100%; height: 1px; }
.ReactCrop__rule-of-thirds-hz::before { top: 33.3333%; }
.ReactCrop__rule-of-thirds-hz::after  { top: 66.6666%; }
.ReactCrop__drag-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: rgba(0,0,0,0.2);
  border: 2px solid #fff;
  box-sizing: border-box;
  outline: 1px solid transparent;
  touch-action: none;
}
.ReactCrop .ord-nw { top: 0;   left: 0;   margin-top: -10px; margin-left: -10px; cursor: nw-resize; }
.ReactCrop .ord-n  { top: 0;   left: 50%; margin-top: -10px; margin-left: -10px; cursor: n-resize; }
.ReactCrop .ord-ne { top: 0;   right: 0;  margin-top: -10px; margin-right: -10px; cursor: ne-resize; }
.ReactCrop .ord-e  { top: 50%; right: 0;  margin-top: -10px; margin-right: -10px; cursor: e-resize; }
.ReactCrop .ord-se { bottom: 0; right: 0; margin-bottom: -10px; margin-right: -10px; cursor: se-resize; }
.ReactCrop .ord-s  { bottom: 0; left: 50%; margin-bottom: -10px; margin-left: -10px; cursor: s-resize; }
.ReactCrop .ord-sw { bottom: 0; left: 0;  margin-bottom: -10px; margin-left: -10px; cursor: sw-resize; }
.ReactCrop .ord-w  { top: 50%; left: 0;   margin-top: -10px; margin-left: -10px; cursor: w-resize; }
.ReactCrop__disabled .ReactCrop__drag-handle { cursor: inherit; }
.ReactCrop__drag-bar {
  position: absolute;
  touch-action: none;
}
.ReactCrop__drag-bar.ord-n { top: 0;    left: 0;   width: 100%; height: 6px; margin-top: -3px; }
.ReactCrop__drag-bar.ord-e { right: 0;  top: 0;    height: 100%; width: 6px; margin-right: -3px; }
.ReactCrop__drag-bar.ord-s { bottom: 0; left: 0;   width: 100%; height: 6px; margin-bottom: -3px; }
.ReactCrop__drag-bar.ord-w { top: 0;    left: 0;   height: 100%; width: 6px; margin-left: -3px; }
@media (pointer: coarse) {
  .ReactCrop .ord-n, .ReactCrop .ord-e, .ReactCrop .ord-s, .ReactCrop .ord-w,
  .ReactCrop .ord-nw, .ReactCrop .ord-ne, .ReactCrop .ord-se, .ReactCrop .ord-sw {
    width: 28px;
    height: 28px;
    margin-top: -14px;
    margin-left: -14px;
    margin-right: -14px;
    margin-bottom: -14px;
  }
}
`;

