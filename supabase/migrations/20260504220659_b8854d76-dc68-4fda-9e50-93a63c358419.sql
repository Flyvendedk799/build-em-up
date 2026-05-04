
-- 1. gardens additions
ALTER TABLE public.gardens
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS exclusions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS imagery_source text;

-- 2. lawn segmentation cache
CREATE TABLE IF NOT EXISTS public.lawn_segmentation_cache (
  bbox_hash text PRIMARY KEY,
  polygon jsonb NOT NULL,
  source text NOT NULL DEFAULT 'gemini',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lawn_segmentation_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seg cache public read"
  ON public.lawn_segmentation_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);
-- writes only via edge function (service role bypasses RLS); no insert/update policy for clients

-- 3. storage bucket for garden thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('garden-thumbnails', 'garden-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "garden thumb public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'garden-thumbnails');

CREATE POLICY "garden thumb owner insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'garden-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "garden thumb owner update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'garden-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "garden thumb owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'garden-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
