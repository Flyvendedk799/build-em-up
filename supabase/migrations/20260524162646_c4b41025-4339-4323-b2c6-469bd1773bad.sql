
CREATE TABLE IF NOT EXISTS public.garden_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_id uuid REFERENCES public.gardens(id) ON DELETE CASCADE,
  zone_id uuid,
  plant_id uuid,
  kind text NOT NULL,
  image_url text,
  anchor jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.garden_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own obs select" ON public.garden_observations;
CREATE POLICY "own obs select" ON public.garden_observations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own obs insert" ON public.garden_observations;
CREATE POLICY "own obs insert" ON public.garden_observations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own obs update" ON public.garden_observations;
CREATE POLICY "own obs update" ON public.garden_observations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own obs delete" ON public.garden_observations;
CREATE POLICY "own obs delete" ON public.garden_observations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.plant_growth_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_id uuid REFERENCES public.gardens(id) ON DELETE CASCADE,
  zone_id uuid,
  plant_id uuid,
  observation_id uuid REFERENCES public.garden_observations(id) ON DELETE SET NULL,
  stage text,
  vigor text,
  estimated_height_cm numeric,
  flowering boolean,
  fruiting boolean,
  harvest_readiness text,
  anomaly_flags text[] NOT NULL DEFAULT '{}'::text[],
  ai_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plant_growth_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own snap select" ON public.plant_growth_snapshots;
CREATE POLICY "own snap select" ON public.plant_growth_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own snap insert" ON public.plant_growth_snapshots;
CREATE POLICY "own snap insert" ON public.plant_growth_snapshots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own snap update" ON public.plant_growth_snapshots;
CREATE POLICY "own snap update" ON public.plant_growth_snapshots FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own snap delete" ON public.plant_growth_snapshots;
CREATE POLICY "own snap delete" ON public.plant_growth_snapshots FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.user_plants
  ADD COLUMN IF NOT EXISTS map_position jsonb,
  ADD COLUMN IF NOT EXISTS lifecycle_status text,
  ADD COLUMN IF NOT EXISTS health_status text,
  ADD COLUMN IF NOT EXISTS last_observed_at timestamptz;

ALTER TABLE public.plant_health_log
  ADD COLUMN IF NOT EXISTS symptoms text[],
  ADD COLUMN IF NOT EXISTS causes text[],
  ADD COLUMN IF NOT EXISTS prevention text[],
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS observation_id uuid;

ALTER TABLE public.task_log
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS observation_id uuid,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;
