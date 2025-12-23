-- Add Split Payment columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_net_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS mp_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS release_status TEXT DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN public.sales.platform_fee IS 'Comissão da plataforma retida no split';
COMMENT ON COLUMN public.sales.seller_net_amount IS 'Valor líquido destinado ao vendedor';
