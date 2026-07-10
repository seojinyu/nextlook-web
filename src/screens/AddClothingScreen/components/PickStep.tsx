import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BOTTEGA } from '../constants';
import { styles } from '../styles';

interface Props {
  onTakePhoto: () => void;
  onPickFromLibrary: () => void;
}

export default function PickStep({ onTakePhoto, onPickFromLibrary }: Props) {
  return (
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
      <Text style={styles.pickDesc}>
        색상, 카테고리, 계절이 AI로 자동 분석됩니다.{'\n'}
        색상이 다르면 직접 수정할 수 있어요.
      </Text>
      <View style={{ width: '100%' }}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onTakePhoto} activeOpacity={0.85}>
          <LinearGradient
            colors={['#1A1A1A', '#2D2D2D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>  카메라로 촬영</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onPickFromLibrary} activeOpacity={0.7}>
          <Ionicons name="images-outline" size={18} color="#1A1A1A" />
          <Text style={styles.secondaryBtnText}>  갤러리에서 선택</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
