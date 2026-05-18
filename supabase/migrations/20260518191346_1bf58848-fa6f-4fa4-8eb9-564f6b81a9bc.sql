CREATE TABLE IF NOT EXISTS public.havemaaler_segmentation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  event_name text NOT NULL,
  crop_hash text,
  imagery_source text,
  algorithm_version text,
  strictness text,
  confidence numeric,
  needs_review boolean,
  accepted boolean,
  seed_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings text[] NOT NULL DEFAULT '{}',
  diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_context jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_havemaaler_seg_events_created
  ON public.havemaaler_segmentation_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_havemaaler_seg_events_name_created
  ON public.havemaaler_segmentation_events (event_name, created_at DESC);

ALTER TABLE public.havemaaler_segmentation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "havemaaler segmentation insert"
  ON public.havemaaler_segmentation_events;

CREATE POLICY "havemaaler segmentation insert"
  ON public.havemaaler_segmentation_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);