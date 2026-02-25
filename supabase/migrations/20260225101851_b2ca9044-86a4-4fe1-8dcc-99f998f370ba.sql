
-- Fix SECURITY DEFINER view: recreate as SECURITY INVOKER
DROP VIEW IF EXISTS public.integrations_safe;
CREATE VIEW public.integrations_safe
WITH (security_invoker = true)
AS
SELECT id, account_id, provider, external_account_id, config, expires_at, created_at, updated_at
FROM public.integrations;

-- Re-grant access
GRANT SELECT ON public.integrations_safe TO authenticated;

-- We also need to re-grant SELECT on integrations to authenticated so the view can work
-- (RLS on the base table still controls access)
GRANT SELECT ON public.integrations TO authenticated;
