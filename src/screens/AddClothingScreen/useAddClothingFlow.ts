/**
 * 옷 등록 파이프라인 훅.
 * step 0 (선택) → step 1 (처리+분석) → step 2 (확인+저장)
 *
 * step 1 파이프라인:
 *   1. 이미지 리사이즈
 *   2. 중복 이미지 확인
 *   3. 원본 업로드
 *   4. (웹 전용) AI 배경 제거 + 업로드
 *   5. AI 분석 (색상/카테고리/계절) + 날씨 병렬
 */
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { supabase, uploadClothingImage, invokeEdge } from '../../lib/supabase';
import { fetchCurrentWeather } from '../../lib/weather';
import { removeBackgroundWeb } from '../../lib/bgRemove';
import type { ClothingCategory } from '../../lib/types';
import { CAT_LABEL, type ColorEntry } from './constants';
import { computeImageHash, deriveSeasonTags, deriveTempRange } from './helpers';
import { findClosestColor, normalizeCategory, normalizeSeason } from './aiMapping';

export function useAddClothingFlow(onSaved: () => void) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [processedPath, setProcessedPath] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string>('');

  const [detectedColor, setDetectedColor] = useState<ColorEntry | null>(null);
  const [selectedColor, setSelectedColor] = useState<ColorEntry | null>(null);
  const [detectedCategory, setDetectedCategory] = useState<ClothingCategory>('top');
  const [derivedSeasonTags, setDerivedSeasonTags] = useState<string[]>(['spring_fall']);
  const [weatherData, setWeatherData] = useState<{ temp_c: number; condition: string } | null>(null);

  // Crop modal (웹 전용)
  const [cropUri, setCropUri] = useState<string | null>(null);

  const reset = () => {
    setLocalUri(null);
    setUploadedPath(null);
    setProcessedPath(null);
    setDetectedColor(null);
    setSelectedColor(null);
    setDetectedCategory('top');
    setDerivedSeasonTags(['spring_fall']);
    setWeatherData(null);
    setImageHash('');
    setStep(0);
  };

  const startPipeline = (uri: string) => {
    if (Platform.OS === 'web') setCropUri(uri);
    else processImage(uri);
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '카메라 권한을 허용해 주세요.');
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: Platform.OS !== 'web',
    });
    if (!result.canceled && result.assets?.[0]?.uri) startPipeline(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: Platform.OS !== 'web',
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        startPipeline(result.assets[0].uri);
      }
    } catch (e: any) {
      console.error('[pickFromLibrary] error:', e);
      Alert.alert('사진 선택 실패', e?.message ?? String(e));
    }
  };

  const processImage = async (uri: string) => {
    setAnalyzing(true);
    setStep(1);
    setDetectedColor(null);
    setSelectedColor(null);
    setDetectedCategory('top');
    setProcessedPath(null);
    setDerivedSeasonTags(['spring_fall']);
    setWeatherData(null);
    setImageHash('');
    try {
      setStatus('이미지 처리 중...');
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      setLocalUri(resized.uri);

      const hashStr = await computeImageHash(resized.uri);
      setImageHash(hashStr);

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

      // 웹 데스크탑 전용: 배경 제거 (모바일은 removeBackgroundWeb 내부에서 스킵됨)
      if (Platform.OS === 'web') {
        const isMobile = typeof navigator !== 'undefined' &&
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
        if (!isMobile) {
          setStatus('AI 필터링 중...');
          try {
            const bgRemovedUrl = await removeBackgroundWeb(resized.uri);
            if (bgRemovedUrl) {
              setStatus('AI 필터링 완료, 저장 중...');
              const newPath = await uploadClothingImage(userData.user.id, bgRemovedUrl, 'image/png');
              setProcessedPath(newPath);
              URL.revokeObjectURL(bgRemovedUrl);
            }
          } catch (e) {
            console.warn('[AddClothing] AI 필터링 실패, 원본만 저장:', e);
          }
        }
      }

      setStatus('AI 분석 중...');
      const locPerm = await Location.requestForegroundPermissionsAsync();
      if (!locPerm.granted) throw new Error('위치 권한이 필요합니다.');
      const loc = await Location.getCurrentPositionAsync({});

      const [analyzeResult, weather] = await Promise.all([
        invokeEdge<{
          name: string;
          hex: string;
          category?: string;
          season?: string;
          seasons?: string[];
          sleeve_length?: string;
          is_pattern?: boolean;
        }>('extract-color', { path }),
        fetchCurrentWeather(loc.coords.latitude, loc.coords.longitude),
      ]);

      // 색상: AI가 정확한 hex 안 줘도 팔레트에서 가장 가까운 색으로 자동 매핑
      const matched = findClosestColor(analyzeResult.hex);
      console.log('[AI] 색상 매핑:', analyzeResult.hex, '→', matched.name, matched.hex);
      setDetectedColor(matched);
      setSelectedColor(matched);

      // 카테고리: AI 결과 검증. 없으면 사용자가 수동 선택 (기본값 'top' 유지)
      const cat = normalizeCategory(analyzeResult.category);
      if (cat) {
        setDetectedCategory(cat);
        console.log('[AI] 카테고리 감지:', cat);
      } else {
        console.warn('[AI] 카테고리 감지 실패, 사용자 수동 선택 필요');
      }

      // 계절 판정
      let szn = normalizeSeason(analyzeResult.season);
      const shortSleeve =
        analyzeResult.sleeve_length === 'short' || analyzeResult.sleeve_length === 'sleeveless';
      if ((cat === 'top' || cat === 'jacket') && shortSleeve) szn = 'summer';

      const finalCat = cat ?? 'top';
      const finalSzn = szn ?? 'spring_fall';

      const aiSeasons = Array.isArray(analyzeResult.seasons)
        ? analyzeResult.seasons.filter((s) => ['summer', 'winter', 'spring_fall'].includes(s))
        : [];

      let finalSeasons = aiSeasons.length > 0 ? aiSeasons : deriveSeasonTags(finalCat, finalSzn);
      if ((cat === 'top' || cat === 'jacket') && shortSleeve) finalSeasons = ['summer'];
      setDerivedSeasonTags(finalSeasons);

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
        user_id: userData.user.id,
        image_path: uploadedPath,
        category: detectedCategory,
        primary_color: selectedColor.hex,
        color_tags: [selectedColor.name],
        style_tags: imageHash ? [imageHash] : [],
        season_tags: derivedSeasonTags,
        min_temp_c: tempRange.min,
        max_temp_c: tempRange.max,
        description: `${selectedColor.name} ${catLabel}`,
      };
      if (processedPath) insertData.processed_image_path = processedPath;

      let { error } = await supabase.from('clothes').insert(insertData);
      // processed_image_path 컬럼 없는 구버전 DB 대응
      if (error && /processed_image_path/.test(error.message || '')) {
        delete insertData.processed_image_path;
        const retry = await supabase.from('clothes').insert(insertData);
        error = retry.error;
      }
      if (error) throw error;
      onSaved();
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return {
    step, status, analyzing, saving,
    localUri, uploadedPath, processedPath,
    detectedColor, selectedColor, setSelectedColor,
    detectedCategory, setDetectedCategory,
    derivedSeasonTags, setDerivedSeasonTags,
    weatherData,
    cropUri, setCropUri,
    takePhoto, pickFromLibrary,
    processImage, save, reset,
  };
}
