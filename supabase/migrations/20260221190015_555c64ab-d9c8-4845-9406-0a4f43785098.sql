
-- Add custom_domain and gamification_goal to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_domain text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gamification_goal numeric NOT NULL DEFAULT 1000000;

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_views_click_id ON public.views (click_id);
CREATE INDEX IF NOT EXISTS idx_views_smart_link_id ON public.views (smart_link_id);
CREATE INDEX IF NOT EXISTS idx_views_variant_id ON public.views (variant_id);
CREATE INDEX IF NOT EXISTS idx_views_created_at ON public.views (created_at);
CREATE INDEX IF NOT EXISTS idx_views_ip_hash_variant ON public.views (ip_hash, variant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_transaction_id ON public.conversions (transaction_id);
CREATE INDEX IF NOT EXISTS idx_conversions_click_id ON public.conversions (click_id);
CREATE INDEX IF NOT EXISTS idx_conversions_smart_link_id ON public.conversions (smart_link_id);
CREATE INDEX IF NOT EXISTS idx_conversions_variant_id ON public.conversions (variant_id);
CREATE INDEX IF NOT EXISTS idx_conversions_created_at ON public.conversions (created_at);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON public.conversions (status);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_platform ON public.webhook_logs (platform);

CREATE INDEX IF NOT EXISTS idx_views_utm_campaign ON public.views (utm_campaign);
CREATE INDEX IF NOT EXISTS idx_views_utm_source ON public.views (utm_source);

-- Add triggers only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_smart_links_updated_at') THEN
    CREATE TRIGGER update_smart_links_updated_at BEFORE UPDATE ON public.smart_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_variants_updated_at') THEN
    CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;
