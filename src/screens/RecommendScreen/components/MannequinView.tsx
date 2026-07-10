import { View, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';
import type { Clothing } from '../../../lib/types';
import MagazineLayoutView from './MagazineLayoutView';

type Item = (Clothing & { signedUrl: string }) | null;

interface Props {
  topItem: Item;
  bottomItem: Item;
  jacketItem: Item;
}

/**
 * 배경 제거된 이미지가 있으면 매거진 플랫레이,
 * 아니면 기본 마네킹 뷰(배경 있는 사진용).
 */
export default function MannequinView({ topItem, bottomItem, jacketItem }: Props) {
  const isWeb = Platform.OS === 'web';
  const hasProcessed = isWeb && (
    !!topItem?.processed_image_path ||
    !!bottomItem?.processed_image_path ||
    !!jacketItem?.processed_image_path
  );

  if (hasProcessed) {
    return <MagazineLayoutView topItem={topItem} bottomItem={bottomItem} jacketItem={jacketItem} />;
  }

  const TOP_W = 150, TOP_H = 150;
  const BOTTOM_W = 140, BOTTOM_H = 190;
  const JACKET_W = 130, JACKET_H = 130;

  return (
    <View style={styles.mannequinRoot}>
      <View style={styles.mannequinBg}>
        <View style={styles.mannequinTopRow}>
          {topItem ? (
            <Image
              source={{ uri: topItem.signedUrl }}
              style={[styles.mannequinTop, { width: TOP_W, height: TOP_H }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.mannequinTop, styles.mannequinEmpty, { width: TOP_W, height: TOP_H }]}>
              <Ionicons name="shirt-outline" size={32} color="#D5D0CB" />
            </View>
          )}
          {jacketItem && (
            <Image
              source={{ uri: jacketItem.signedUrl }}
              style={[styles.jacketImage, { width: JACKET_W, height: JACKET_H }]}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={styles.mannequinBottomRow}>
          {bottomItem ? (
            <Image
              source={{ uri: bottomItem.signedUrl }}
              style={[styles.mannequinBottom, { width: BOTTOM_W, height: BOTTOM_H }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.mannequinBottom, styles.mannequinEmpty, { width: BOTTOM_W, height: BOTTOM_H }]}>
              <Ionicons name="image-outline" size={28} color="#D5D0CB" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
