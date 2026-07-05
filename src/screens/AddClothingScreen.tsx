import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { supabase, uploadClothingImage, invokeEdge } from '../lib/supabase';
import { fetchCurrentWeather } from '../lib/weather';
import { removeBackgroundWeb } from '../lib/bgRemove';
import { Platform } from 'react-native';
import CropModal from '../components/CropModal';
import type { ClothingCategory } from '../lib/types';

const COLORS = [
  { name: '블랙', hex: '#000000' },
  { name: '화이트', hex: '#FFFFFF' },
  { name: '그레이', hex: '#888888' },
  { name: '라이트그레이', hex: '#CCCCCC' },
  { name: '다크그레이', hex: '#444444' },
  { name: '네이비', hex: '#1B2A4A' },
  { name: '블루', hex: '#2962FF' },
  { name: '라이트블루', hex: '#82B1FF' },
  { name: '레드', hex: '#D32F2F' },
  { name: '와인', hex: '#722F37' },
  { name: '핑크', hex: '#F48FB1' },
  { name: '베이지', hex: '#D7C9AA' },
  { name: '크림', hex: '#FFFDD0' },
  { name: '브라운', hex: '#5D4037' },
  { name: '카키', hex: '#6B7B3A' },
  { name: '그린', hex: '#2E7D32' },
  { name: '민트', hex: '#98FF98' },
  { name: '옐로우', hex: '#FDD835' },
  { name: '오렌지', hex: '#EF6C00' },
  { name: '퍼플', hex: '#7B1FA2' },
];

const BOTTEGA = '#1B6B4A';
const AMBER = '#C49A3C';

const CAT_LABEL: Record<string, string> = { top: '상의', bottom: '하의', jacket: '자켓' };
const SEASON_LABEL: Record<string, string> = { spring_fall: '봄/가을', summer: '여름', winter: '겨울' };

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 20;
const COLOR_COLUMNS = 5;
const COLOR_GAP = 8;
const COLOR_BTN_W = (SCREEN_W - H_PAD * 2 - COLOR_GAP * (COLOR_COLUMNS - 1)) / COLOR_COLUMNS;
const PREVIEW_SIZE = SCREEN_W - H_PAD * 2;
const LIGHT_COLORS = ['#FFFFFF', '#FDD835', '#FFFDD0', '#98FF98', '#CCCCCC'];

function deriveTempRange(temp: number): { min: number; max: number } {
  return { min: temp - 5, max: temp + 5 };
}

/** 카테고리+계절 → 다중 계절 태그 자동 결정 */
function deriveSeasonTags(category: string, season: string): string[] {
  // 반팔/반바지 (여름) → 여름 only
  if (season === 'summer') return ['summer'];
  // 자켓 → 봄/가을 + 겨울
  if (category === 'jacket') return ['spring_fall', 'winter'];
  // 긴팔 등 나머지 (봄/가을 or 겨울) → 봄/가을 + 겨울
  return ['spring_fall', 'winter'];
}

export default function AddClothingScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [processedPath, setProcessedPath] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [step, setStep] = useState(0);

  const [detectedColor, setDetectedColor] = useState<typeof COLORS[0] | null>(null);
  const [selectedColor, setSelectedColor] = useState<typeof COLORS[0] | null>(null);
  const [detectedCategory, setDetectedCategory] = useState<ClothingCategory>('top');
  const [detectedSeason, setDetectedSeason] = useState<string>('spring_fall');
  const [weatherData, setWeatherData] = useState<{ temp_c: number; condition: string } | null>(null);
  const [imageHash, setImageHash] = useState<string>('');
  const [derivedSeasonTags, setDerivedSeasonTags] = useState<string[]>(['spring_fall']);

  const [cropUri, setCropUri] = useState<string | null>(null);

  const startPipeline = (uri: string) => {
    if (Platform.OS === 'web') {
      // 웹에선 crop 모달 먼저 보여주기
      setCropUri(uri);
    } else {
      // 모바일에선 expo-image-picker의 allowsEditing이 자체 crop UI 제공
      processImage(uri);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('권한 필요', '카메라 권한을 허용해 주세요.'); return; }
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: Platform.OS !== 'web', // 모바일 native: 기본 crop UI 사용
    });
    if (!result.canceled && result.assets?.[0]?.uri) startPipeline(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: Platform.OS !== 'web', // 모바일 native: 기본 crop UI 사용
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        startPipeline(result.assets[0].uri);
      }
    } catch (e: any) {
      console.error('[pickFromLibrary] error:', e);
      Alert.alert('사진 선택 실패', e?.message ?? String(e));
    }
  };

  const handleCropComplete = (croppedUri: string) => {
    setCropUri(null);
    processImage(croppedUri);
  };

  const handleCropCancel = () => {
    setCropUri(null);
  };

  const processImage = async (uri: string) => {
    setAnalyzing(true);
    setStep(1);
    setDetectedColor(null); setSelectedColor(null); setDetectedCategory('top');
    setProcessedPath(null);
    setDetectedSeason('spring_fall'); setDerivedSeasonTags(['spring_fall']); setWeatherData(null); setImageHash('');
    try {
      setStatus('이미지 처리 중...');
      const resized = await ImageManipulator.manipulateAsync(
        uri, [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setLocalUri(resized.uri);

      // 이미지 해시 계산 (중복 검사용)
      const imgRes = await fetch(resized.uri);
      const imgBuf = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(imgBuf);
      let hash = 5381;
      const hashStep = Math.max(1, Math.floor(bytes.length / 2000));
      for (let i = 0; i < bytes.length; i += hashStep) {
        hash = ((hash << 5) + hash + bytes[i]) >>> 0;
      }
      const hashStr = `img_${hash.toString(36)}`;
      setImageHash(hashStr);

      // 중복 이미지 확인
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('로그인이 필요합니다.');

      const { data: dupes } = await supabase
        .from('clothes')
        .select('id')
        .eq('user_id', userData.user.id)
        .contains('style_tags', [hashStr]);
      if (dupes && dupes.length > 0) {
        Alert.alert('중복 등록', '이미 등록된 옷 사진입니다.');
        reset();
        return;
      }

      setStatus('업로드 중...');
      const path = await uploadClothingImage(userData.user.id, resized.uri, 'image/jpeg');
      setUploadedPath(path);

      // 웹에서 배경 제거 (백그라운드, 실패해도 진행)
      if (Platform.OS === 'web') {
        setStatus('배경 제거 중...');
        try {
          const bgRemovedUrl = await removeBackgroundWeb(resized.uri);
          if (bgRemovedUrl) {
            setStatus('배경 제거 완료, 저장 중...');
            const processedPath = await uploadClothingImage(userData.user.id, bgRemovedUrl, 'image/png');
            setProcessedPath(processedPath);
            URL.revokeObjectURL(bgRemovedUrl);
            console.log('[AddClothing] 배경 제거 및 업로드 성공:', processedPath);
          } else {
            console.warn('[AddClothing] 배경 제거 결과 없음, 원본만 사용');
          }
        } catch (e) {
          console.warn('[AddClothing] 배경 제거 실패, 원본만 저장:', e);
        }
      }

      setStatus('AI 분석 중...');
      const locPerm = await Location.requestForegroundPermissionsAsync();
      if (!locPerm.granted) throw new Error('위치 권한이 필요합니다.');
      const loc = await Location.getCurrentPositionAsync({});

      const [analyzeResult, weather] = await Promise.all([
        invokeEdge<{ name: string; hex: string; category?: string; season?: string; sleeve_length?: string }>('extract-color', { path }),
        fetchCurrentWeather(loc.coords.latitude, loc.coords.longitude),
      ]);

      const matched = COLORS.find((c) => c.hex === analyzeResult.hex) ?? { name: analyzeResult.name, hex: analyzeResult.hex };
      setDetectedColor(matched);
      setSelectedColor(matched);

      const cat = analyzeResult.category as ClothingCategory | undefined;
      if (cat === 'top' || cat === 'bottom' || cat === 'jacket') {
        setDetectedCategory(cat);
      }

      let szn = analyzeResult.season;
      // 클라이언트 안전장치: 반팔/민소매 상의 → 무조건 여름
      if ((cat === 'top' || cat === 'jacket') && (analyzeResult.sleeve_length === 'short' || analyzeResult.sleeve_length === 'sleeveless')) {
        szn = 'summer';
      }
      if (szn === 'summer' || szn === 'winter' || szn === 'spring_fall') {
        setDetectedSeason(szn);
      }

      // Auto-derive multi-season tags based on category + season
      const finalCat = (cat === 'top' || cat === 'bottom' || cat === 'jacket') ? cat : detectedCategory;
      const finalSzn = (szn === 'summer' || szn === 'winter' || szn === 'spring_fall') ? szn : detectedSeason;
      setDerivedSeasonTags(deriveSeasonTags(finalCat, finalSzn));

      setWeatherData(weather);
      setStep(2);
    } catch (e: any) {
      Alert.alert('분석 실패', e.message ?? String(e));
      reset();
    } finally {
      setAnalyzing(false);
      setStatus('');
    }
  };

  const save = async () => {
    if (!uploadedPath || !selectedColor || !weatherData) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('로그인이 필요합니다.');

      const tempRange = deriveTempRange(weatherData.temp_c);
      const catLabel = CAT_LABEL[detectedCategory] ?? '상의';
      const insertData: any = {
        user_id: userData.user.id, image_path: uploadedPath, category: detectedCategory,
        primary_color: selectedColor.hex, color_tags: [selectedColor.name],
        style_tags: imageHash ? [imageHash] : [], season_tags: derivedSeasonTags,
        min_temp_c: tempRange.min, max_temp_c: tempRange.max,
        description: `${selectedColor.name} ${catLabel}`,
      };
      // processed_image_path 컬럼이 있을 때만 추가 (마이그레이션 안 된 경우 보호)
      if (processedPath) insertData.processed_image_path = processedPath;

      let { error } = await supabase.from('clothes').insert(insertData);
      // 컬럼 누락 에러 (마이그레이션 안 됨) → 해당 필드 빼고 재시도
      if (error && /processed_image_path/.test(error.message || '')) {
        console.warn('processed_image_path 컬럼 없음, 원본만 저장');
        delete insertData.processed_image_path;
        const retry = await supabase.from('clothes').insert(insertData);
        error = retry.error;
      }
      if (error) throw error;
      nav.goBack();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setLocalUri(null); setUploadedPath(null); setProcessedPath(null);
    setDetectedColor(null); setSelectedColor(null); setDetectedCategory('top');
    setDetectedSeason('spring_fall'); setDerivedSeasonTags(['spring_fall']); setWeatherData(null); setImageHash(''); setStep(0);
  };

  // Step 0
  if (step === 0) {
    return (
      <View style={styles.root}>
        <CropModal
          visible={!!cropUri}
          imageUri={cropUri}
          onCancel={handleCropCancel}
          onComplete={handleCropComplete}
        />
        <View style={styles.pickArea}>
          <LinearGradient
            colors={['#1A1A1A', '#2D2D2D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pickIconCircle}
          >
            <Ionicons name="camera" size={32} color={BOTTEGA} />
          </LinearGradient>
          <Text style={styles.pickTitle}>옷 사진을 올려주세요</Text>
          <Text style={styles.pickDesc}>색상, 카테고리, 계절이 AI로 자동 분석됩니다.{'\n'}색상이 다르면 직접 수정할 수 있어요.</Text>
          <View style={{ width: '100%' }}>
            <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto} activeOpacity={0.85}>
              <LinearGradient colors={['#1A1A1A', '#2D2D2D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                <Ionicons name="camera-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>  카메라로 촬영</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromLibrary} activeOpacity={0.7}>
              <Ionicons name="images-outline" size={18} color="#1A1A1A" />
              <Text style={styles.secondaryBtnText}>  갤러리에서 선택</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const StepDots = ({ current }: { current: number }) => (
    <View style={styles.stepDots}>
      {[0, 1, 2].map((s) => (
        <View key={s} style={[styles.stepDot, s === current && styles.stepDotActive, s < current && styles.stepDotDone]} />
      ))}
    </View>
  );

  // Step 1
  if (step === 1) {
    return (
      <View style={styles.root}>
        <StepDots current={1} />
        <View style={styles.analyzeArea}>
          {localUri && <Image source={{ uri: localUri }} style={styles.analyzeImage} />}
          <View style={styles.analyzeBadge}>
            <ActivityIndicator color={BOTTEGA} size="small" />
            <Text style={styles.analyzeText}>{status}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Step 2
  return (
    <View style={styles.root}>
      <StepDots current={2} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: H_PAD, paddingBottom: 16 }}>
        {localUri && (
          <Image source={{ uri: localUri }} style={[styles.confirmImage, { width: PREVIEW_SIZE, height: PREVIEW_SIZE * 0.75 }]} />
        )}

        {/* AI 분석 결과 */}
        <View style={styles.detectedBox}>
          <View style={styles.detectedHeader}>
            <Ionicons name="sparkles" size={14} color={BOTTEGA} />
            <Text style={styles.detectedHeaderText}>AI 분석 결과</Text>
          </View>
          <View style={styles.detectedTags}>
            {detectedColor && (
              <View style={styles.colorInfoRow}>
                <View style={[styles.detectedSwatch, { backgroundColor: detectedColor.hex }]} />
                <Text style={styles.detectedName}>{detectedColor.name}</Text>
              </View>
            )}
            {selectedColor && selectedColor.hex !== detectedColor?.hex && (
              <View style={styles.editedBadge}><Text style={styles.editedBadgeText}>색상 수정됨</Text></View>
            )}
          </View>
        </View>

        {/* 계절 선택 */}
        <Text style={styles.sectionTitle}>계절</Text>
        <View style={styles.catRow}>
          {(['spring_fall', 'summer', 'winter'] as const).map((szn) => {
            const active = detectedSeason === szn;
            const icons: Record<string, string> = { spring_fall: 'leaf-outline', summer: 'sunny-outline', winter: 'snow-outline' };
            return (
              <TouchableOpacity
                key={szn}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => { setDetectedSeason(szn); setDerivedSeasonTags(deriveSeasonTags(detectedCategory, szn)); }}
                activeOpacity={0.7}
              >
                <Ionicons name={icons[szn] as any} size={15} color={active ? '#fff' : '#7A7570'} style={{ marginRight: 6 }} />
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                  {SEASON_LABEL[szn]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 카테고리 선택 */}
        <Text style={styles.sectionTitle}>카테고리</Text>
        <View style={styles.catRow}>
          {(['top', 'bottom', 'jacket'] as const).map((cat) => {
            const active = detectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => setDetectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                  {CAT_LABEL[cat]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>색상이 다르면 선택해 주세요</Text>
        <View style={styles.colorGrid}>
          {COLORS.map((c) => {
            const sel = selectedColor?.hex === c.hex;
            return (
              <TouchableOpacity
                key={c.hex}
                style={[styles.colorBtn, { width: COLOR_BTN_W }, sel && styles.colorBtnActive]}
                onPress={() => setSelectedColor(c)}
                activeOpacity={0.7}
              >
                <View style={[styles.colorSwatch, { backgroundColor: c.hex }]}>
                  {sel && <Ionicons name="checkmark" size={14} color={LIGHT_COLORS.includes(c.hex) ? '#000' : '#fff'} />}
                </View>
                <Text style={[styles.colorLabel, sel && styles.colorLabelActive]} numberOfLines={1}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 하단 고정 버튼 영역 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.saveBtnWrap} onPress={save} disabled={saving} activeOpacity={0.85}>
          <LinearGradient colors={['#1A1A1A', '#2D2D2D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>  옷장에 저장</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={reset} activeOpacity={0.7}>
          <Ionicons name="refresh" size={16} color="#1A1A1A" />
          <Text style={styles.secondaryBtnText}>  다시 찍기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8' },

  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0DDD8' },
  stepDotActive: { width: 24, backgroundColor: BOTTEGA },
  stepDotDone: { backgroundColor: '#C0BDB8' },

  pickArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: H_PAD },
  pickIconCircle: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  pickTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  pickDesc: { fontSize: 13, color: '#7A7570', textAlign: 'center', marginTop: 6, lineHeight: 20, marginBottom: 28 },

  primaryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  btnGradient: {
    flexDirection: 'row', paddingVertical: 15, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', backgroundColor: '#F5F4F2', paddingVertical: 15,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  secondaryBtnText: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },

  analyzeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: H_PAD },
  analyzeImage: { width: 200, height: 200, borderRadius: 20, backgroundColor: '#F5F4F2' },
  analyzeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  analyzeText: { color: '#7A7570', fontSize: 14, fontWeight: '500' },

  confirmImage: { borderRadius: 18, backgroundColor: '#F5F4F2', marginBottom: 16 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },

  detectedBox: {
    backgroundColor: '#fff', padding: 14, borderRadius: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  detectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  detectedHeaderText: { fontSize: 13, fontWeight: '700', color: BOTTEGA },
  detectedTags: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catBadge: { backgroundColor: '#1A1A1A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  catBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  seasonBadge: { backgroundColor: '#F0E8D6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  seasonBadgeText: { color: AMBER, fontSize: 12, fontWeight: '700' },
  colorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detectedSwatch: { width: 18, height: 18, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  detectedName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  editedBadge: { backgroundColor: BOTTEGA, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 'auto' },
  editedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  catRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  catChip: {
    flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, backgroundColor: '#F5F4F2',
    alignItems: 'center', justifyContent: 'center',
  },
  catChipActive: { backgroundColor: '#1A1A1A' },
  catChipText: { fontSize: 14, fontWeight: '700', color: '#7A7570' },
  catChipTextActive: { color: '#fff' },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: COLOR_GAP, marginBottom: 20 },
  colorBtn: { alignItems: 'center', paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent' },
  colorBtnActive: { borderColor: '#1A1A1A', backgroundColor: '#F0EDEA' },
  colorSwatch: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  colorLabel: { fontSize: 9, color: '#7A7570', marginTop: 3 },
  colorLabelActive: { color: '#1A1A1A', fontWeight: '600' },

  bottomBar: {
    paddingHorizontal: H_PAD, paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 0.5, borderTopColor: '#EDEAE6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 8,
  },
  saveBtnWrap: { borderRadius: 14, overflow: 'hidden' },
});
