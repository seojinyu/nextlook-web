import type { Clothing } from '../../lib/types';
import { CAT_LABEL, SEASON_FILTERS, SEASON_LABEL } from './constants';

type Item = Clothing & { signedUrl: string };
type SortKey = 'recent' | 'color' | 'category';

export function filterAndSortItems(
  items: Item[],
  opts: { seasonFilter: string; searchQuery: string; sortBy: SortKey },
) {
  const { seasonFilter, searchQuery, sortBy } = opts;

  return items
    .filter((item) => {
      if (seasonFilter !== 'all') {
        const tags = item.season_tags ?? [];
        if (seasonFilter === 'spring_fall') {
          if (!(tags.includes('spring_fall') || tags.includes('spring') || tags.includes('fall'))) {
            return false;
          }
        } else if (!tags.includes(seasonFilter)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const haystack = [
          ...(item.color_tags ?? []),
          CAT_LABEL[item.category] ?? item.category,
          item.description ?? '',
          ...(item.season_tags ?? []).map((s) => SEASON_LABEL[s] ?? ''),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'color') {
        return (a.primary_color ?? '').localeCompare(b.primary_color ?? '');
      }
      const order: Record<string, number> = { top: 0, bottom: 1, jacket: 2 };
      return (order[a.category] ?? 99) - (order[b.category] ?? 99);
    });
}

export function computeSeasonCounts(items: Item[]) {
  const map: Record<string, number> = { all: items.length };
  for (const f of SEASON_FILTERS) {
    if (f.key === 'all') continue;
    map[f.key] = items.filter((i) => {
      const tags = i.season_tags ?? [];
      if (f.key === 'spring_fall') {
        return tags.includes('spring_fall') || tags.includes('spring') || tags.includes('fall');
      }
      return tags.includes(f.key);
    }).length;
  }
  return map;
}

export function nextSortKey(current: SortKey): SortKey {
  const order: SortKey[] = ['recent', 'category', 'color'];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}
