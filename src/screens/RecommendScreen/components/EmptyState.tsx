import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import { getWeatherSeason } from '../../../lib/recommend/weatherFit';
import type { Clothing, WeatherSnapshot } from '../../../lib/types';

interface Props {
  clothes: Clothing[] | null;
  weather?: WeatherSnapshot | null;
}

const SEASON_LABEL: Record<string, string> = {
  summer: '여름',
  spring_fall: '봄/가을',
  winter: '겨울',
};

/** 옷장 상태 + 오늘 계절에 맞춰 다른 empty 문구를 보여준다 */
export default function EmptyState({ clothes, weather }: Props) {
  const totalClothes = clothes?.length ?? 0;
  const topsCount = clothes?.filter((c) => c.category === 'top').length ?? 0;
  const bottomsCount = clothes?.filter((c) => c.category === 'bottom').length ?? 0;

  let title = '추천할 조합이 없어요';
  let desc = '옷장에 상의와 하의를 추가하면\n맞춤 조합을 추천해 드릴게요.';

  if (totalClothes === 0) {
    title = '옷장이 비어있어요';
    desc = '옷장 탭에서 옷을 등록해 주세요.';
  } else if (topsCount === 0 && bottomsCount === 0) {
    title = '상의와 하의가 필요해요';
    desc = `현재 옷장: ${totalClothes}개\n상의와 하의를 각 1개 이상 등록해 주세요.`;
  } else if (topsCount === 0) {
    title = '상의가 없어요';
    desc = `하의 ${bottomsCount}개 있음\n상의를 1개 이상 등록해 주세요.`;
  } else if (bottomsCount === 0) {
    title = '하의가 없어요';
    desc = `상의 ${topsCount}개 있음\n하의를 1개 이상 등록해 주세요.`;
  } else if (weather) {
    // 상의·하의 다 있는데도 추천 불가 = 계절 안 맞음
    const season = getWeatherSeason(weather);
    const label = SEASON_LABEL[season] ?? '오늘 날씨';
    const seasonTops = clothes?.filter((c) => c.category === 'top' && matchesSeason(c, season)).length ?? 0;
    const seasonBottoms = clothes?.filter((c) => c.category === 'bottom' && matchesSeason(c, season)).length ?? 0;
    const avg = Math.round((weather.temp_min_c + weather.temp_max_c) / 2);
    title = `${label} 옷이 부족해요`;
    desc = `오늘은 평균 ${avg}°C (${label})\n` +
           `${label} 상의 ${seasonTops}개 · 하의 ${seasonBottoms}개\n` +
           `옷장에 ${label} 옷을 추가해 주세요.`;
  }

  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Ionicons name="shirt-outline" size={40} color="#C0BDB8" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{desc}</Text>
    </View>
  );
}

function matchesSeason(c: Clothing, season: string): boolean {
  const tags = c.season_tags ?? [];
  if (tags.length === 0) return true; // 미태그는 카운트에 포함
  if (season === 'spring_fall') {
    return tags.includes('spring_fall') || tags.includes('spring') || tags.includes('fall');
  }
  return tags.includes(season);
}
