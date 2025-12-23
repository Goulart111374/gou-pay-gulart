-- Modules table
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own modules"
  ON public.modules FOR ALL
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  content_type TEXT,
  content_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lessons"
  ON public.lessons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Memberships table
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
-- Buyers can view own memberships by user_id or email in JWT
CREATE POLICY "Buyers view own memberships"
  ON public.memberships FOR SELECT
  USING (
    buyer_user_id = auth.uid()
    OR buyer_email = (auth.jwt() ->> 'email')
  );

-- Sellers cannot modify via client; updates are done via service role
-- Optional: allow buyers to update to attach buyer_user_id after auth
CREATE POLICY "Buyers can update own memberships to link profile"
  ON public.memberships FOR UPDATE
  USING (buyer_email = (auth.jwt() ->> 'email'))
  WITH CHECK (buyer_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_modules_product_id ON public.modules(product_id);
CREATE INDEX IF NOT EXISTS idx_lessons_product_id ON public.lessons(product_id);
CREATE INDEX IF NOT EXISTS idx_memberships_product_id ON public.memberships(product_id);
