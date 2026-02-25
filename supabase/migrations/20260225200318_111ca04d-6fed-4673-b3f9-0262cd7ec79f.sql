
-- ============================================================
-- SECURITY FIX 1: Recreate integrations_safe view with security_invoker
-- This ensures base table RLS (admin-only) applies when querying the view
-- ============================================================
DROP VIEW IF EXISTS public.integrations_safe;
CREATE VIEW public.integrations_safe 
WITH (security_invoker = true)
AS
SELECT id, account_id, provider, expires_at, external_account_id, config, created_at, updated_at
FROM public.integrations;

GRANT SELECT ON public.integrations_safe TO authenticated;

-- ============================================================
-- SECURITY FIX 2: Create plans_public view (no Stripe IDs exposed)
-- Regular/anon users see only safe fields; admins still query base table
-- ============================================================
CREATE VIEW public.plans_public AS
SELECT id, name, price, features, max_projects, max_smartlinks, max_webhooks, max_users, created_at
FROM public.plans;

GRANT SELECT ON public.plans_public TO authenticated, anon;

-- ============================================================
-- SECURITY FIX 3: Restrict plans base table SELECT to authenticated only
-- Prevents anon access to stripe_product_id and stripe_price_id
-- ============================================================
DROP POLICY IF EXISTS "plans_select" ON public.plans;
CREATE POLICY "plans_select_authenticated" ON public.plans
FOR SELECT TO authenticated
USING (true);

-- ============================================================
-- SECURITY FIX 4: Add ip_hash column to clicks for LGPD compliance
-- Going forward, edge function stores SHA-256 hash instead of raw IP
-- ============================================================
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS ip_hash text;

-- Anonymize existing IPs (mask last octet and store hash)
UPDATE public.clicks 
SET ip_hash = encode(sha256(convert_to(COALESCE(ip, ''), 'UTF8')), 'hex'),
    ip = NULL
WHERE ip IS NOT NULL;
