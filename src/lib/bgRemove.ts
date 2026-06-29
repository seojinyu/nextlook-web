/**
 * Web-only background removal using @imgly/background-removal loaded from CDN.
 * Avoids Metro bundler issues with dynamic imports in onnxruntime-web.
 *
 * The library is downloaded once on first use (~6MB model + lib).
 * On non-web platforms, returns null and caller should fall back to original.
 */
import { Platform } from 'react-native';

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';

let _modulePromise: Promise<any> | null = null;

async function loadModule(): Promise<any> {
  if (_modulePromise) return _modulePromise;
  _modulePromise = (async () => {
    // 동적 CDN import — Metro 번들러는 이걸 통과시킴 (string concat으로 숨김)
    const url = CDN_URL;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const mod = await Function('u', 'return import(u)')(url);
    return mod;
  })();
  return _modulePromise;
}

export async function removeBackgroundWeb(localUri: string): Promise<string | null> {
  if (Platform.OS !== 'web') return null;
  console.log('[bgRemove] starting...');
  try {
    const mod = await loadModule();
    console.log('[bgRemove] module loaded', Object.keys(mod));
    const removeBackground = mod.removeBackground ?? mod.default?.removeBackground ?? mod.default;
    if (typeof removeBackground !== 'function') {
      console.warn('[bgRemove] removeBackground function not found', mod);
      return null;
    }
    console.log('[bgRemove] processing image...');
    const blob = await removeBackground(localUri, {
      output: { format: 'image/png', quality: 0.9 },
    });
    console.log('[bgRemove] done, blob size:', blob.size);
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('[bgRemove] failed:', e);
    return null;
  }
}
