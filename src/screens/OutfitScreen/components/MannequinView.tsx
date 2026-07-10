import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mannequinStyles } from '../styles';
import type { Item } from '../types';

interface Props {
  topItem: Item | null;
  bottomItem: Item | null;
  jacketItem: Item | null;
}

/** 마네킹 미리보기 — 비율 유지 (resizeMode: 'contain') */
export default function MannequinView({ topItem, bottomItem, jacketItem }: Props) {
  const TOP_W = 150, TOP_H = 150;
  const BOTTOM_W = 140, BOTTOM_H = 190;
  const JACKET_W = 130, JACKET_H = 130;

  return (
    <View style={mannequinStyles.root}>
      <View style={mannequinStyles.bg}>
        <View style={mannequinStyles.topRow}>
          {topItem ? (
            <Image
              source={{ uri: topItem.signedUrl }}
              style={[mannequinStyles.top, { width: TOP_W, height: TOP_H }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[mannequinStyles.top, mannequinStyles.empty, { width: TOP_W, height: TOP_H }]}>
              <Ionicons name="shirt-outline" size={32} color="#D5D0CB" />
            </View>
          )}
          {jacketItem && (
            <Image
              source={{ uri: jacketItem.signedUrl }}
              style={[mannequinStyles.jacket, { width: JACKET_W, height: JACKET_H }]}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={mannequinStyles.bottomRow}>
          {bottomItem ? (
            <Image
              source={{ uri: bottomItem.signedUrl }}
              style={[mannequinStyles.bottom, { width: BOTTOM_W, height: BOTTOM_H }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[mannequinStyles.bottom, mannequinStyles.empty, { width: BOTTOM_W, height: BOTTOM_H }]}>
              <Ionicons name="image-outline" size={28} color="#D5D0CB" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
