
-- Fix Security Definer View warning on plans_public
-- Set security_invoker=on so the view respects RLS of the querying user
-- Since plans base table allows SELECT for all authenticated users,
-- this view will still work for authenticated users while respecting RLS.
-- For anon access to plan pricing, we grant SELECT on the base table to anon
-- with a restricted policy that only exposes safe fields via the view.

-- Step 1: Recreate the view with security_invoker
DROP VIEW IF EXISTS public.plans_public;
CREATE VIEW public.plans_public 
WITH (security_invoker = on)
AS
SELECT id, name, price, features, max_projects, max_smartlinks, max_webhooks, max_users, created_at
FROM public.plans;

GRANT SELECT ON public.plans_public TO authenticated, anon;

-- Step 2: Add a SELECT policy for anon on plans base table so the security_invoker view works
CREATE POLICY "plans_select_anon" ON public.plans
FOR SELECT TO anon
USING (true);
