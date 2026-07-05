/**
 * Web-only background removal - optimized for speed.
 * Key optimizations:
 * 1. Fast quantized model (isnet_quint8) - 3-5x faster than default
 * 2. Aggressive image resize before processing (max 512px)
 * 3. Model preloading in background
 */
import { Platform } from 'react-native';

const CDN_URLS = [
  'https://esm.sh/@imgly/background-removal@1.7.0',
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm',
];

const MAX_DIMENSION = 512; // 처리 전 이미지 최대 크기 - 작을수록 빠름

let _modulePromise: Promise<any> | null = null;
let _modelPreloaded = false;

function loadModuleViaScript(url: string): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('window/document not available'));
      return;
    }
    const w = window as any;
    if (w.__nextlook_imgly__) {
      resolve(w.__nextlook_imgly__);
      return;
    }
    const eventName = `nextlook-imgly-loaded-${Math.random().toString(36).slice(2)}`;
    const errorEventName = `nextlook-imgly-error-${Math.random().toString(36).slice(2)}`;

    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      (async () => {
        try {
          const mod = await import('${url}');
          window.__nextlook_imgly__ = mod;
          window.dispatchEvent(new CustomEvent('${eventName}'));
        } catch (e) {
          console.error('[bgRemove/script] load failed:', e);
          window.__nextlook_imgly_error__ = String(e);
          window.dispatchEvent(new CustomEvent('${errorEventName}'));
        }
      })();
    `;

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Module load timeout (60s) from ${url}`));
    }, 60000);

    function cleanup() {
      window.removeEventListener(eventName, onLoaded);
      window.removeEventListener(errorEventName, onError);
      clearTimeout(timeoutId);
    }
    function onLoaded() {
      cleanup();
      resolve(w.__nextlook_imgly__);
    }
    function onError() {
      cleanup();
      reject(new Error(w.__nextlook_imgly_error__ || `unknown load error from ${url}`));
    }
    window.addEventListener(eventName, onLoaded, { once: true });
    window.addEventListener(errorEventName, onError, { once: true });

    document.head.appendChild(script);
  });
}

async function loadModule(): Promise<any> {
  if (_modulePromise) return _modulePromise;
  _modulePromise = (async () => {
    let lastErr: any = null;
    for (const url of CDN_URLS) {
      try {
        console.log(`[bgRemove] Trying CDN: ${url}`);
        const mod = await loadModuleViaScript(url);
        console.log(`[bgRemove] Loaded from: ${url}`);
        return mod;
      } catch (e) {
        console.warn(`[bgRemove] Failed to load from ${url}:`, e);
        lastErr = e;
      }
    }
    throw lastErr || new Error('All CDN sources failed');
  })();
  return _modulePromise;
}

/**
 * 앱 시작 시 백그라운드에서 미리 라이브러리 로드
 * → 사용자가 실제로 옷 등록할 때 즉시 처리 시작
 */
export function preloadBackgroundRemoval(): void {
  if (Platform.OS !== 'web' || _modelPreloaded) return;
  _modelPreloaded = true;
  console.log('[bgRemove] Preloading library in background...');
  loadModule().catch((e) => {
    console.warn('[bgRemove] Preload failed (will retry on demand):', e);
    _modulePromise = null;
    _modelPreloaded = false;
  });
}

/** 이미지 크기 줄이기 - 배경 제거 처리 속도 3-4배 향상 */
async function resizeImage(uri: string, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas ctx null'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('blob null'));
        console.log(`[bgRemove] Resized: ${img.width}x${img.height} → ${width}x${height} (${(blob.size / 1024).toFixed(0)}KB)`);
        resolve(blob);
      }, 'image/jpeg', 0.92);
    };
    img.onerror = reject;
    img.src = uri;
  });
}

export async function removeBackgroundWeb(localUri: string): Promise<string | null> {
  if (Platform.OS !== 'web') return null;
  const start = Date.now();
  console.log('[bgRemove] starting for uri:', localUri.substring(0, 60) + '...');
  try {
    // 1. 이미지 리사이즈 (빠른 처리를 위해)
    const resizedBlob = await resizeImage(localUri, MAX_DIMENSION);

    // 2. 라이브러리 로드 (이미 preload됐다면 즉시)
    const mod = await loadModule();

    const removeBackground =
      (mod as any).removeBackground ??
      (mod as any).default?.removeBackground ??
      (mod as any).default;

    if (typeof removeBackground !== 'function') {
      console.warn('[bgRemove] removeBackground function not found in module');
      return null;
    }

    // 3. 빠른 모델로 배경 제거
    console.log('[bgRemove] processing with fast model...');
    const blob: Blob = await removeBackground(resizedBlob, {
      // 가장 빠른 quantized 모델 사용 (3-5배 빠름, 품질 약간 낮음)
      model: 'isnet_quint8',
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
    _modulePromise = null;
    return null;
  }
}
