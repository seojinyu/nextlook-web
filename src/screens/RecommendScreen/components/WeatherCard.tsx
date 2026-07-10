import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONDITION_KR } from '../constants';
import { getWeatherIconName } from '../helpers';
import { styles } from '../styles';
import type { WeatherSnapshot } from '../../../lib/types';

interface Props {
  weather: WeatherSnapshot;
}

export default function WeatherCard({ weather }: Props) {
  const iconName = getWeatherIconName(weather.condition);
  return (
    <View style={styles.weatherCard}>
      <View style={styles.weatherLeft}>
        <View style={styles.weatherIconCircle}>
          <Ionicons name={iconName as any} size={22} color="#fff" />
        </View>
        <Text style={styles.weatherCondition}>
          {CONDITION_KR[weather.condition] ?? weather.condition}
        </Text>
      </View>
      <View style={styles.weatherRight}>
        <Text style={styles.weatherTempBig}>
          {weather.temp_min_c}° / {weather.temp_max_c}°
        </Text>
        <Text style={styles.weatherDetail}>
          강수 {weather.precipitation_mm}mm  ·  바람 {weather.wind_mps}m/s
        </Text>
      </View>
    </View>
  );
}
