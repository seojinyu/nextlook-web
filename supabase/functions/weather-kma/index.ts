// deno-lint-ignore-file no-explicit-any
/**
 * 기상청 날씨 조회 Edge Function.
 *
 * 사용 API (공공데이터포털):
 *   1. 초단기실황 (getUltraSrtNcst) - 현재 실시간 기온
 *   2. 단기예보 (getVilageFcst)     - 오늘 ~ +2일 3시간별 예보
 *   3. 중기예보온도 (getMidTa)       - +3 ~ +10일 최고/최저
 *
 * 환경 변수:
 *   KMA_API_KEY - Encoding 인증키 (URL 인코딩된 형태)
 *
 * 좌표계 변환:
 *   위경도 (WGS84) → 기상청 격자 (nx, ny)
 *   Lambert Conformal Conic Projection (기상청 표준)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

interface DailyForecast {
  date: string;         // YYYY-MM-DD
  temp_min_c: number;
  temp_max_c: number;
  condition: string;    // Clear, Clouds, Rain, Snow, Thunderstorm
  precipitation_mm: number;
  wind_mps: number;
}

interface Response {
  current: { temp_c: number; condition: string } | null;
  daily: DailyForecast[];  // 오늘 + 1~10일
  location: { nx: number; ny: number; regId?: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new globalThis.Response('ok', { headers: CORS_HEADERS });

  try {
    const { lat, lon } = await req.json();
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return json({ error: 'lat/lon required' }, 400);
    }

    const apiKey = Deno.env.get('KMA_API_KEY');
    if (!apiKey) return json({ error: 'KMA_API_KEY not configured' }, 500);

    // 위경도 → 기상청 격자
    const { nx, ny } = latLonToGrid(lat, lon);
    console.log(`[weather-kma] lat=${lat}, lon=${lon} → nx=${nx}, ny=${ny}`);

    // 병렬 호출
    const [current, shortTerm, midTerm] = await Promise.all([
      fetchCurrentWeather(apiKey, nx, ny).catch((e) => {
        console.warn('[weather-kma] current failed:', e);
        return null;
      }),
      fetchShortTermForecast(apiKey, nx, ny).catch((e) => {
        console.warn('[weather-kma] short-term failed:', e);
        return [];
      }),
      fetchMidTermTemperature(apiKey, lat, lon).catch((e) => {
        console.warn('[weather-kma] mid-term failed:', e);
        return [];
      }),
    ]);

    // 단기 + 중기 병합
    const daily = mergeForecasts(shortTerm, midTerm);

    return json({ current, daily, location: { nx, ny } } as Response);
  } catch (e: any) {
    console.error('[weather-kma] error:', e);
    return json({ error: e.message ?? String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new globalThis.Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * 위경도(WGS84) → 기상청 격자(nx, ny) 변환
 * Lambert Conformal Conic Projection
 */
function latLonToGrid(lat: number, lon: number): { nx: number; ny: number } {
  const RE = 6371.00877;     // 지구 반경(km)
  const GRID = 5.0;          // 격자 간격(km)
  const SLAT1 = 30.0;        // 표준위도 1
  const SLAT2 = 60.0;        // 표준위도 2
  const OLON = 126.0;        // 기준점 경도
  const OLAT = 38.0;         // 기준점 위도
  const XO = 43;             // 기준점 X좌표
  const YO = 136;            // 기준점 Y좌표

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx, ny };
}

/**
 * 초단기실황: 현재 시각의 실시간 기온
 * base_time: 매시 40분 이후 조회 가능 (예: 14:40 이후 14:00 발표분)
 */
async function fetchCurrentWeather(apiKey: string, nx: number, ny: number)
    : Promise<{ temp_c: number; condition: string } | null> {
  const now = kstNow();
  // 매시 40분 이후에 정시 발표분 사용
  const useHour = now.getMinutes() >= 40 ? now.getHours() : now.getHours() - 1;
  const baseDate = ymdFormat(now, useHour < 0 ? -1 : 0);
  const baseTime = String(useHour < 0 ? 23 : useHour).padStart(2, '0') + '00';

  const url = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?'
    + `serviceKey=${apiKey}`
    + `&numOfRows=10&pageNo=1&dataType=JSON`
    + `&base_date=${baseDate}&base_time=${baseTime}`
    + `&nx=${nx}&ny=${ny}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`getUltraSrtNcst ${res.status}`);
  const data = await res.json();
  const items = data?.response?.body?.items?.item ?? [];
  if (!Array.isArray(items) || items.length === 0) return null;

  // T1H = 기온, PTY = 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기)
  let temp = 0;
  let pty = 0;
  let sky = 1;
  for (const it of items) {
    if (it.category === 'T1H') temp = parseFloat(it.obsrValue);
    if (it.category === 'PTY') pty = parseInt(it.obsrValue, 10);
  }

  const condition = ptyToCondition(pty) ?? skyToCondition(sky);
  console.log(`[weather-kma] current: ${temp}°C, PTY=${pty}, condition=${condition}`);
  return { temp_c: Math.round(temp), condition };
}

/**
 * 단기예보: 오늘 ~ +2일 3시간별 예보
 * base_time: 02, 05, 08, 11, 14, 17, 20, 23 (매일 8회 발표)
 */
async function fetchShortTermForecast(apiKey: string, nx: number, ny: number)
    : Promise<DailyForecast[]> {
  const now = kstNow();
  const { baseDate, baseTime } = getShortTermBaseTime(now);

  const url = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?'
    + `serviceKey=${apiKey}`
    + `&numOfRows=1000&pageNo=1&dataType=JSON`
    + `&base_date=${baseDate}&base_time=${baseTime}`
    + `&nx=${nx}&ny=${ny}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`getVilageFcst ${res.status}`);
  const data = await res.json();
  const items = data?.response?.body?.items?.item ?? [];
  if (!Array.isArray(items)) return [];

  // 날짜별 그룹화
  const byDate = new Map<string, any[]>();
  for (const it of items) {
    const date = String(it.fcstDate);
    const ymd = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    if (!byDate.has(ymd)) byDate.set(ymd, []);
    byDate.get(ymd)!.push(it);
  }

  const result: DailyForecast[] = [];
  for (const [date, dayItems] of byDate) {
    let tempMax: number | null = null;
    let tempMin: number | null = null;
    let pcp = 0;
    let wsdMax = 0;
    let pty = 0;
    let sky = 1;

    for (const it of dayItems) {
      const val = it.fcstValue;
      switch (it.category) {
        case 'TMX': tempMax = parseFloat(val); break;
        case 'TMN': tempMin = parseFloat(val); break;
        case 'PCP': {
          // "강수없음" or "1mm 미만" or "5.0mm"
          if (typeof val === 'string' && val !== '강수없음') {
            const num = parseFloat(val.replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) pcp = Math.max(pcp, num);
          }
          break;
        }
        case 'WSD': {
          const w = parseFloat(val);
          if (!isNaN(w)) wsdMax = Math.max(wsdMax, w);
          break;
        }
        case 'PTY': {
          const p = parseInt(val, 10);
          if (p > pty) pty = p;
          break;
        }
        case 'SKY': {
          const s = parseInt(val, 10);
          if (s > sky) sky = s;
          break;
        }
      }
    }

    // TMX/TMN 없으면 T3H(3시간 기온)로 보완
    if (tempMax === null || tempMin === null) {
      const t3hValues = dayItems
        .filter((it) => it.category === 'TMP' || it.category === 'T3H')
        .map((it) => parseFloat(it.fcstValue))
        .filter((v) => !isNaN(v));
      if (t3hValues.length > 0) {
        if (tempMax === null) tempMax = Math.max(...t3hValues);
        if (tempMin === null) tempMin = Math.min(...t3hValues);
      }
    }

    if (tempMax === null || tempMin === null) continue;

    const condition = ptyToCondition(pty) ?? skyToCondition(sky);
    result.push({
      date,
      temp_max_c: Math.round(tempMax),
      temp_min_c: Math.round(tempMin),
      condition,
      precipitation_mm: pcp,
      wind_mps: Math.round(wsdMax * 10) / 10,
    });
  }

  result.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`[weather-kma] short-term days: ${result.length}`);
  return result;
}

/**
 * 중기예보 온도: +3 ~ +10일 최고/최저
 * base_time: 06시, 18시 발표
 * regId는 지역 코드 (위경도로 계산 어려워 도시명 기반)
 */
async function fetchMidTermTemperature(apiKey: string, lat: number, lon: number)
    : Promise<DailyForecast[]> {
  const regId = getMidTermRegId(lat, lon);
  const now = kstNow();
  const tmFc = getMidTermTmFc(now);

  const url = 'https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa?'
    + `serviceKey=${apiKey}`
    + `&numOfRows=10&pageNo=1&dataType=JSON`
    + `&regId=${regId}&tmFc=${tmFc}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`getMidTa ${res.status}`);
  const data = await res.json();
  const items = data?.response?.body?.items?.item ?? [];
  if (!Array.isArray(items) || items.length === 0) return [];

  const item = items[0];
  const today = kstNow();
  const results: DailyForecast[] = [];
  // taMin3, taMax3 ~ taMin10, taMax10
  for (let d = 3; d <= 10; d++) {
    const min = item[`taMin${d}`];
    const max = item[`taMax${d}`];
    if (min === undefined || max === undefined) continue;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + d);
    const ymd = kstFormatDate(targetDate);
    results.push({
      date: ymd,
      temp_min_c: Math.round(parseFloat(String(min))),
      temp_max_c: Math.round(parseFloat(String(max))),
      condition: 'Clouds',   // 중기예보는 별도 조회 API 있으나 여기선 생략
      precipitation_mm: 0,
      wind_mps: 0,
    });
  }
  console.log(`[weather-kma] mid-term days: ${results.length}`);
  return results;
}

/** 단기 + 중기 병합 (중복 날짜는 단기 우선) */
function mergeForecasts(shortTerm: DailyForecast[], midTerm: DailyForecast[]): DailyForecast[] {
  const map = new Map<string, DailyForecast>();
  for (const d of shortTerm) map.set(d.date, d);
  for (const d of midTerm) {
    if (!map.has(d.date)) map.set(d.date, d);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ── 시간 유틸 (KST 기준) ──

function kstNow(): Date {
  const now = new Date();
  // Deno runtime은 UTC 기준. KST = UTC+9
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function kstFormatDate(d: Date): string {
  // d는 이미 KST 오프셋 적용된 상태의 Date라고 가정
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdFormat(d: Date, dayOffset = 0): string {
  const dt = new Date(d);
  dt.setUTCDate(dt.getUTCDate() + dayOffset);
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** 단기예보 base_time: 02, 05, 08, 11, 14, 17, 20, 23 */
function getShortTermBaseTime(now: Date): { baseDate: string; baseTime: string } {
  const baseHours = [2, 5, 8, 11, 14, 17, 20, 23];
  const currentHour = now.getUTCHours();
  const currentMin = now.getUTCMinutes();

  // 발표 후 10분 이후에 조회 가능
  let selectedHour = -1;
  for (let i = baseHours.length - 1; i >= 0; i--) {
    const h = baseHours[i];
    if (currentHour > h || (currentHour === h && currentMin >= 10)) {
      selectedHour = h;
      break;
    }
  }

  if (selectedHour === -1) {
    // 새벽 (02시 이전) → 전날 23시 발표분
    return { baseDate: ymdFormat(now, -1), baseTime: '2300' };
  }
  return {
    baseDate: ymdFormat(now, 0),
    baseTime: String(selectedHour).padStart(2, '0') + '00',
  };
}

/** 중기예보 tmFc: YYYYMMDD0600 or YYYYMMDD1800 */
function getMidTermTmFc(now: Date): string {
  const h = now.getUTCHours();
  if (h >= 18) {
    return ymdFormat(now, 0) + '1800';
  } else if (h >= 6) {
    return ymdFormat(now, 0) + '0600';
  } else {
    return ymdFormat(now, -1) + '1800';
  }
}

// ── 지역 코드 (중기예보용) ──
// 위경도로 대략적인 지역 매핑. 정확한 지역이 필요하면 확장 필요.
function getMidTermRegId(lat: number, lon: number): string {
  // 대략적 매핑 (한국 주요 도시)
  // https://data.kma.go.kr/data/rmt/rmtList.do?code=420
  if (lat >= 37.4 && lat <= 37.7 && lon >= 126.7 && lon <= 127.2) return '11B10101'; // 서울
  if (lat >= 37.3 && lat <= 37.5 && lon >= 126.6 && lon <= 127.4) return '11B20601'; // 인천
  if (lat >= 37.3 && lat <= 37.5 && lon >= 126.9 && lon <= 127.3) return '11B20601'; // 경기 남부
  if (lat >= 37.5 && lat <= 37.8 && lon >= 126.9 && lon <= 127.3) return '11B20601'; // 경기 북부
  if (lat >= 36.3 && lat <= 36.4 && lon >= 127.3 && lon <= 127.5) return '11C20401'; // 대전
  if (lat >= 35.1 && lat <= 35.2 && lon >= 126.8 && lon <= 126.9) return '11F20501'; // 광주
  if (lat >= 35.1 && lat <= 35.3 && lon >= 128.9 && lon <= 129.2) return '11H20201'; // 부산
  if (lat >= 35.5 && lat <= 35.9 && lon >= 128.4 && lon <= 128.7) return '11H10701'; // 대구
  if (lat >= 35.5 && lat <= 35.6 && lon >= 129.2 && lon <= 129.4) return '11H20101'; // 울산
  if (lat >= 33.2 && lat <= 33.6 && lon >= 126.1 && lon <= 126.9) return '11G00201'; // 제주
  // 기본: 서울
  return '11B10101';
}

// ── 날씨 코드 변환 ──

/** PTY(강수형태): 0:없음, 1:비, 2:비/눈, 3:눈, 4:소나기 */
function ptyToCondition(pty: number): string | null {
  switch (pty) {
    case 1: return 'Rain';
    case 2: return 'Rain';
    case 3: return 'Snow';
    case 4: return 'Rain';
    case 5: return 'Drizzle';
    case 6: return 'Rain';
    case 7: return 'Snow';
    default: return null;
  }
}

/** SKY(하늘상태): 1:맑음, 3:구름많음, 4:흐림 */
function skyToCondition(sky: number): string {
  if (sky === 1) return 'Clear';
  if (sky === 3) return 'Clouds';
  if (sky === 4) return 'Clouds';
  return 'Clouds';
}
