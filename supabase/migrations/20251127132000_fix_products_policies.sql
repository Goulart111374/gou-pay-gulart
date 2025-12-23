DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Users can manage own products'
      AND polrelid = 'public.products'::regclass
  ) THEN
    DROP POLICY "Users can manage own products" ON public.products;
  END IF;
END$$;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users select own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users insert own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users update own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users delete own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);
