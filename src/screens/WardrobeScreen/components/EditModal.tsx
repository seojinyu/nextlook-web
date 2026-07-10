import { useState, useEffect } from 'react';
import {
  Modal, View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS, CAT_LABEL, COLOR_BTN_W, LIGHT_COLORS, MODAL_PAD, SCREEN_W,
} from '../constants';
import { styles } from '../styles';
import type { Clothing } from '../../../lib/types';

type Item = Clothing & { signedUrl: string };
type ColorEntry = { name: string; hex: string };

interface Props {
  item: Item | null;
  insetsBottom: number;
  onClose: () => void;
  onSave: (
    id: string,
    payload: { primary_color: string; color_name: string; category: string; season_tags: string[] },
  ) => Promise<void>;
}

export default function EditModal({ item, insetsBottom, onClose, onSave }: Props) {
  const [color, setColor] = useState<ColorEntry | null>(null);
  const [category, setCategory] = useState<string>('top');
  const [seasonTags, setSeasonTags] = useState<string[]>(['spring_fall']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    const current = COLORS.find((c) => c.hex === item.primary_color) ?? COLORS[0];
    setColor(current);
    setCategory(item.category);
    setSeasonTags(item.season_tags?.length ? [...item.season_tags] : ['spring_fall']);
  }, [item]);

  const toggleSeason = (szn: 'spring_fall' | 'summer' | 'winter') => {
    setSeasonTags((prev) => {
      if (prev.includes(szn)) {
        const next = prev.filter((s) => s !== szn);
        return next.length > 0 ? next : [szn];
      }
      return [...prev, szn];
    });
  };

  const handleSave = async () => {
    if (!item || !color) return;
    setSaving(true);
    try {
      await onSave(item.id, {
        primary_color: color.hex,
        color_name: color.name,
        category,
        season_tags: seasonTags,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('수정 실패', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const seasonIcons: Record<string, string> = {
    spring_fall: 'leaf-outline',
    summer: 'sunny-outline',
    winter: 'snow-outline',
  };
  const seasonLabels: Record<string, string> = {
    spring_fall: '봄/가을',
    summer: '여름',
    winter: '겨울',
  };

  return (
    <Modal visible={!!item} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { paddingBottom: insetsBottom + 20 }]}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>옷 정보 수정</Text>

            {item && (
              <Image
                source={{ uri: item.signedUrl }}
                style={[
                  styles.modalImage,
                  { width: SCREEN_W - MODAL_PAD * 2, height: (SCREEN_W - MODAL_PAD * 2) * 0.7 },
                ]}
              />
            )}

            <Text style={styles.modalSectionTitle}>계절 (복수 선택 가능)</Text>
            <View style={styles.catRow}>
              {(['spring_fall', 'summer', 'winter'] as const).map((szn) => {
                const active = seasonTags.includes(szn);
                return (
                  <TouchableOpacity
                    key={szn}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => toggleSeason(szn)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={seasonIcons[szn] as any}
                      size={15}
                      color={active ? '#fff' : '#7A7570'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {seasonLabels[szn]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalSectionTitle}>카테고리</Text>
            <View style={styles.catRow}>
              {(['top', 'bottom', 'jacket'] as const).map((cat) => {
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {CAT_LABEL[cat]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalSectionTitle}>색상</Text>
            {color && (
              <View style={styles.currentColorRow}>
                <View style={[styles.currentSwatch, { backgroundColor: color.hex }]} />
                <Text style={styles.currentColorText}>{color.name}</Text>
              </View>
            )}

            <View style={styles.colorGrid}>
              {COLORS.map((c) => {
                const sel = color?.hex === c.hex;
                return (
                  <TouchableOpacity
                    key={c.hex}
                    style={[styles.colorBtn, { width: COLOR_BTN_W }, sel && styles.colorBtnActive]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.colorSwatch, { backgroundColor: c.hex }]}>
                      {sel && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={LIGHT_COLORS.includes(c.hex) ? '#000' : '#fff'}
                        />
                      )}
                    </View>
                    <Text
                      style={[styles.colorBtnLabel, sel && styles.colorBtnLabelActive]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalSave}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSaveText}>저장</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
