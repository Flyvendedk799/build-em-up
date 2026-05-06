
-- product_media
CREATE TABLE public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  url text NOT NULL,
  alt text,
  sort integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_media public read" ON public.product_media FOR SELECT USING (true);
CREATE POLICY "product_media admin write" ON public.product_media FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX idx_product_media_product ON public.product_media(product_id, sort);

-- content_blocks
CREATE TABLE public.content_blocks (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_blocks public read" ON public.content_blocks FOR SELECT USING (true);
CREATE POLICY "content_blocks admin write" ON public.content_blocks FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER content_blocks_touch BEFORE UPDATE ON public.content_blocks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- audit_log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log admin read" ON public.audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));
CREATE POLICY "audit_log admin insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

-- variant inventory
ALTER TABLE public.product_variants
  ADD COLUMN stock_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN low_stock_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN track_inventory boolean NOT NULL DEFAULT false;

-- orders extras + admin policies
ALTER TABLE public.orders
  ADD COLUMN shipping_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN tracking_number text,
  ADD COLUMN notes text,
  ADD COLUMN refunded_at timestamptz;

CREATE POLICY "admins view all orders" ON public.orders FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "admins view all order items" ON public.order_items FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE POLICY "admins view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- storage bucket for product media
INSERT INTO storage.buckets (id, name, public) VALUES ('product-media','product-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product-media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-media');
CREATE POLICY "product-media admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-media' AND has_role(auth.uid(),'admin'));
CREATE POLICY "product-media admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-media' AND has_role(auth.uid(),'admin'));
CREATE POLICY "product-media admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-media' AND has_role(auth.uid(),'admin'));
