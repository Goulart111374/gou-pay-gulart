DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Users can manage own MP config'
      AND polrelid = 'public.mercado_pago_config'::regclass
  ) THEN
    DROP POLICY "Users can manage own MP config" ON public.mercado_pago_config;
  END IF;
END$$;

CREATE POLICY "Users select own MP config"
  ON public.mercado_pago_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own MP config"
  ON public.mercado_pago_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own MP config"
  ON public.mercado_pago_config FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own MP config"
  ON public.mercado_pago_config FOR DELETE
  USING (auth.uid() = user_id);
