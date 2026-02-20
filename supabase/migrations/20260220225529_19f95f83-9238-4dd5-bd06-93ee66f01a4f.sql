
-- Drop overly permissive policies and replace with service_role only
DROP POLICY IF EXISTS "Service can insert views" ON public.views;
DROP POLICY IF EXISTS "Service can insert conversions" ON public.conversions;
DROP POLICY IF EXISTS "Service can update conversions" ON public.conversions;
DROP POLICY IF EXISTS "Service can insert webhook logs" ON public.webhook_logs;

-- Views: service role can insert (edge functions use service role key)
CREATE POLICY "Service role can insert views" ON public.views 
  FOR INSERT TO service_role WITH CHECK (true);

-- Conversions: service role can insert/update
CREATE POLICY "Service role can insert conversions" ON public.conversions 
  FOR INSERT TO service_role WITH CHECK (true);
  
CREATE POLICY "Service role can update conversions" ON public.conversions 
  FOR UPDATE TO service_role USING (true);

-- Webhook logs: service role can insert
CREATE POLICY "Service role can insert webhook logs" ON public.webhook_logs 
  FOR INSERT TO service_role WITH CHECK (true);
