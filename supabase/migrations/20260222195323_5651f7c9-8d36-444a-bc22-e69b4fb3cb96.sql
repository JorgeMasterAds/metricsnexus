
-- Create upsert function for incremental daily_metrics view updates
CREATE OR REPLACE FUNCTION public.upsert_daily_metric_view(
  p_date date,
  p_user_id uuid,
  p_smart_link_id uuid,
  p_variant_id uuid,
  p_project_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO daily_metrics (date, user_id, project_id, smart_link_id, variant_id, views, conversions, revenue)
  VALUES (p_date, p_user_id, p_project_id, p_smart_link_id, p_variant_id, 1, 0, 0)
  ON CONFLICT (user_id, smart_link_id, variant_id, date)
    DO UPDATE SET views = daily_metrics.views + 1;
EXCEPTION WHEN unique_violation THEN
  UPDATE daily_metrics 
  SET views = views + 1
  WHERE date = p_date AND user_id = p_user_id 
    AND COALESCE(smart_link_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_smart_link_id, '00000000-0000-0000-0000-000000000000')
    AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE(p_variant_id, '00000000-0000-0000-0000-000000000000');
END;
$$;

-- Add unique constraint for upsert if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_metrics_unique_combo'
  ) THEN
    ALTER TABLE public.daily_metrics 
    ADD CONSTRAINT daily_metrics_unique_combo 
    UNIQUE (user_id, smart_link_id, variant_id, date);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END;
$$;
