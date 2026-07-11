-- 오늘의 스타일 영감 (외부 소스에서 캐싱)
-- 사용자별 하루 1행. 같은 날 재방문 시 API 재호출 없이 이 테이블에서 조회.

CREATE TABLE IF NOT EXISTS public.daily_inspirations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  gender TEXT,                 -- 'male' | 'female' | 'other' | 'prefer_not_to_say'
  weather_condition TEXT,      -- 'Clear' | 'Rain' | 'Snow' | ...
  temp_avg INT,                -- 평균 온도 (°C)
  season TEXT,                 -- 'summer' | 'winter' | 'spring_fall'
  images JSONB NOT NULL,       -- [{ url, thumb, source, alt, photographer, credit_url }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_inspirations_user_date
  ON public.daily_inspirations (user_id, date DESC);

-- RLS: 자기 데이터만 조회/삽입
ALTER TABLE public.daily_inspirations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_read" ON public.daily_inspirations;
CREATE POLICY "own_read" ON public.daily_inspirations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_insert" ON public.daily_inspirations;
CREATE POLICY "own_insert" ON public.daily_inspirations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_delete" ON public.daily_inspirations;
CREATE POLICY "own_delete" ON public.daily_inspirations
  FOR DELETE USING (auth.uid() = user_id);
