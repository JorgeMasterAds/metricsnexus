
-- ========================================
-- PART 1: webhook_logs - add webhook_id and project_id
-- ========================================
ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS webhook_id uuid REFERENCES public.webhooks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

-- ========================================
-- PART 2: conversions - add UTM, payment, fees columns
-- ========================================
ALTER TABLE public.conversions
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS fees numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ref_id text;

-- ========================================
-- PART 3: Performance indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_webhook_logs_project_id ON public.webhook_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON public.webhook_logs(status);

CREATE INDEX IF NOT EXISTS idx_conversions_utm_source ON public.conversions(utm_source);
CREATE INDEX IF NOT EXISTS idx_conversions_payment_method ON public.conversions(payment_method);
CREATE INDEX IF NOT EXISTS idx_conversions_ref_id ON public.conversions(ref_id);
CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON public.conversions(created_at);
CREATE INDEX IF NOT EXISTS idx_conversions_project_id ON public.conversions(project_id);
