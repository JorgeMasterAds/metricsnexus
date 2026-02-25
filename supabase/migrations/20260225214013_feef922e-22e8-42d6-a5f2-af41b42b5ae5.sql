
-- 3. Aggregation function: rebuild daily_metrics from raw data
CREATE OR REPLACE FUNCTION public.aggregate_daily_metrics(p_target_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  DELETE FROM public.daily_metrics WHERE daily_metrics.date = p_target_date;

  INSERT INTO public.daily_metrics (account_id, date, smartlink_id, variant_id, views, conversions, revenue)
  SELECT
    c.account_id,
    p_target_date,
    c.smartlink_id,
    c.variant_id,
    COALESCE(cl.view_count, 0),
    COUNT(c.id),
    COALESCE(SUM(c.amount), 0)
  FROM public.conversions c
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as view_count
    FROM public.clicks ck
    WHERE ck.account_id = c.account_id
      AND ck.smartlink_id = c.smartlink_id
      AND ck.created_at::date = p_target_date
  ) cl ON true
  WHERE c.created_at::date = p_target_date
    AND c.status = 'approved'
  GROUP BY c.account_id, c.smartlink_id, c.variant_id, cl.view_count;

  INSERT INTO public.daily_metrics (account_id, date, smartlink_id, variant_id, views, conversions, revenue)
  SELECT
    ck.account_id,
    p_target_date,
    ck.smartlink_id,
    ck.variant_id,
    COUNT(*),
    0,
    0
  FROM public.clicks ck
  WHERE ck.created_at::date = p_target_date
    AND NOT EXISTS (
      SELECT 1 FROM public.daily_metrics dm
      WHERE dm.account_id = ck.account_id
        AND dm.smartlink_id IS NOT DISTINCT FROM ck.smartlink_id
        AND dm.variant_id IS NOT DISTINCT FROM ck.variant_id
        AND dm.date = p_target_date
    )
  GROUP BY ck.account_id, ck.smartlink_id, ck.variant_id;
END;
$fn$;

-- 4. Data retention
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  DELETE FROM public.webhook_logs WHERE created_at < now() - interval '90 days';
END;
$fn$;
