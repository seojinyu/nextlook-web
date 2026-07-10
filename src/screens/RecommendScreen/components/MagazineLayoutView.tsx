import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import type { Clothing } from '../../../lib/types';

type Item = (Clothing & { signedUrl: string }) | null;

interface Props {
  topItem: Item;
  bottomItem: Item;
  jacketItem: Item;
}

/** 매거진 화보 스타일 플랫레이 - 세로 정렬 (배경 제거된 이미지 전용) */
export default function MagazineLayoutView({ topItem, bottomItem, jacketItem }: Props) {
  return (
    <View style={styles.magazineRoot}>
      <View style={styles.magazineTopRow}>
        {topItem ? (
          <Image
            source={{ uri: topItem.signedUrl }}
            style={styles.magazineTopImg}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.magazineTopImg, styles.magazineEmpty]}>
            <Ionicons name="shirt-outline" size={40} color="#D5D0CB" />
          </View>
        )}

        {jacketItem && (
          <Image
            source={{ uri: jacketItem.signedUrl }}
            style={styles.magazineJacketImg}
            resizeMode="contain"
          />
        )}
      </View>

      {bottomItem ? (
        <Image
          source={{ uri: bottomItem.signedUrl }}
          style={styles.magazineBottomImg}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.magazineBottomImg, styles.magazineEmpty]}>
          <Ionicons name="image-outline" size={40} color="#D5D0CB" />
        </View>
      )}
    </View>
  );
}
