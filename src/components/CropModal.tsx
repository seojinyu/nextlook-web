/**
 * Web-only image crop modal using react-easy-crop.
 * On mobile native, we rely on expo-image-picker's allowsEditing.
 */
import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// react-easy-crop 은 web 전용 컴포넌트라 web에서만 동적으로 로드
let Cropper: any = null;
if (Platform.OS === 'web') {
  try {
    // dynamic import를 통해 번들 문제 회피
    Cropper = require('react-easy-crop').default;
  } catch (e) {
    console.warn('[CropModal] react-easy-crop load failed:', e);
  }
}

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

export default function CropModal({ visible, imageUri, onCancel, onComplete }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPx: Area) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleDone = useCallback(async () => {
    if (!imageUri || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const croppedUri = await getCroppedImage(imageUri, croppedAreaPixels);
      onComplete(croppedUri);
    } catch (e) {
      console.error('[CropModal] crop failed:', e);
      onCancel();
    } finally {
      setProcessing(false);
    }
  }, [imageUri, croppedAreaPixels, onComplete, onCancel]);

  if (!visible || !imageUri) return null;

  // Web에서만 동작 (mobile은 expo-image-picker의 allowsEditing 사용)
  if (Platform.OS !== 'web' || !Cropper) {
    // Fallback: crop 없이 바로 전달
    return null;
  }

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

        <View style={styles.cropArea}>
          <Cropper
            image={imageUri}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid={true}
          />
        </View>

        <View style={styles.controls}>
          <Text style={styles.help}>사진을 드래그하고 손가락 (또는 스크롤)으로 확대해서 옷 부분만 남기세요</Text>
          <View style={styles.zoomRow}>
            <Ionicons name="remove-circle-outline" size={22} color="#7A7570" />
            <View style={styles.slider}>
              <View style={[styles.sliderFill, { width: `${((zoom - 1) / 2) * 100}%` }]} />
            </View>
            <Ionicons name="add-circle-outline" size={22} color="#7A7570" />
          </View>
          <View style={styles.zoomButtons}>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => setZoom(Math.max(1, zoom - 0.2))}
            >
              <Text style={styles.zoomBtnText}>축소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => setZoom(1)}
            >
              <Text style={styles.zoomBtnText}>원본</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => setZoom(Math.min(3, zoom + 0.2))}
            >
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
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  controls: {
    padding: 16,
    backgroundColor: '#FAFAF8',
  },
  help: { fontSize: 12, color: '#7A7570', textAlign: 'center', marginBottom: 12 },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  slider: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: '#EDEAE6', overflow: 'hidden',
  },
  sliderFill: { height: 4, backgroundColor: '#1B6B4A' },
  zoomButtons: { flexDirection: 'row', gap: 8 },
  zoomBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#F0EDEA', alignItems: 'center',
  },
  zoomBtnText: { color: '#1A1A1A', fontSize: 13, fontWeight: '700' },
});
