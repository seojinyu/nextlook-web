import type { Clothing, OutfitSuggestion } from '../../lib/types';
import { SCREEN_W, SLOT_GAP, H_PAD, WEATHER_ICON } from './constants';

/** yyyy-mm-dd → "M월 D일 (요일)" */
export function formatDate(d: string) {
  const [, m, day] = d.split('-');
  const weekday = ['일', '월', '화', '수', '목', '금', '토'];
  return `${parseInt(m)}월 ${parseInt(day)}일 (${weekday[new Date(d).getDay()]})`;
}

export function getSlotCount(s: OutfitSuggestion) {
  return [s.top_id, s.bottom_id, s.jacket_id].filter(Boolean).length;
}

export function getSlotSize(s: OutfitSuggestion) {
  const n = getSlotCount(s);
  return (SCREEN_W - H_PAD * 2 - 16 * 2 - SLOT_GAP * (n - 1)) / n;
}

export function getWeatherIconName(condition?: string) {
  if (!condition) return 'partly-sunny';
  return WEATHER_ICON[condition] ?? 'partly-sunny';
}

/**
 * 코디 주요 컬러를 보고 잘 어울리는 배경색 선택.
 * 어두운 톤이 절반 이상이면 카멜, 아니면 세이지그린.
 */
export function pickBackgroundFromOutfit(
  top: (Clothing & { signedUrl: string }) | null,
  bottom: (Clothing & { signedUrl: string }) | null,
  jacket: (Clothing & { signedUrl: string }) | null,
): string {
  const colors = [top, bottom, jacket]
    .filter(Boolean)
    .map((i) => i!.primary_color)
    .filter(Boolean) as string[];
  if (colors.length === 0) return '#A88B6A';

  const darkCount = colors.filter((c) => {
    const rgb = parseInt(c.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 100;
  }).length;

  return darkCount >= colors.length / 2 ? '#A88B6A' : '#8A9A7B';
}
