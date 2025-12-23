-- Add OAuth fields to mercado_pago_config table
ALTER TABLE public.mercado_pago_config 
ADD COLUMN IF NOT EXISTS refresh_token TEXT,
ADD COLUMN IF NOT EXISTS public_key TEXT,
ADD COLUMN IF NOT EXISTS mp_user_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.mercado_pago_config.refresh_token IS 'Token para renovar o acesso (OAuth)';
COMMENT ON COLUMN public.mercado_pago_config.public_key IS 'Chave pública para o frontend do vendedor';
