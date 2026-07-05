/**
 * Web-only image crop modal using react-easy-crop.
 * On mobile native, we rely on expo-image-picker's allowsEditing.
 */
import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onComplete: (croppedUri: string) => void;
}

const ASPECT_RATIOS = [
  { key: '1:1', label: '1:1', value: 1 },
  { key: '3:4', label: '3:4', value: 3 / 4 },
  { key: '4:3', label: '4:3', value: 4 / 3 },
  { key: '9:16', label: '9:16', value: 9 / 16 },
  { key: '16:9', label: '16:9', value: 16 / 9 },
  { key: 'free', label: '자유', value: 0 }, // 0이면 aspect 무시 (자유 리사이즈)
];

export default function CropModal({ visible, imageUri, onCancel, onComplete }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [Cropper, setCropper] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [aspectKey, setAspectKey] = useState<string>('3:4');
  const currentAspect = ASPECT_RATIOS.find((r) => r.key === aspectKey)?.value ?? 1;

  // Cropper 라이브러리 lazy load (웹에서만)
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || Cropper) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('react-easy-crop');
        if (cancelled) return;
        const CropperComp = mod.default;
        if (typeof CropperComp !== 'function') {
          console.error('[CropModal] Cropper is not a component:', typeof CropperComp);
          setLoadError(true);
          return;
        }
        setCropper(() => CropperComp);
      } catch (e) {
        console.error('[CropModal] failed to load react-easy-crop:', e);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, Cropper]);

  // Crop 라이브러리 로드 실패 시 → crop 없이 그대로 진행
  useEffect(() => {
    if (loadError && imageUri && visible) {
      console.warn('[CropModal] crop unavailable, skipping to next step');
      onComplete(imageUri);
    }
  }, [loadError, imageUri, visible, onComplete]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPx: Area) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleDone = useCallback(async () => {
    if (!imageUri || !croppedAreaPixels) {
      // crop 영역이 아직 계산 안 됐으면 원본 그대로 사용
      if (imageUri) onComplete(imageUri);
      return;
    }
    setProcessing(true);
    try {
      const croppedUri = await getCroppedImage(imageUri, croppedAreaPixels);
      onComplete(croppedUri);
    } catch (e) {
      console.error('[CropModal] crop failed:', e);
      // 잘못됐어도 원본으로 계속 진행
      onComplete(imageUri);
    } finally {
      setProcessing(false);
    }
  }, [imageUri, croppedAreaPixels, onComplete]);

  if (!visible || !imageUri) return null;
  if (Platform.OS !== 'web') return null;

  // Cropper 로딩 중
  if (!Cropper && !loadError) {
    return (
      <View style={styles.overlay}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1B6B4A" />
          <Text style={styles.loaderText}>사진 편집기 로드 중...</Text>
        </View>
      </View>
    );
  }

  // 로드 실패 → 자동으로 그대로 진행 (useEffect에서 처리됨)
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

        <View style={[styles.cropArea, aspectKey === 'free' && { aspectRatio: 4 / 3 }, aspectKey !== 'free' && aspectKey !== '1:1' && { aspectRatio: currentAspect }]}>
          <Cropper
            image={imageUri}
            crop={crop}
            zoom={zoom}
            {...(currentAspect > 0 ? { aspect: currentAspect } : { aspect: undefined })}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid={true}
            restrictPosition={false}
          />
        </View>

        {/* 비율 선택 */}
        <View style={styles.aspectRow}>
          {ASPECT_RATIOS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.aspectChip, aspectKey === r.key && styles.aspectChipActive]}
              onPress={() => {
                setAspectKey(r.key);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.aspectChipText, aspectKey === r.key && styles.aspectChipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.controls}>
          <Text style={styles.help}>비율을 선택하고 사진을 드래그·확대해서 옷 부분만 남기세요</Text>
          <View style={styles.zoomButtons}>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => setZoom(Math.max(1, zoom - 0.2))}
            >
              <Ionicons name="remove" size={18} color="#1A1A1A" />
              <Text style={styles.zoomBtnText}>축소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
            >
              <Ionicons name="refresh" size={18} color="#1A1A1A" />
              <Text style={styles.zoomBtnText}>원본</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => setZoom(Math.min(3, zoom + 0.2))}
            >
              <Ionicons name="add" size={18} color="#1A1A1A" />
              <Text style={styles.zoomBtnText}>확대</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Canvas API를 사용해 실제로 이미지를 자름 */
async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas is empty'));
      resolve(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.92);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (e) => reject(e));
    image.crossOrigin = 'anonymous';
    image.src = url;
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
    width: '92%',
    maxWidth: 500,
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

  cropArea: {
    width: '100%',
    height: 400,
    position: 'relative',
    backgroundColor: '#000',
  },
  controls: {
    padding: 16,
    backgroundColor: '#FAFAF8',
  },
  help: { fontSize: 12, color: '#7A7570', textAlign: 'center', marginBottom: 12 },

  aspectRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#EDEAE6',
    justifyContent: 'center', flexWrap: 'wrap',
  },
  aspectChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#F0EDEA',
    minWidth: 44, alignItems: 'center',
  },
  aspectChipActive: { backgroundColor: '#1B6B4A' },
  aspectChipText: { fontSize: 12, fontWeight: '700', color: '#7A7570' },
  aspectChipTextActive: { color: '#fff' },
  zoomButtons: { flexDirection: 'row', gap: 8 },
  zoomBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F0EDEA', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  zoomBtnText: { color: '#1A1A1A', fontSize: 13, fontWeight: '700' },
});
