
ALTER TABLE public.device_actions
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS zone_id uuid;
