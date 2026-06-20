// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PROMPT = `You analyze a single clothing item photo and return strict JSON.
Return ONLY a JSON object with these fields:
{
  "category": "top" | "bottom" | "jacket" | "dress" | "shoes" | "accessory",
  "primary_color": "#RRGGBB",
  "color_tags": ["navy","white",...],
  "style_tags": ["casual","formal","sporty","street","office", ...],
  "season_tags": ["spring","summer","fall","winter"],
  "min_temp_c": number,
  "max_temp_c": number,
  "description": "short Korean description"
}
No prose, no markdown, no code fences. JSON only.
이 옷을 분석해서 JSON으로만 답해.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(),
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: 'unauthorized', detail: userErr?.message }, 401);
    }

    const { path } = await req.json();
    if (!path || typeof path !== 'string') {
      return json({ error: 'missing path' }, 400);
    }
    if (!path.startsWith(`${userData.user.id}/`)) {
      return json({ error: 'forbidden' }, 403);
    }

    const { data: file, error: dlErr } = await supabase.storage
      .from('clothes')
      .download(path);
    if (dlErr || !file) {
      return json({ error: 'download_failed', detail: dlErr?.message }, 500);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = bytesToBase64(bytes);
    const mediaType = file.type || 'image/jpeg';

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mediaType, data: base64 } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      return json({ error: 'gemini_api_error', status: geminiRes.status, detail: errBody }, 502);
    }

    const geminiJson = await geminiRes.json();
    const text = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return json({ error: 'empty_response', raw: geminiJson }, 502);

    const parsed = safeJson(text);
    if (!parsed) return json({ error: 'parse_failed', raw: text }, 502);

    return json(parsed);
  } catch (e) {
    return json({ error: 'internal', detail: String(e) }, 500);
  }
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function safeJson(s: string): any | null {
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
