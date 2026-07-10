import { View, Text, Image, ActivityIndicator } from 'react-native';
import { BOTTEGA } from '../constants';
import { styles } from '../styles';

interface Props {
  localUri: string | null;
  status: string;
}

export default function AnalyzeStep({ localUri, status }: Props) {
  return (
    <View style={styles.analyzeArea}>
      {localUri && <Image source={{ uri: localUri }} style={styles.analyzeImage} />}
      <View style={styles.analyzeBadge}>
        <ActivityIndicator color={BOTTEGA} size="small" />
        <Text style={styles.analyzeText}>{status}</Text>
      </View>
    </View>
  );
}
