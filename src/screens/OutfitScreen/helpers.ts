import type { OutfitEntry, Item } from './types';
import { WEATHER_ICON } from './constants';

export function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  const weekday = ['일', '월', '화', '수', '목', '금', '토'];
  const dt = new Date(d);
  return `${y}.${m}.${day} (${weekday[dt.getDay()]})`;
}

export function getWeatherIcon(condition?: string) {
  if (!condition) return 'partly-sunny';
  return WEATHER_ICON[condition] ?? 'partly-sunny';
}

/** 연도-월별 착용 횟수 (최근순 정렬) */
export function computePeriods(entries: OutfitEntry[]): [string, number][] {
  if (entries.length === 0) return [];
  const periodSet = new Map<string, number>();
  entries.forEach((e) => {
    const ym = e.log.worn_on.slice(0, 7);
    periodSet.set(ym, (periodSet.get(ym) ?? 0) + 1);
  });
  return [...periodSet.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** 자주 입는 옷 TOP 3 (최소 2회 이상 착용시에만 반환) */
export function computeTop3Items(entries: OutfitEntry[]): { item: Item; count: number }[] {
  if (entries.length < 3) return [];
  const counts = new Map<string, { item: Item; count: number }>();
  entries.forEach((e) =>
    e.items.forEach((it) => {
      const cur = counts.get(it.id);
      if (cur) cur.count += 1;
      else counts.set(it.id, { item: it, count: 1 });
    }),
  );
  const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  return top.length > 0 && top[0].count >= 2 ? top : [];
}

/** 필터된 항목 */
export function filterByPeriod(entries: OutfitEntry[], periodFilter: string) {
  if (periodFilter === 'all') return entries;
  return entries.filter((e) => e.log.worn_on.startsWith(periodFilter));
}
