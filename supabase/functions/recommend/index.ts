// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SYSTEM_PROMPT = `You are a fashion stylist AI. Given tomorrow's weather and a user's available wardrobe,
propose 3 distinct outfit combinations. Each combination picks one top, one bottom, and a jacket if
temperature warrants it. Apply these rules:
- Respect each item's min_temp_c/max_temp_c range against tomorrow's temp range.
- Color harmony: prefer complementary, tone-on-tone, or tasteful neutral pairings. Avoid clashing hues.
- Do NOT use any clothing id listed in "recently_worn_ids". Those are banned.
- Style coherence within one outfit (don't mix formal tops with athletic bottoms unless intentional).
- If no jacket is needed (warm enough), set jacket_id to null.
- If the wardrobe lacks valid items for a slot, set that slot to null and explain in reason.

Return ONLY strict JSON:
{
  "suggestions": [
    { "top_id": "uuid|null", "bottom_id": "uuid|null", "jacket_id": "uuid|null", "reason": "short Korean explanation" },
    ... (3 items)
  ]
}
No prose outside the JSON.`;

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
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
    const userId = userData.user.id;

    const { weather, date } = await req.json();
    if (!weather || !date) return json({ error: 'missing weather/date' }, 400);

    const { data: clothes, error: cErr } = await supabase
      .from('clothes')
      .select('id, category, primary_color, color_tags, style_tags, season_tags, min_temp_c, max_temp_c, description')
      .eq('user_id', userId);
    if (cErr) return json({ error: cErr.message }, 500);
    if (!clothes || clothes.length === 0) {
      return json({ weather, date, suggestions: [], note: '옷장에 등록된 옷이 없습니다.' });
    }

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const fromDate = fourDaysAgo.toISOString().slice(0, 10);
    const { data: recent } = await supabase
      .from('wear_log')
      .select('clothing_ids')
      .eq('user_id', userId)
      .gte('worn_on', fromDate);

    const bannedIds = new Set<string>();
    (recent ?? []).forEach((r: any) =>
      (r.clothing_ids as string[]).forEach((id: string) => bannedIds.add(id))
    );

    const userPrompt = SYSTEM_PROMPT + '\n\n' + JSON.stringify({
      weather, date,
      recently_worn_ids: [...bannedIds],
      wardrobe: clothes,
    }, null, 2);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      return json({ error: 'gemini_api_error', status: geminiRes.status, detail: errBody }, 502);
    }

    const geminiJson = await geminiRes.json();
    const text = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return json({ error: 'empty_response' }, 502);

    const parsed = safeJson(text);
    if (!parsed?.suggestions) {
      return json({ error: 'parse_failed', raw: text }, 502);
    }

    return json({ weather, date, suggestions: parsed.suggestions });
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
