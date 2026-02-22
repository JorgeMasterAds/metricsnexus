
-- Composite indices for performance (skip if already exists)
CREATE INDEX IF NOT EXISTS idx_views_project_created ON public.views (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_views_project_utm_campaign ON public.views (project_id, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_views_project_click_id ON public.views (project_id, click_id);
CREATE INDEX IF NOT EXISTS idx_conversions_project_created ON public.conversions (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversions_project_transaction ON public.conversions (project_id, transaction_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON public.daily_metrics (date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_project_date ON public.daily_metrics (project_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_lookup ON public.daily_metrics (user_id, smart_link_id, variant_id, date);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_project_created ON public.webhook_logs (project_id, created_at);

-- Full recalculation function for daily_metrics
CREATE OR REPLACE FUNCTION public.recalculate_daily_metrics(p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing metrics for the target user (or all if null)
  IF p_user_id IS NOT NULL THEN
    DELETE FROM daily_metrics WHERE user_id = p_user_id;
  ELSE
    DELETE FROM daily_metrics;
  END IF;

  -- Rebuild from views
  INSERT INTO daily_metrics (date, user_id, project_id, smart_link_id, variant_id, views, conversions, revenue)
  SELECT 
    (v.created_at AT TIME ZONE 'UTC')::date AS date,
    v.user_id,
    v.project_id,
    v.smart_link_id,
    v.variant_id,
    COUNT(v.id) AS views,
    0 AS conversions,
    0 AS revenue
  FROM views v
  WHERE (p_user_id IS NULL OR v.user_id = p_user_id)
  GROUP BY (v.created_at AT TIME ZONE 'UTC')::date, v.user_id, v.project_id, v.smart_link_id, v.variant_id;

  -- Merge conversions into existing rows
  WITH conv_agg AS (
    SELECT
      (c.created_at AT TIME ZONE 'UTC')::date AS date,
      c.user_id,
      c.project_id,
      c.smart_link_id,
      c.variant_id,
      COUNT(c.id) AS conversions,
      COALESCE(SUM(c.amount), 0) AS revenue
    FROM conversions c
    WHERE c.status = 'approved'
      AND (p_user_id IS NULL OR c.user_id = p_user_id)
    GROUP BY (c.created_at AT TIME ZONE 'UTC')::date, c.user_id, c.project_id, c.smart_link_id, c.variant_id
  )
  UPDATE daily_metrics dm
  SET conversions = ca.conversions,
      revenue = ca.revenue
  FROM conv_agg ca
  WHERE dm.date = ca.date
    AND dm.user_id = ca.user_id
    AND COALESCE(dm.project_id, '00000000-0000-0000-0000-000000000000') = COALESCE(ca.project_id, '00000000-0000-0000-0000-000000000000')
    AND COALESCE(dm.smart_link_id, '00000000-0000-0000-0000-000000000000') = COALESCE(ca.smart_link_id, '00000000-0000-0000-0000-000000000000')
    AND COALESCE(dm.variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE(ca.variant_id, '00000000-0000-0000-0000-000000000000');

  -- Insert conversion-only rows that don't have views
  INSERT INTO daily_metrics (date, user_id, project_id, smart_link_id, variant_id, views, conversions, revenue)
  SELECT
    (c.created_at AT TIME ZONE 'UTC')::date,
    c.user_id,
    c.project_id,
    c.smart_link_id,
    c.variant_id,
    0,
    COUNT(c.id),
    COALESCE(SUM(c.amount), 0)
  FROM conversions c
  WHERE c.status = 'approved'
    AND (p_user_id IS NULL OR c.user_id = p_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM daily_metrics dm
      WHERE dm.date = (c.created_at AT TIME ZONE 'UTC')::date
        AND dm.user_id = c.user_id
        AND COALESCE(dm.project_id, '00000000-0000-0000-0000-000000000000') = COALESCE(c.project_id, '00000000-0000-0000-0000-000000000000')
        AND COALESCE(dm.smart_link_id, '00000000-0000-0000-0000-000000000000') = COALESCE(c.smart_link_id, '00000000-0000-0000-0000-000000000000')
        AND COALESCE(dm.variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE(c.variant_id, '00000000-0000-0000-0000-000000000000')
    )
  GROUP BY (c.created_at AT TIME ZONE 'UTC')::date, c.user_id, c.project_id, c.smart_link_id, c.variant_id;
END;
$$;
