/**
 * 관리자 대시보드 (본인만 접근 가능).
 *
 * 접근 방법:
 *   추천 탭 헤더의 로고를 3초간 길게 누르기 → 관리자 확인 → 대시보드 이동
 *
 * 데이터 소스: admin-stats Edge Function
 * 서버에서 이메일 확인 후 service_role로 전체 데이터 집계.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { invokeEdge } from '../../lib/supabase';

interface Stats {
  generated_at: string;
  users: {
    total: number;
    new_today: number;
    new_week: number;
    new_month: number;
    by_source: Record<string, number>;
    by_gender: Record<string, number>;
    by_age: Record<string, number>;
  };
  activity: {
    dau: number;
    wau: number;
    mau: number;
    activity_rate: number;
  };
  content: {
    total_clothes: number;
    avg_closet_size: number;
    total_wear_logs: number;
    total_shopping_views: number;
    by_category: Record<string, number>;
    by_season: Record<string, number>;
  };
  recent_signups: {
    email: string;
    signup_source: string;
    gender: string | null;
    age_range: string | null;
    created_at: string;
  }[];
  daily_signups: { date: string; count: number }[];
  daily_active: { date: string; count: number }[];
}

const BOTTEGA = '#1B6B4A';
const AMBER = '#C49A3C';

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await invokeEdge<Stats>('admin-stats', {});
      setStats(data);
      setError(null);
    } catch (e: any) {
      console.error('[AdminScreen] load fail:', e);
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAF8', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={BOTTEGA} />
        <Text style={{ marginTop: 12, color: '#7A7570', fontSize: 12 }}>통계 불러오는 중...</Text>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAF8', paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginBottom: 20 }}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#D64545', marginBottom: 8 }}>
          접근 실패
        </Text>
        <Text style={{ fontSize: 13, color: '#7A7570', lineHeight: 20 }}>
          {error ?? '알 수 없는 오류'}
        </Text>
        <Text style={{ fontSize: 11, color: '#A8A4A0', marginTop: 20 }}>
          관리자 이메일로 로그인했는지 확인해 주세요.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FAFAF8' }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 80 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={BOTTEGA}
        />
      }
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <TouchableOpacity onPress={() => nav.goBack()} style={{ marginBottom: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <View style={{ width: 24, height: 2, backgroundColor: BOTTEGA, borderRadius: 1 }} />
          <Text style={{ fontSize: 10, fontWeight: '800', color: BOTTEGA, letterSpacing: 2 }}>
            ADMIN DASHBOARD
          </Text>
        </View>
        <Text style={{ fontSize: 30, fontWeight: '900', color: '#1A1A1A', letterSpacing: -1 }}>
          NextLook Stats
        </Text>
        <Text style={{ fontSize: 11, color: '#7A7570', marginTop: 4 }}>
          업데이트: {new Date(stats.generated_at).toLocaleString('ko-KR')}
        </Text>
      </View>

      {/* ── KPI 카드 (4개) ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <SectionTitle title="핵심 지표" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <KpiCard label="TOTAL USERS" value={stats.users.total} color="#1A1A1A" />
          <KpiCard label="NEW TODAY" value={stats.users.new_today} color={BOTTEGA} suffix="명" />
          <KpiCard label="DAU (오늘 활성)" value={stats.activity.dau} color={AMBER} suffix="명" />
          <KpiCard label="ACTIVITY RATE" value={stats.activity.activity_rate} color="#3D5A80" suffix="%" />
        </View>
      </View>

      {/* ── 신규 가입자 ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <SectionTitle title="신규 가입자" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatRow label="오늘" value={stats.users.new_today} />
          <StatRow label="7일" value={stats.users.new_week} />
          <StatRow label="30일" value={stats.users.new_month} />
        </View>

        {/* 최근 7일 일별 가입자 (막대) */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 11, color: '#7A7570', fontWeight: '700', marginBottom: 10, letterSpacing: 1 }}>
            일별 가입 (최근 7일)
          </Text>
          <BarChart data={stats.daily_signups} color={BOTTEGA} />
        </View>
      </View>

      {/* ── 활성 사용자 ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <SectionTitle title="활성 사용자" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatRow label="DAU (오늘)" value={stats.activity.dau} />
          <StatRow label="WAU (7일)" value={stats.activity.wau} />
          <StatRow label="MAU (30일)" value={stats.activity.mau} />
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 11, color: '#7A7570', fontWeight: '700', marginBottom: 10, letterSpacing: 1 }}>
            일별 활성 사용자 (최근 7일)
          </Text>
          <BarChart data={stats.daily_active} color={AMBER} />
        </View>
      </View>

      {/* ── 가입 경로 · 성별 · 나이 ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <SectionTitle title="사용자 분포" />

        <DistributionBar
          title="가입 경로"
          data={stats.users.by_source}
          labels={{ email: '이메일', google: 'Google', kakao: '카카오', unknown: '기타' }}
          colors={{ email: '#7A7570', google: '#4285F4', kakao: '#FEE500', unknown: '#D5D0CB' }}
        />

        <DistributionBar
          title="성별"
          data={stats.users.by_gender}
          labels={{ male: '남성', female: '여성', other: '기타', prefer_not_to_say: '비공개', unset: '미설정' }}
          colors={{ male: '#3D5A80', female: '#F48FB1', other: '#A88B6A', prefer_not_to_say: '#D5D0CB', unset: '#EDEAE6' }}
        />

        <DistributionBar
          title="나이대"
          data={stats.users.by_age}
          labels={{ '10s': '10대', '20s': '20대', '30s': '30대', '40s': '40대', '50s+': '50대+', unset: '미설정' }}
          colors={{ '10s': '#B19CD9', '20s': BOTTEGA, '30s': AMBER, '40s': '#5D4037', '50s+': '#7A7570', unset: '#EDEAE6' }}
        />
      </View>

      {/* ── 콘텐츠 통계 ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <SectionTitle title="콘텐츠 활동" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <KpiCard label="TOTAL CLOTHES" value={stats.content.total_clothes} color="#1A1A1A" />
          <KpiCard label="AVG CLOSET" value={stats.content.avg_closet_size} color="#A88B6A" suffix="벌" />
          <KpiCard label="WEAR LOGS" value={stats.content.total_wear_logs} color={BOTTEGA} />
          <KpiCard label="SHOPPING" value={stats.content.total_shopping_views} color={AMBER} />
        </View>

        <View style={{ marginTop: 16 }}>
          <DistributionBar
            title="옷 카테고리"
            data={stats.content.by_category}
            labels={{ top: '상의', bottom: '하의', jacket: '자켓', other: '기타' }}
            colors={{ top: '#3D5A80', bottom: '#5D4037', jacket: BOTTEGA, other: '#D5D0CB' }}
          />

          <DistributionBar
            title="계절 태그"
            data={stats.content.by_season}
            labels={{ spring_fall: '봄/가을', summer: '여름', winter: '겨울', unset: '미설정' }}
            colors={{ spring_fall: '#98D8C8', summer: '#FDD835', winter: '#82B1FF', unset: '#EDEAE6' }}
          />
        </View>
      </View>

      {/* ── 최근 신규 가입자 ── */}
      <View style={{ paddingHorizontal: 20 }}>
        <SectionTitle title="최근 신규 가입자 (10명)" />
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 16,
            gap: 12,
          }}
        >
          {stats.recent_signups.length === 0 && (
            <Text style={{ fontSize: 12, color: '#7A7570', textAlign: 'center', paddingVertical: 20 }}>
              신규 가입자 없음
            </Text>
          )}
          {stats.recent_signups.map((u, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingBottom: 12,
                borderBottomWidth: i === stats.recent_signups.length - 1 ? 0 : 1,
                borderBottomColor: '#EDEAE6',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>
                  {u.email}
                </Text>
                <Text style={{ fontSize: 10, color: '#7A7570', marginTop: 2 }}>
                  {u.signup_source} · {u.gender ?? '미설정'} · {u.age_range ?? '미설정'}
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: '#A8A4A0' }}>
                {new Date(u.created_at).toLocaleString('ko-KR', {
                  month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
                })}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── 서브 컴포넌트 ───

function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 15,
        fontWeight: '900',
        color: '#1A1A1A',
        marginBottom: 12,
        letterSpacing: -0.3,
      }}
    >
      {title}
    </Text>
  );
}

function KpiCard({
  label,
  value,
  color,
  suffix,
}: {
  label: string;
  value: number;
  color: string;
  suffix?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: '47%',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 14,
        borderLeftWidth: 4,
        borderLeftColor: color,
      }}
    >
      <Text style={{ fontSize: 9, fontWeight: '800', color: '#7A7570', letterSpacing: 1.5 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
        <Text style={{ fontSize: 28, fontWeight: '900', color, letterSpacing: -1 }}>
          {value.toLocaleString()}
        </Text>
        {suffix && (
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#7A7570', marginLeft: 2 }}>
            {suffix}
          </Text>
        )}
      </View>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#7A7570' }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginTop: 4 }}>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

function BarChart({ data, color }: { data: { date: string; count: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <View
      style={{
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 120,
        gap: 6,
      }}
    >
      {data.map((d, i) => {
        const heightPct = (d.count / max) * 80;
        const [, mm, dd] = d.date.split('-');
        const label = `${parseInt(mm, 10)}/${parseInt(dd, 10)}`;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#1A1A1A' }}>
              {d.count}
            </Text>
            <View
              style={{
                width: '80%',
                height: `${heightPct}%`,
                minHeight: 2,
                backgroundColor: color,
                borderRadius: 3,
              } as any}
            />
            <Text style={{ fontSize: 8, color: '#7A7570' }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function DistributionBar<K extends string>({
  title,
  data,
  labels,
  colors,
}: {
  title: string;
  data: Record<K, number>;
  labels: Record<K, string>;
  colors: Record<K, string>;
}) {
  const total = Object.values(data).reduce((s: number, n) => s + (n as number), 0);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, color: '#7A7570', fontWeight: '700', marginBottom: 8, letterSpacing: 1 }}>
        {title}
      </Text>
      <View
        style={{
          height: 24,
          borderRadius: 12,
          overflow: 'hidden',
          flexDirection: 'row',
          backgroundColor: '#EDEAE6',
        }}
      >
        {total > 0 && Object.entries(data).map(([key, count]) => {
          const cnt = count as number;
          if (cnt === 0) return null;
          const pct = (cnt / total) * 100;
          return (
            <View
              key={key}
              style={{
                width: `${pct}%`,
                backgroundColor: colors[key as K] ?? '#D5D0CB',
              } as any}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {Object.entries(data).map(([key, count]) => {
          const cnt = count as number;
          const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
          return (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: colors[key as K] ?? '#D5D0CB',
                }}
              />
              <Text style={{ fontSize: 10, color: '#1A1A1A', fontWeight: '600' }}>
                {labels[key as K] ?? key}: {cnt} ({pct}%)
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
