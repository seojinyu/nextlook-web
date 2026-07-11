/**
 * Web-only 배경 제거 - 속도 최적화.
 * 주요 최적화:
 * 1. 빠른 양자화 모델 (isnet_quint8) — 기본 대비 3~5배 빠름
 * 2. 처리 전 이미지 리사이즈 (최대 512px)
 * 3. 백그라운드 프리로드 (데스크탑 전용)
 *
 * 세부 구현은 다음 파일들로 분리:
 * - constants.ts    CDN URL, 상수
 * - moduleLoader.ts CDN에서 @imgly 라이브러리 lazy 로드
 * - resize.ts       처리 전 리사이즈
 */
import { Platform } from 'react-native';
import { MAX_DIMENSION, isMobileUA } from './constants';
import { loadModule, resetModuleCache } from './moduleLoader';
import { resizeImage } from './resize';

export { preloadBackgroundRemoval } from './moduleLoader';

export async function removeBackgroundWeb(localUri: string): Promise<string | null> {
  if (Platform.OS !== 'web') return null;

  // 🚫 모바일 브라우저는 배경 제거 완전 스킵.
  // WASM 모델(~20MB) + 이미지 처리로 크래시("탭 중지") 유발 + 15~30초 지연.
  // 원본 사진 그대로 저장하고, 배경 제거는 데스크탑에서만 실행.
  if (isMobileUA()) {
    console.log('[bgRemove] 모바일 감지 - 배경 제거 스킵 (원본만 저장)');
    return null;
  }

  const start = Date.now();
  console.log('[bgRemove] starting for uri:', localUri.substring(0, 60) + '...');
  try {
    const resizedBlob = await resizeImage(localUri, MAX_DIMENSION);
    const mod = await loadModule();

    const removeBackground =
      (mod as any).removeBackground ??
      (mod as any).default?.removeBackground ??
      (mod as any).default;

    if (typeof removeBackground !== 'function') {
      console.warn('[bgRemove] removeBackground function not found in module');
      return null;
    }

    // 데스크탑 전용 - 정확한 모델 사용
    const model = 'isnet_fp16';
    console.log(`[bgRemove] processing with ${model}...`);

    const blob: Blob = await removeBackground(resizedBlob, {
      model,
      output: { format: 'image/png', quality: 0.9 },
      debug: false,
      progress: (key: string, current: number, total: number) => {
        if (current === total) {
          console.log(`[bgRemove] ${key} complete (${((Date.now() - start) / 1000).toFixed(1)}s)`);
        }
      },
    });

    const totalMs = Date.now() - start;
    console.log(`[bgRemove] SUCCESS! ${(blob.size / 1024).toFixed(0)}KB in ${(totalMs / 1000).toFixed(1)}s`);
    return URL.createObjectURL(blob);
  } catch (e: any) {
    console.error('[bgRemove] FAILED:', e?.message || e);
    resetModuleCache();
    return null;
  }
}
