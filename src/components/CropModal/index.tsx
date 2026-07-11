/**
 * Web-only image crop modal (custom implementation).
 *
 * react-image-crop 대신 순수 HTML + 포인터 이벤트로 자체 구현 →
 * 모든 브라우저(모바일/데스크탑/인앱)에서 동일하게 작동.
 *
 * 조작:
 *  - 크롭 박스 내부 드래그 → 위치 이동
 *  - 4개 모서리 핸들 드래그 → 크기 조절 (자유 비율)
 *  - "전체 선택" → 이미지 전체
 *  - "완료" → 캔버스로 잘라 blob URL 반환
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { styles } from './styles';

interface Props {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onComplete: (croppedUri: string) => void;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

const MIN_SIZE = 40; // 최소 크롭 크기 (px)

export default function CropModal({ visible, imageUri, onCancel, onComplete }: Props) {
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; startBox: Box } | null>(null);

  useEffect(() => {
    if (imageUri) {
      setImgLoaded(false);
      setBox({ x: 0, y: 0, w: 0, h: 0 });
    }
  }, [imageUri]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    const w = img.width;
    const h = img.height;
    console.log('[CropModal] 이미지 로드:', w, 'x', h, '(natural:', img.naturalWidth, 'x', img.naturalHeight, ')');
    setImgSize({ w, h });
    // 초기 크롭: 이미지 90%
    setBox({
      x: w * 0.05,
      y: h * 0.05,
      w: w * 0.9,
      h: h * 0.9,
    });
    setImgLoaded(true);
  }, []);

  const clampBox = (b: Box, imgW: number, imgH: number): Box => {
    const w = Math.max(MIN_SIZE, Math.min(b.w, imgW));
    const h = Math.max(MIN_SIZE, Math.min(b.h, imgH));
    const x = Math.max(0, Math.min(b.x, imgW - w));
    const y = Math.max(0, Math.min(b.y, imgH - h));
    return { x, y, w, h };
  };

  const startDrag = (handle: Handle, e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgLoaded) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startBox: box,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !drag.handle) return;
    e.preventDefault();
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const b = { ...drag.startBox };

    if (drag.handle === 'move') {
      b.x += dx;
      b.y += dy;
    } else {
      if (drag.handle === 'nw') {
        b.x += dx;
        b.y += dy;
        b.w -= dx;
        b.h -= dy;
      } else if (drag.handle === 'ne') {
        b.y += dy;
        b.w += dx;
        b.h -= dy;
      } else if (drag.handle === 'sw') {
        b.x += dx;
        b.w -= dx;
        b.h += dy;
      } else if (drag.handle === 'se') {
        b.w += dx;
        b.h += dy;
      }
    }

    setBox(clampBox(b, imgSize.w, imgSize.h));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  };

  const resetCrop = () => {
    if (!imgSize.w || !imgSize.h) return;
    setBox({ x: 0, y: 0, w: imgSize.w, h: imgSize.h });
  };

  const handleDone = useCallback(async () => {
    if (!imageUri) return;
    if (!imgRef.current || !imgLoaded || box.w < 5 || box.h < 5) {
      onComplete(imageUri);
      return;
    }
    setProcessing(true);
    try {
      const img = imgRef.current;
      // display 좌표 → 실제 이미지 좌표로 변환
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(box.w * scaleX);
      canvas.height = Math.floor(box.h * scaleY);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas ctx null');
      ctx.drawImage(
        img,
        box.x * scaleX,
        box.y * scaleY,
        box.w * scaleX,
        box.h * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });
      if (!blob) throw new Error('toBlob null');
      const url = URL.createObjectURL(blob);
      console.log('[CropModal] 자르기 완료:', canvas.width, 'x', canvas.height);
      onComplete(url);
    } catch (e) {
      console.error('[CropModal] 자르기 실패, 원본 사용:', e);
      onComplete(imageUri);
    } finally {
      setProcessing(false);
    }
  }, [imageUri, box, imgLoaded, onComplete]);

  if (!visible || !imageUri) return null;
  if (Platform.OS !== 'web') return null;

  const HANDLE_SIZE = 22;
  const handleStyle = (pos: { top?: number; left?: number; right?: number; bottom?: number }) => ({
    position: 'absolute' as const,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    background: '#fff',
    border: '3px solid #1B6B4A',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    ...pos,
    touchAction: 'none' as const,
  });

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
              position: 'relative',
              display: 'inline-block',
              maxWidth: '100%',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
            } as any}
          >
            <img
              ref={(el) => { if (el) imgRef.current = el; }}
              src={imageUri}
              alt="자를 사진"
              onLoad={onImageLoad}
              draggable={false}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '60vh',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
              } as any}
            />

            {imgLoaded && (
              <>
                {/* 크롭 영역 밖 어두운 오버레이 (4개 조각) */}
                <div
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: box.y,
                    background: 'rgba(0,0,0,0.55)',
                    pointerEvents: 'none',
                  } as any}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: box.y + box.h,
                    left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.55)',
                    pointerEvents: 'none',
                  } as any}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: box.y,
                    left: 0,
                    width: box.x,
                    height: box.h,
                    background: 'rgba(0,0,0,0.55)',
                    pointerEvents: 'none',
                  } as any}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: box.y,
                    left: box.x + box.w,
                    right: 0,
                    height: box.h,
                    background: 'rgba(0,0,0,0.55)',
                    pointerEvents: 'none',
                  } as any}
                />

                {/* 크롭 박스 (움직임 가능) */}
                <div
                  onPointerDown={(e) => startDrag('move', e)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  style={{
                    position: 'absolute',
                    top: box.y,
                    left: box.x,
                    width: box.w,
                    height: box.h,
                    border: '2px solid #fff',
                    boxSizing: 'border-box',
                    cursor: 'move',
                    touchAction: 'none',
                  } as any}
                />

                {/* 4개 모서리 핸들 (크기 조절) */}
                <div
                  onPointerDown={(e) => startDrag('nw', e)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  style={{
                    ...handleStyle({}),
                    top: box.y - HANDLE_SIZE / 2,
                    left: box.x - HANDLE_SIZE / 2,
                    cursor: 'nw-resize',
                  } as any}
                />
                <div
                  onPointerDown={(e) => startDrag('ne', e)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  style={{
                    ...handleStyle({}),
                    top: box.y - HANDLE_SIZE / 2,
                    left: box.x + box.w - HANDLE_SIZE / 2,
                    cursor: 'ne-resize',
                  } as any}
                />
                <div
                  onPointerDown={(e) => startDrag('sw', e)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  style={{
                    ...handleStyle({}),
                    top: box.y + box.h - HANDLE_SIZE / 2,
                    left: box.x - HANDLE_SIZE / 2,
                    cursor: 'sw-resize',
                  } as any}
                />
                <div
                  onPointerDown={(e) => startDrag('se', e)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  style={{
                    ...handleStyle({}),
                    top: box.y + box.h - HANDLE_SIZE / 2,
                    left: box.x + box.w - HANDLE_SIZE / 2,
                    cursor: 'se-resize',
                  } as any}
                />
              </>
            )}
          </div>

          {!imgLoaded && (
            <View style={{ position: 'absolute', top: '50%' } as any}>
              <ActivityIndicator size="large" color="#1B6B4A" />
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <Text style={styles.help}>
            녹색 핸들을 잡고 크기 조절 · 박스 내부를 잡고 위치 이동
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={resetCrop} disabled={!imgLoaded}>
            <Text style={styles.resetBtnText}>전체 선택 (원본)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
