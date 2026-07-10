/**
 * AddClothingScreen - 얇은 조정자
 * step 0 (선택) → step 1 (분석) → step 2 (확인+저장)
 */
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import CropModal from '../../components/CropModal';
import { styles } from './styles';
import { useAddClothingFlow } from './useAddClothingFlow';

import StepDots from './components/StepDots';
import PickStep from './components/PickStep';
import AnalyzeStep from './components/AnalyzeStep';
import ConfirmStep from './components/ConfirmStep';

export default function AddClothingScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const flow = useAddClothingFlow(() => nav.goBack());

  // ─── Step 0: 사진 선택 ───
  if (flow.step === 0) {
    return (
      <View style={styles.root}>
        <CropModal
          visible={!!flow.cropUri}
          imageUri={flow.cropUri}
          onCancel={() => flow.setCropUri(null)}
          onComplete={(cropped) => {
            flow.setCropUri(null);
            flow.processImage(cropped);
          }}
        />
        <PickStep onTakePhoto={flow.takePhoto} onPickFromLibrary={flow.pickFromLibrary} />
      </View>
    );
  }

  // ─── Step 1: AI 분석 중 ───
  if (flow.step === 1) {
    return (
      <View style={styles.root}>
        <StepDots current={1} />
        <AnalyzeStep localUri={flow.localUri} status={flow.status} />
      </View>
    );
  }

  // ─── Step 2: 확인 및 저장 ───
  return (
    <View style={styles.root}>
      <StepDots current={2} />
      <ConfirmStep
        insetsBottom={insets.bottom}
        localUri={flow.localUri}
        detectedColor={flow.detectedColor}
        selectedColor={flow.selectedColor}
        onChangeColor={flow.setSelectedColor}
        detectedCategory={flow.detectedCategory}
        onChangeCategory={flow.setDetectedCategory}
        seasonTags={flow.derivedSeasonTags}
        onChangeSeasonTags={flow.setDerivedSeasonTags}
        saving={flow.saving}
        onSave={flow.save}
        onReset={flow.reset}
      />
    </View>
  );
}
