/**
 * Web-only background removal.
 * Loads @imgly/background-removal via <script type="module"> tag injection
 * (more reliable than dynamic import Function eval).
 */
import { Platform } from 'react-native';

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';

let _modulePromise: Promise<any> | null = null;

function loadModuleViaScript(): Promise<any> {
  if (_modulePromise) return _modulePromise;
  _modulePromise = new Promise<any>((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('window/document not available'));
      return;
    }
    // 이미 로드된 경우 재사용
    const w = window as any;
    if (w.__nextlook_imgly__) {
      resolve(w.__nextlook_imgly__);
      return;
    }
    // 안전한 이벤트 이름
    const eventName = 'nextlook-imgly-loaded';
    const errorEventName = 'nextlook-imgly-error';

    // module 스크립트 삽입 - import는 실제로 브라우저가 처리
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      (async () => {
        try {
          const mod = await import('${CDN_URL}');
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
      reject(new Error('Module load timeout (30s)'));
    }, 30000);

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
      reject(new Error(w.__nextlook_imgly_error__ || 'unknown load error'));
    }
    window.addEventListener(eventName, onLoaded, { once: true });
    window.addEventListener(errorEventName, onError, { once: true });

    document.head.appendChild(script);
  });
  return _modulePromise;
}

export async function removeBackgroundWeb(localUri: string): Promise<string | null> {
  if (Platform.OS !== 'web') return null;
  console.log('[bgRemove] starting for uri:', localUri.substring(0, 60) + '...');
  try {
    console.log('[bgRemove] loading module...');
    const mod = await loadModuleViaScript();
    console.log('[bgRemove] module loaded. keys:', Object.keys(mod).slice(0, 10));

    const removeBackground =
      (mod as any).removeBackground ??
      (mod as any).default?.removeBackground ??
      (mod as any).default;

    if (typeof removeBackground !== 'function') {
      console.warn('[bgRemove] removeBackground function not found in module');
      return null;
    }

    console.log('[bgRemove] processing image (this can take 10-30s on first run)...');
    const blob: Blob = await removeBackground(localUri, {
      output: { format: 'image/png', quality: 0.9 },
      progress: (key: string, current: number, total: number) => {
        if (current === total) {
          console.log(`[bgRemove] ${key} complete`);
        }
      },
    });
    console.log('[bgRemove] SUCCESS! blob size:', blob.size, 'bytes');
    return URL.createObjectURL(blob);
  } catch (e: any) {
    console.error('[bgRemove] FAILED:', e?.message || e);
    return null;
  }
}
