/**
 * 화면 재렌더링 사이에도 유지되는 모듈 레벨 캐시.
 * 모바일 메모리 보호를 위해 signedUrl 캐시는 LRU 스타일로 크기 제한.
 */
import type { Clothing } from '../../lib/types';

export let cachedCoords: { latitude: number; longitude: number } | null = null;
export function setCachedCoords(v: typeof cachedCoords) { cachedCoords = v; }

export let cachedClothes: Clothing[] | null = null;
export function setCachedClothes(v: Clothing[] | null) { cachedClothes = v; }

export let cachedRecentIds: Set<string> | null = null;
export function setCachedRecentIds(v: Set<string> | null) { cachedRecentIds = v; }

export let cachedClothesUrlMap = new Map<string, Clothing & { signedUrl: string }>();
export function setCachedClothesUrlMap(v: typeof cachedClothesUrlMap) { cachedClothesUrlMap = v; }

export let dataReady = false;
export function setDataReady(v: boolean) { dataReady = v; }

const SIGNED_URL_CACHE_MAX = 200;
export const signedUrlCache = new Map<string, string>();

export function setCachedSignedUrl(key: string, value: string) {
  if (signedUrlCache.size >= SIGNED_URL_CACHE_MAX) {
    const firstKey = signedUrlCache.keys().next().value;
    if (firstKey) signedUrlCache.delete(firstKey);
  }
  signedUrlCache.set(key, value);
}

export function clearAllCaches() {
  cachedCoords = null;
  cachedClothes = null;
  cachedRecentIds = null;
  dataReady = false;
  signedUrlCache.clear();
  cachedClothesUrlMap.clear();
}
