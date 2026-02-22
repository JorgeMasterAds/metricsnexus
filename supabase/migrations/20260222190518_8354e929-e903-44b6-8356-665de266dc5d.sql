
-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects"
  ON public.projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add project_id to existing tables
ALTER TABLE public.smart_links ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.variants ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.views ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.conversions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.daily_metrics ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.conversion_events ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Add webhook_secret to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Migrate existing webhook secrets
UPDATE public.profiles
SET webhook_secret = COALESCE(hotmart_webhook_secret, cakto_webhook_secret)
WHERE webhook_secret IS NULL
  AND (hotmart_webhook_secret IS NOT NULL OR cakto_webhook_secret IS NOT NULL);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_smart_links_project_id ON public.smart_links(project_id);
CREATE INDEX IF NOT EXISTS idx_views_project_id ON public.views(project_id);
CREATE INDEX IF NOT EXISTS idx_conversions_project_id ON public.conversions(project_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_project_id ON public.webhook_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_project_id ON public.daily_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_views_utm_campaign ON public.views(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_views_utm_medium ON public.views(utm_medium);
