-- 오늘의 쇼핑 추천 (네이버 쇼핑 API 캐싱)
-- 사용자별 하루 1행. 같은 날 재방문 시 API 재호출 없이 이 테이블에서 조회.

CREATE TABLE IF NOT EXISTS public.daily_shopping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  gender TEXT,
  weather_condition TEXT,
  temp_avg INT,
  season TEXT,
  products JSONB NOT NULL,  -- [{ id, title, image, price, mall, category, productUrl, shopUrl }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_shopping_user_date
  ON public.daily_shopping (user_id, date DESC);

-- RLS: 자기 데이터만 조회/삽입
ALTER TABLE public.daily_shopping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_own_read" ON public.daily_shopping;
CREATE POLICY "shopping_own_read" ON public.daily_shopping
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "shopping_own_insert" ON public.daily_shopping;
CREATE POLICY "shopping_own_insert" ON public.daily_shopping
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shopping_own_delete" ON public.daily_shopping;
CREATE POLICY "shopping_own_delete" ON public.daily_shopping
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "shopping_own_update" ON public.daily_shopping;
CREATE POLICY "shopping_own_update" ON public.daily_shopping
  FOR UPDATE USING (auth.uid() = user_id);
