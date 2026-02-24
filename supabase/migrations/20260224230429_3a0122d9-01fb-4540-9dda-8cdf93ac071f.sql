
-- Create webhooks table (dynamic token-based webhooks)
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  platform TEXT DEFAULT 'hotmart',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_products junction table
CREATE TABLE public.webhook_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(webhook_id, product_id)
);

-- Indexes
CREATE INDEX idx_webhooks_token ON public.webhooks(token);
CREATE INDEX idx_webhooks_account_id ON public.webhooks(account_id);
CREATE INDEX idx_webhook_products_webhook_id ON public.webhook_products(webhook_id);

-- RLS for webhooks
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_select" ON public.webhooks FOR SELECT
  USING (account_id = ANY (get_user_account_ids(auth.uid())));

CREATE POLICY "wh_insert" ON public.webhooks FOR INSERT
  WITH CHECK (account_id = ANY (get_user_account_ids(auth.uid())));

CREATE POLICY "wh_update" ON public.webhooks FOR UPDATE
  USING (account_id = ANY (get_user_account_ids(auth.uid())));

CREATE POLICY "wh_delete" ON public.webhooks FOR DELETE
  USING (account_id = ANY (get_user_account_ids(auth.uid())));

-- RLS for webhook_products
ALTER TABLE public.webhook_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wp_select" ON public.webhook_products FOR SELECT
  USING (webhook_id IN (SELECT id FROM public.webhooks WHERE account_id = ANY (get_user_account_ids(auth.uid()))));

CREATE POLICY "wp_insert" ON public.webhook_products FOR INSERT
  WITH CHECK (webhook_id IN (SELECT id FROM public.webhooks WHERE account_id = ANY (get_user_account_ids(auth.uid()))));

CREATE POLICY "wp_delete" ON public.webhook_products FOR DELETE
  USING (webhook_id IN (SELECT id FROM public.webhooks WHERE account_id = ANY (get_user_account_ids(auth.uid()))));

-- Trigger for updated_at on webhooks
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
