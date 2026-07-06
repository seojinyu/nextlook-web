// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { decode } from 'npm:jpeg-js@0.4.4';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';

const COLOR_MAP: [string, string, number, number, number][] = [
  ['블랙', '#000000', 0, 0, 0],
  ['화이트', '#FFFFFF', 255, 255, 255],
  ['그레이', '#888888', 136, 136, 136],
  ['네이비', '#1B2A4A', 27, 42, 74],
  ['블루', '#2962FF', 41, 98, 255],
  ['라이트블루', '#82B1FF', 130, 177, 255],
  ['레드', '#D32F2F', 211, 47, 47],
  ['핑크', '#F48FB1', 244, 143, 177],
  ['베이지', '#D7C9AA', 215, 201, 170],
  ['브라운', '#5D4037', 93, 64, 55],
  ['카키', '#6B7B3A', 107, 123, 58],
  ['그린', '#2E7D32', 46, 125, 50],
  ['옐로우', '#FDD835', 253, 216, 53],
  ['오렌지', '#EF6C00', 239, 108, 0],
  ['퍼플', '#7B1FA2', 123, 31, 162],
  ['라이트그레이', '#CCCCCC', 204, 204, 204],
  ['다크그레이', '#444444', 68, 68, 68],
  ['와인', '#722F37', 114, 47, 55],
  ['민트', '#98FF98', 152, 255, 152],
  ['크림', '#FFFDD0', 255, 253, 208],
];

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function closestColor(r: number, g: number, b: number): { name: string; hex: string } {
  const [h, s, l] = rgbToHsl(r, g, b);
  let minDist = Infinity;
  let best = COLOR_MAP[0];

  for (const c of COLOR_MAP) {
    const [ch, cs, cl] = rgbToHsl(c[2], c[3], c[4]);
    let dist: number;
    if (s < 0.08 || l < 0.06) {
      dist = Math.abs(l - cl) * 120 + (cs > 0.1 ? 60 : 0);
    } else if (cs < 0.08 || cl < 0.06) {
      dist = 90 + Math.abs(l - cl) * 60;
    } else {
      let dh = Math.abs(h - ch);
      if (dh > 180) dh = 360 - dh;
      dist = dh * 1.5 + Math.abs(l - cl) * 60 + Math.abs(s - cs) * 30;
    }
    if (dist < minDist) { minDist = dist; best = c; }
  }
  return { name: best[0], hex: best[1] };
}

function extractDominantColor(data: Uint8Array, width: number, height: number): { r: number; g: number; b: number } {
  const x0 = Math.floor(width * 0.15);
  const x1 = Math.floor(width * 0.85);
  const y0 = Math.floor(height * 0.15);
  const y1 = Math.floor(height * 0.85);

  const QUANT = 24;
  const buckets = new Map<string, { rSum: number; gSum: number; bSum: number; wSum: number; count: number }>();

  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness < 10 || brightness > 248) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const weight = 1 + sat * 3;

      const key = `${Math.floor(r / QUANT)},${Math.floor(g / QUANT)},${Math.floor(b / QUANT)}`;
      const b2 = buckets.get(key);
      if (b2) {
        b2.rSum += r * weight; b2.gSum += g * weight; b2.bSum += b * weight;
        b2.wSum += weight; b2.count++;
      } else {
        buckets.set(key, { rSum: r * weight, gSum: g * weight, bSum: b * weight, wSum: weight, count: 1 });
      }
    }
  }

  const sorted = [...buckets.values()].filter((b) => b.count > 10).sort((a, b) => b.wSum - a.wSum);
  if (sorted.length === 0) return { r: 128, g: 128, b: 128 };

  const top = sorted[0];
  return {
    r: Math.round(top.rSum / top.wSum),
    g: Math.round(top.gSum / top.wSum),
    b: Math.round(top.bSum / top.wSum),
  };
}

interface AiAnalysis {
  category: string;
  seasons: string[]; // 복수 계절 지원
  sleeve_length?: string;
  color_name?: string; // AI가 감지한 색상 이름 (한국어)
  is_pattern?: boolean; // 패턴/무늬 있는지
}

async function analyzeClothingWithGemini(imageBytes: Uint8Array): Promise<AiAnalysis> {
  const defaultResult: AiAnalysis = { category: 'top', seasons: ['spring_fall'] };
  if (!GEMINI_API_KEY) return defaultResult;
  try {
    const b64 = encodeBase64(imageBytes);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: b64 } },
              { text: `You are a fashion expert. Analyze this clothing item photo and reply with ONLY a JSON object:

{
  "category": "top|bottom|jacket",
  "seasons": ["summer", "spring_fall", "winter"],
  "sleeve_length": "short|long|sleeveless|none",
  "color": "블랙|화이트|그레이|라이트그레이|다크그레이|네이비|블루|라이트블루|레드|와인|핑크|베이지|크림|브라운|카키|그린|민트|옐로우|오렌지|퍼플",
  "is_pattern": false
}

=== CATEGORY (CRITICAL - be very precise) ===

TOP (상의) - Upper body clothing:
  - T-shirts, blouses, shirts, polo shirts
  - Sweaters (unless they're heavy outer layer)
  - Hoodies, sweatshirts (unless it's clearly outer wear)
  - Tank tops, cami tops
  - Turtlenecks
  KEY: If you can wear this as the primary top layer, it's TOP

BOTTOM (하의) - Lower body clothing:
  - Pants, jeans, trousers, chinos
  - Shorts (any length)
  - Skirts (any length)
  - Sweatpants, joggers
  - Leggings
  KEY: Covers lower body

JACKET (자켓) - Outer layer clothing:
  - Coats (long, trench, wool)
  - Blazers, suit jackets
  - Padded jackets, puffer jackets, down jackets
  - Denim jackets, leather jackets, bomber jackets
  - Cardigans (open front, outer wear style)
  - Kimono-style outerwear
  KEY: Designed to wear OVER other clothes

=== SEASONS (multi-select array, can have 1-3 items) ===

Rules for multi-season assignment:
- Short-sleeve tops, tank tops, shorts, mini skirts → ["summer"]
- Long-sleeve regular thickness tops, light sweaters → ["spring_fall", "winter"]
- Very heavy items (thick padded coats, wool coats, chunky knits) → ["winter"] only
- Light jackets, cardigans, blazers → ["spring_fall", "winter"]
- Denim (jeans, jean jackets) → ["spring_fall", "winter"] (not summer unless clearly light-wash cropped)
- Pants of medium weight → ["spring_fall", "winter"]

Examples:
- Cotton t-shirt: {"category":"top","seasons":["summer"],"sleeve_length":"short"}
- Wool sweater: {"category":"top","seasons":["winter"],"sleeve_length":"long"}
- Cardigan: {"category":"jacket","seasons":["spring_fall","winter"],"sleeve_length":"long"}
- Jeans: {"category":"bottom","seasons":["spring_fall","winter"],"sleeve_length":"none"}
- Shorts: {"category":"bottom","seasons":["summer"],"sleeve_length":"none"}
- Padded winter coat: {"category":"jacket","seasons":["winter"],"sleeve_length":"long"}

=== COLOR (choose exactly ONE closest match) ===

Look at the DOMINANT color of the actual clothing (ignore any tags, hangers, backgrounds).

- 블랙 (black): very dark, almost no lightness
- 화이트 (white): very light, near-pure white
- 그레이 (gray): pure gray between black and white
- 라이트그레이: pale gray
- 다크그레이: charcoal
- 네이비: very dark blue
- 블루: medium blue
- 라이트블루: pale blue
- 레드: pure red or bright red
- 와인: dark red / burgundy
- 핑크: pink or salmon
- 베이지: warm neutral, tan
- 크림: off-white, ivory
- 브라운: brown, coffee
- 카키: military green / olive
- 그린: green
- 민트: mint / pale green
- 옐로우: yellow, mustard
- 오렌지: orange, coral
- 퍼플: purple, violet

For multi-color/patterned items: pick the DOMINANT color.

is_pattern: true if the item has visible patterns (stripes, checks, floral, prints), false if solid color.

Reply ONLY the JSON object, no other text.` },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 200 },
        }),
      }
    );
    if (!res.ok) return defaultResult;
    const json = await res.json();
    const text = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    let cat: string; let seasons: string[]; let sleeve: string | undefined; let color: string | undefined; let pattern = false;
    try {
      const parsed = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
      cat = ['top', 'bottom', 'jacket'].includes(parsed.category) ? parsed.category : 'top';

      // seasons 배열 검증
      const validSeasons = ['summer', 'winter', 'spring_fall'];
      if (Array.isArray(parsed.seasons)) {
        seasons = parsed.seasons.filter((s: string) => validSeasons.includes(s));
        if (seasons.length === 0) seasons = ['spring_fall'];
      } else if (typeof parsed.season === 'string' && validSeasons.includes(parsed.season)) {
        seasons = [parsed.season];
      } else {
        seasons = ['spring_fall'];
      }

      sleeve = parsed.sleeve_length;
      color = parsed.color;
      pattern = !!parsed.is_pattern;
    } catch {
      // fallback: parse from text
      cat = text.includes('"bottom"') ? 'bottom' : text.includes('"jacket"') ? 'jacket' : 'top';
      seasons = ['spring_fall'];
      if (text.includes('summer')) seasons.push('summer');
      if (text.includes('winter')) seasons.push('winter');
      seasons = [...new Set(seasons)];
      sleeve = text.includes('short') ? 'short' : text.includes('sleeveless') ? 'sleeveless' : undefined;
    }

    // 안전장치: 반팔/민소매 상의 → 여름 포함 강제
    if ((cat === 'top' || cat === 'jacket') && (sleeve === 'short' || sleeve === 'sleeveless')) {
      if (!seasons.includes('summer')) seasons = ['summer'];
    }

    return { category: cat, seasons, sleeve_length: sleeve, color_name: color, is_pattern: pattern };
  } catch (e) {
    console.error('[Gemini] error:', e);
    return defaultResult;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: 'unauthorized' }, 401);
    }

    const { path } = await req.json();
    if (!path || typeof path !== 'string') {
      return json({ error: 'missing path' }, 400);
    }

    const { data: file, error: dlErr } = await supabase.storage
      .from('clothes')
      .download(path);
    if (dlErr || !file) {
      return json({ error: 'download_failed', detail: dlErr?.message }, 500);
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    // Color extraction (pure JS) and AI analysis (Gemini) in parallel
    const img = decode(buffer, { useTArray: true });
    const [pxColorResult, aiResult] = await Promise.all([
      Promise.resolve((() => {
        const { r, g, b } = extractDominantColor(img.data, img.width, img.height);
        return { ...closestColor(r, g, b), raw_rgb: { r, g, b } };
      })()),
      analyzeClothingWithGemini(buffer),
    ]);

    // AI가 감지한 색상 이름을 우선 사용 (더 정확)
    let finalColor = pxColorResult;
    if (aiResult.color_name) {
      const aiMatch = COLOR_MAP.find((c) => c[0] === aiResult.color_name);
      if (aiMatch) {
        finalColor = {
          name: aiMatch[0],
          hex: aiMatch[1],
          raw_rgb: pxColorResult.raw_rgb, // 원본 RGB는 그대로
        };
        console.log(`[analyze] AI 색상 우선: ${aiMatch[0]} (픽셀: ${pxColorResult.name})`);
      }
    }

    // 첫 번째 계절을 대표 season으로 (backward compat)
    const primarySeason = aiResult.seasons[0] ?? 'spring_fall';

    return json({
      ...finalColor,
      category: aiResult.category,
      season: primarySeason, // backward compatibility
      seasons: aiResult.seasons, // 새로운 배열
      sleeve_length: aiResult.sleeve_length,
      is_pattern: aiResult.is_pattern,
      color_name_ai: aiResult.color_name, // 디버깅용
      color_name_pixel: pxColorResult.name, // 디버깅용
    });
  } catch (e) {
    return json({ error: 'internal', detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
