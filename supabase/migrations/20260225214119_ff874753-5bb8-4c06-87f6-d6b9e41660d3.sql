
SELECT cron.schedule(
  'aggregate-metrics-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://fnpmuffrqrlofjvqytof.supabase.co/functions/v1/aggregate-metrics',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucG11ZmZycXJsb2ZqdnF5dG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTAzNjQsImV4cCI6MjA4NzUyNjM2NH0.3veZ6OjXgYagq3YyrXrYPjZ18XAqwaj-09ZfYWV6o0A"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Daily cleanup at 3 AM
SELECT cron.schedule(
  'cleanup-old-logs-daily',
  '0 3 * * *',
  $$SELECT public.cleanup_old_webhook_logs();$$
);
