import { View } from 'react-native';
import { styles } from '../styles';

interface Props {
  current: number;
}

export default function StepDots({ current }: Props) {
  return (
    <View style={styles.stepDots}>
      {[0, 1, 2].map((s) => (
        <View
          key={s}
          style={[
            styles.stepDot,
            s === current && styles.stepDotActive,
            s < current && styles.stepDotDone,
          ]}
        />
      ))}
    </View>
  );
}
