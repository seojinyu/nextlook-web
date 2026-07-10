/**
 * @imgly/background-removal 라이브러리 lazy 로더.
 * 여러 CDN을 순서대로 시도하며, 로드된 모듈은 window에 캐시해 재사용.
 */
import { Platform } from 'react-native';
import { CDN_URLS, isMobileUA } from './constants';

let modulePromise: Promise<any> | null = null;
let modelPreloaded = false;

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

export async function loadModule(): Promise<any> {
  if (modulePromise) return modulePromise;
  modulePromise = (async () => {
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
  return modulePromise;
}

/** 로드 실패로 재시도가 필요할 때 호출 */
export function resetModuleCache() {
  modulePromise = null;
  modelPreloaded = false;
}

/**
 * 앱 시작 시 사전 로드 (데스크탑에서만).
 * 모바일은 메모리 부족으로 크래시 위험이 있어 실제 필요할 때 로드.
 */
export function preloadBackgroundRemoval(): void {
  if (Platform.OS !== 'web' || modelPreloaded) return;
  if (isMobileUA()) {
    console.log('[bgRemove] 모바일 감지 - preload 스킵');
    return;
  }
  modelPreloaded = true;
  console.log('[bgRemove] Preloading library in background...');
  loadModule().catch((e) => {
    console.warn('[bgRemove] Preload failed (will retry on demand):', e);
    resetModuleCache();
  });
}
