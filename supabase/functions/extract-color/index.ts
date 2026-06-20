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

async function detectCategoryAndSeason(imageBytes: Uint8Array): Promise<{ category: string; season: string }> {
  if (!GEMINI_API_KEY) return { category: 'top', season: 'spring_fall' };
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
              { text: 'This is a photo of a clothing item. Analyze it and reply with ONLY a JSON object, nothing else:\n{"category":"top or bottom or jacket","season":"summer or winter or spring_fall"}\n\nRules:\n- category: top (shirts, t-shirts, blouses, sweaters, hoodies), bottom (pants, jeans, skirts, shorts), jacket (coats, jackets, blazers, padded jackets)\n- season: summer (thin, sleeveless, short-sleeve, shorts, linen), winter (thick, padded, heavy coat, wool, fleece), spring_fall (light layers, long-sleeve, medium thickness)\n\nReply ONLY the JSON object.' },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 50 },
        }),
      }
    );
    if (!res.ok) return { category: 'top', season: 'spring_fall' };
    const json = await res.json();
    const text = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    try {
      const parsed = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
      const cat = ['top', 'bottom', 'jacket'].includes(parsed.category) ? parsed.category : 'top';
      const szn = ['summer', 'winter', 'spring_fall'].includes(parsed.season) ? parsed.season : 'spring_fall';
      return { category: cat, season: szn };
    } catch {
      // fallback: parse from text
      const cat = text.includes('bottom') ? 'bottom' : text.includes('jacket') ? 'jacket' : 'top';
      const szn = text.includes('summer') ? 'summer' : text.includes('winter') ? 'winter' : 'spring_fall';
      return { category: cat, season: szn };
    }
  } catch {
    return { category: 'top', season: 'spring_fall' };
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

    // Color extraction (pure JS) and category detection (Gemini) in parallel
    const img = decode(buffer, { useTArray: true });
    const [colorResult, aiResult] = await Promise.all([
      Promise.resolve((() => {
        const { r, g, b } = extractDominantColor(img.data, img.width, img.height);
        return { ...closestColor(r, g, b), raw_rgb: { r, g, b } };
      })()),
      detectCategoryAndSeason(buffer),
    ]);

    return json({
      ...colorResult,
      category: aiResult.category,
      season: aiResult.season,
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
