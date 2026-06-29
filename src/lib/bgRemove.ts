/**
 * Web-only background removal using @imgly/background-removal loaded from CDN.
 * Avoids Metro bundler issues with dynamic imports in onnxruntime-web.
 *
 * The library is downloaded once on first use (~6MB model + lib).
 * On non-web platforms, returns null and caller should fall back to original.
 */
import { Platform } from 'react-native';

const CDN_URL = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/browser.mjs';

let _modulePromise: Promise<any> | null = null;

async function loadModule(): Promise<any> {
  if (_modulePromise) return _modulePromise;
  _modulePromise = (async () => {
    // @ts-expect-error - dynamic CDN import
    const mod = await import(/* @vite-ignore */ /* webpackIgnore: true */ CDN_URL);
    return mod;
  })();
  return _modulePromise;
}

export async function removeBackgroundWeb(localUri: string): Promise<string | null> {
  if (Platform.OS !== 'web') return null;
  try {
    const mod = await loadModule();
    const removeBackground = mod.removeBackground ?? mod.default?.removeBackground;
    if (!removeBackground) {
      console.warn('[bgRemove] removeBackground function not found in module');
      return null;
    }
    const blob = await removeBackground(localUri, {
      output: { format: 'image/png', quality: 0.9 },
    });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('[bgRemove] failed:', e);
    return null;
  }
}
