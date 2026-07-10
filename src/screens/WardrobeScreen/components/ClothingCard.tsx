import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CARD_W, SEASON_ICON } from '../constants';
import { styles } from '../styles';
import type { Clothing } from '../../../lib/types';

type Item = Clothing & { signedUrl: string };

interface Props {
  item: Item;
  selectMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export default function ClothingCard({ item, selectMode, selected, onPress, onLongPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_W }]}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View>
        <Image
          source={{ uri: item.signedUrl }}
          style={[styles.cardImage, { width: CARD_W, height: CARD_W }]}
        />
        <View style={styles.cardSeasonBadge}>
          {(item.season_tags ?? ['spring_fall']).map((st, idx) => (
            <View key={st} style={{ flexDirection: 'row', alignItems: 'center' }}>
              {idx > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, marginHorizontal: 1 }}>
                  ·
                </Text>
              )}
              <Ionicons
                name={(SEASON_ICON[st] ?? 'leaf-outline') as any}
                size={10}
                color="#fff"
              />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.cardInfo}>
          {item.primary_color && (
            <View style={[styles.cardDot, { backgroundColor: item.primary_color }]} />
          )}
          <Text style={styles.cardColor} numberOfLines={1}>
            {item.color_tags?.[0] ?? ''}
          </Text>
        </View>
      </View>
      {selectMode && (
        <View style={[styles.checkCircle, selected && styles.checkCircleActive]}>
          {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      )}
    </TouchableOpacity>
  );
}
