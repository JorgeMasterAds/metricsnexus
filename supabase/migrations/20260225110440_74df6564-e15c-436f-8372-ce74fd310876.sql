
-- Dashboard layouts per user per project
CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  page TEXT NOT NULL DEFAULT 'dashboard',
  layout_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, page)
);

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dl_select" ON public.dashboard_layouts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "dl_insert" ON public.dashboard_layouts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "dl_update" ON public.dashboard_layouts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "dl_delete" ON public.dashboard_layouts FOR DELETE USING (user_id = auth.uid());

-- Performance indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_conversions_project_created ON public.conversions (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversions_utm_source ON public.conversions (utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversions_payment_method ON public.conversions (payment_method) WHERE payment_method IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_project_created ON public.webhook_logs (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON public.webhook_logs (status);

-- Log retention: function to delete logs older than 90 days
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.webhook_logs WHERE created_at < now() - interval '90 days';
END;
$$;
