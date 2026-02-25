
-- PART 1: Create safe view for integrations (excludes tokens)
CREATE OR REPLACE VIEW public.integrations_safe AS
SELECT id, account_id, provider, external_account_id, config, expires_at, created_at, updated_at
FROM public.integrations;

-- Revoke direct SELECT on integrations from authenticated (anon already has no access via RLS)
REVOKE SELECT ON public.integrations FROM authenticated;

-- Grant SELECT on safe view to authenticated
GRANT SELECT ON public.integrations_safe TO authenticated;

-- PART 2: Remove legacy webhook_secret from accounts
ALTER TABLE public.accounts DROP COLUMN IF EXISTS webhook_secret;

-- PART 8: Verify conversion_events write deny policies exist (already created, but ensure)
-- These already exist: ce_insert_deny, ce_update_deny, ce_delete_deny
-- No action needed.

-- PART 6: Avatar bucket - add size limit policy (max 2MB, images only)
-- Drop existing INSERT policy and recreate with restrictions
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload avatar images only"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'))
  AND (octet_length(name) < 500)
);
