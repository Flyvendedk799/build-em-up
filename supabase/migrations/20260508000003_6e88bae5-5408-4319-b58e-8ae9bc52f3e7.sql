
-- Garden Brain foundation

-- Extend garden_zones with microclimate
ALTER TABLE public.garden_zones
  ADD COLUMN IF NOT EXISTS slope text,
  ADD COLUMN IF NOT EXISTS mulch boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS wind_exposure text,
  ADD COLUMN IF NOT EXISTS shade_pct integer,
  ADD COLUMN IF NOT EXISTS microclimate jsonb DEFAULT '{}'::jsonb;

-- Extend plants_catalog with agronomic intelligence
ALTER TABLE public.plants_catalog
  ADD COLUMN IF NOT EXISTS kc numeric,
  ADD COLUMN IF NOT EXISTS root_depth_cm integer,
  ADD COLUMN IF NOT EXISTS frost_risk text,
  ADD COLUMN IF NOT EXISTS disease_risks text[],
  ADD COLUMN IF NOT EXISTS companion_plants text[],
  ADD COLUMN IF NOT EXISTS month_tasks jsonb DEFAULT '{}'::jsonb;

-- Extend watering_schedules with rule
ALTER TABLE public.watering_schedules
  ADD COLUMN IF NOT EXISTS rule jsonb DEFAULT '{}'::jsonb;

-- weather_cache
CREATE TABLE IF NOT EXISTS public.weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  date date NOT NULL,
  precip_mm numeric NOT NULL DEFAULT 0,
  temp_max numeric,
  temp_min numeric,
  et0 numeric,
  wind_max numeric,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lat, lng, date)
);
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weather_cache public read" ON public.weather_cache;
CREATE POLICY "weather_cache public read" ON public.weather_cache FOR SELECT USING (true);
DROP POLICY IF EXISTS "weather_cache authed insert" ON public.weather_cache;
CREATE POLICY "weather_cache authed insert" ON public.weather_cache FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "weather_cache authed update" ON public.weather_cache;
CREATE POLICY "weather_cache authed update" ON public.weather_cache FOR UPDATE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS weather_cache_loc_date ON public.weather_cache (lat, lng, date);

-- watering_runs (actuals)
CREATE TABLE IF NOT EXISTS public.watering_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  zone_id uuid,
  schedule_id uuid,
  ran_at timestamptz NOT NULL DEFAULT now(),
  liters numeric,
  mm numeric,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.watering_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own runs select" ON public.watering_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own runs insert" ON public.watering_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own runs update" ON public.watering_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own runs delete" ON public.watering_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS watering_runs_user_zone ON public.watering_runs (user_id, zone_id, ran_at DESC);

-- ai_recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  garden_id uuid,
  zone_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'info',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own recs select" ON public.ai_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own recs insert" ON public.ai_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own recs update" ON public.ai_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own recs delete" ON public.ai_recommendations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- plant_health_log
CREATE TABLE IF NOT EXISTS public.plant_health_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  zone_id uuid,
  plant_id uuid,
  image_url text,
  diagnosis text,
  severity text,
  treatment text,
  product_suggestions jsonb DEFAULT '[]'::jsonb,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plant_health_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health select" ON public.plant_health_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own health insert" ON public.plant_health_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own health delete" ON public.plant_health_log FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- task_log
CREATE TABLE IF NOT EXISTS public.task_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  garden_id uuid,
  zone_id uuid,
  plant_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  notes text,
  done boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks select" ON public.task_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tasks insert" ON public.task_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tasks update" ON public.task_log FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tasks delete" ON public.task_log FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS task_log_user_due ON public.task_log (user_id, due_at);
