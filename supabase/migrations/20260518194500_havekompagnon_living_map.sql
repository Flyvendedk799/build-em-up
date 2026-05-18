-- Havekompagnonen: living map, photo observations, growth, and integrations.

ALTER TABLE public.gardens
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.garden_zones
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS irrigation_method text,
  ADD COLUMN IF NOT EXISTS crop_family text;

ALTER TABLE public.user_plants
  ADD COLUMN IF NOT EXISTS variety text,
  ADD COLUMN IF NOT EXISTS lifecycle_status text,
  ADD COLUMN IF NOT EXISTS health_status text,
  ADD COLUMN IF NOT EXISTS map_position jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_observed_at timestamptz;

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS map_position jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS autopilot_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.task_log
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS observation_id uuid,
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.garden_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_id uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.garden_zones(id) ON DELETE SET NULL,
  plant_id uuid REFERENCES public.user_plants(id) ON DELETE SET NULL,
  kind text NOT NULL,
  image_url text,
  anchor jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.garden_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own observations select" ON public.garden_observations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own observations insert" ON public.garden_observations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own observations update" ON public.garden_observations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own observations delete" ON public.garden_observations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_garden_observations_garden_created
  ON public.garden_observations (garden_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_garden_observations_zone_created
  ON public.garden_observations (zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_garden_observations_plant_created
  ON public.garden_observations (plant_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'task_log_observation_id_fkey'
  ) THEN
    ALTER TABLE public.task_log
      ADD CONSTRAINT task_log_observation_id_fkey
      FOREIGN KEY (observation_id)
      REFERENCES public.garden_observations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.plant_health_log
  ADD COLUMN IF NOT EXISTS garden_id uuid REFERENCES public.gardens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS observation_id uuid REFERENCES public.garden_observations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS symptoms text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS causes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS prevention text;

CREATE TABLE IF NOT EXISTS public.plant_growth_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_id uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.garden_zones(id) ON DELETE SET NULL,
  plant_id uuid REFERENCES public.user_plants(id) ON DELETE SET NULL,
  observation_id uuid REFERENCES public.garden_observations(id) ON DELETE CASCADE,
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

CREATE POLICY "own growth select" ON public.plant_growth_snapshots
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own growth insert" ON public.plant_growth_snapshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own growth update" ON public.plant_growth_snapshots
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own growth delete" ON public.plant_growth_snapshots
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_growth_plant_created
  ON public.plant_growth_snapshots (plant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_id uuid REFERENCES public.gardens(id) ON DELETE CASCADE,
  provider text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  display_name text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own integrations select" ON public.integration_connections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own integrations insert" ON public.integration_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own integrations update" ON public.integration_connections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own integrations delete" ON public.integration_connections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_integrations_user_garden
  ON public.integration_connections (user_id, garden_id, kind);

CREATE TABLE IF NOT EXISTS public.device_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_id uuid REFERENCES public.gardens(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.garden_zones(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.devices(id) ON DELETE CASCADE,
  kind text NOT NULL,
  value numeric,
  unit text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own readings select" ON public.device_readings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own readings insert" ON public.device_readings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own readings update" ON public.device_readings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own readings delete" ON public.device_readings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_device_readings_device_observed
  ON public.device_readings (device_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_readings_zone_observed
  ON public.device_readings (zone_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.device_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_id uuid REFERENCES public.gardens(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES public.garden_zones(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.devices(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by text NOT NULL DEFAULT 'user',
  reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own actions select" ON public.device_actions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own actions insert" ON public.device_actions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own actions update" ON public.device_actions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own actions delete" ON public.device_actions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_device_actions_user_status
  ON public.device_actions (user_id, status, created_at DESC);
