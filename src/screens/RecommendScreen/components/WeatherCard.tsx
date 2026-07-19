import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CONDITION_KR, BOTTEGA } from '../constants';
import { getWeatherIconName } from '../helpers';
import type { WeatherSnapshot } from '../../../lib/types';

interface Props {
  weather: WeatherSnapshot;
  currentTemp?: number | null;  // 지금 실시간 온도 (오늘 선택 시)
  isToday?: boolean;
}

export default function WeatherCard({ weather, currentTemp, isToday }: Props) {
  const iconName = getWeatherIconName(weather.condition);
  const conditionKr = CONDITION_KR[weather.condition] ?? weather.condition;

  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* 상단 라벨 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 }}>
        <View style={{ width: 16, height: 2, backgroundColor: BOTTEGA, borderRadius: 1 }} />
        <Text
          style={{ fontSize: 9, fontWeight: '800', color: BOTTEGA, letterSpacing: 1.8 }}
        >
          {isToday ? "TODAY'S WEATHER" : "FORECAST"}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* 왼쪽: 큰 아이콘 */}
        <LinearGradient
          colors={['rgba(27,107,74,0.3)', 'rgba(27,107,74,0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}
        >
          <Ionicons name={iconName as any} size={28} color="#fff" />
        </LinearGradient>

        {/* 오른쪽: 온도 + 상세 */}
        <View style={{ flex: 1 }}>
          {/* 오늘이고 현재 온도 있으면 → 큰 현재 온도 강조 */}
          {isToday && currentTemp !== null && currentTemp !== undefined ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text
                style={{
                  fontSize: 34,
                  fontWeight: '900',
                  color: '#fff',
                  letterSpacing: -1.5,
                  lineHeight: 36,
                }}
              >
                {currentTemp}°
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
                  NOW
                </Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>·</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.55)' }}>
                  {weather.temp_max_c}°/{weather.temp_min_c}°
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: '900',
                  color: '#fff',
                  letterSpacing: -1.2,
                  lineHeight: 32,
                }}
              >
                {weather.temp_max_c}°
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: -0.3,
                }}
              >
                / {weather.temp_min_c}°
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: '#fff',
                letterSpacing: 0.5,
              }}
            >
              {conditionKr}
            </Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>·</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
              강수 {weather.precipitation_mm}mm
            </Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>·</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
              바람 {weather.wind_mps}m/s
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
