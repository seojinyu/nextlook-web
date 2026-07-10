import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import type { Clothing } from '../../../lib/types';

interface Props {
  clothes: Clothing[] | null;
}

/** 옷장 상태에 따라 다른 empty 문구를 보여준다 */
export default function EmptyState({ clothes }: Props) {
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
