/**
 * Web-only background removal.
 * Tries multiple CDN sources for reliability.
 */
import { Platform } from 'react-native';

// esm.sh와 jsdelivr 두 곳에서 fallback
const CDN_URLS = [
  'https://esm.sh/@imgly/background-removal@1.7.0',
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm',
];

let _modulePromise: Promise<any> | null = null;

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

export async function removeBackgroundWeb(localUri: string): Promise<string | null> {
  if (Platform.OS !== 'web') return null;
  console.log('[bgRemove] starting for uri:', localUri.substring(0, 60) + '...');
  try {
    const mod = await loadModule();
    console.log('[bgRemove] module ready. keys:', Object.keys(mod).slice(0, 10));

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
    // 실패한 module cache 초기화 (다음 재시도 위해)
    _modulePromise = null;
    return null;
  }
}
