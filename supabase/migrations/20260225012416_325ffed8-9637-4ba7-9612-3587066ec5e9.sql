
-- Table for custom domains per account
CREATE TABLE public.custom_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain)
);

ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cd_select" ON public.custom_domains FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "cd_insert" ON public.custom_domains FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "cd_update" ON public.custom_domains FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "cd_delete" ON public.custom_domains FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

-- Add unique constraint for slug within account (multi-tenant safe)
-- First drop any existing duplicates by keeping only the first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'smartlinks_account_id_slug_unique'
  ) THEN
    ALTER TABLE public.smartlinks ADD CONSTRAINT smartlinks_account_id_slug_unique UNIQUE(account_id, slug);
  END IF;
END$$;
