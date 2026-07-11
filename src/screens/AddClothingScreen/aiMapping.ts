/**
 * AI 분석 결과 → 우리 팔레트로 정규화하는 헬퍼.
 * - findClosestColor: hex가 정확히 없어도 가장 가까운 팔레트 색으로 매핑
 * - normalizeCategory: 카테고리 검증
 * - normalizeSeason: 계절 검증
 */
import { COLORS, type ColorEntry } from './constants';
import type { ClothingCategory } from '../../lib/types';

/** hex → RGB [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  return [(bigint >> 16) & 0xff, (bigint >> 8) & 0xff, bigint & 0xff];
}

/** 두 색 사이의 유클리드 거리 (0~약 442) */
function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * AI가 반환한 hex와 가장 가까운 팔레트 색을 찾는다.
 * exact match 실패해도 항상 팔레트 색으로 정규화되도록 보장.
 */
export function findClosestColor(hex: string): ColorEntry {
  if (!hex) return COLORS[0];

  // 정확히 일치하면 즉시 반환
  const exact = COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
  if (exact) return exact;

  // 가장 가까운 색으로
  let best = COLORS[0];
  let bestDist = colorDistance(hex, best.hex);
  for (const c of COLORS) {
    const d = colorDistance(hex, c.hex);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export function normalizeCategory(cat?: string): ClothingCategory | null {
  if (cat === 'top' || cat === 'bottom' || cat === 'jacket') return cat;
  return null;
}

export function normalizeSeason(s?: string): 'summer' | 'winter' | 'spring_fall' | null {
  if (s === 'summer' || s === 'winter' || s === 'spring_fall') return s;
  return null;
}
