
-- 1. Fix handle_new_user to pull limits from the free plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_account_id UUID;
  free_plan_id UUID;
  free_plan RECORD;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Create account
  INSERT INTO public.accounts (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha Conta'))
  RETURNING id INTO new_account_id;

  -- Link user to account as owner
  INSERT INTO public.account_users (account_id, user_id, role, accepted_at)
  VALUES (new_account_id, NEW.id, 'owner', now());

  -- Set user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');

  -- Get free plan limits
  SELECT id, max_projects, max_smartlinks, max_webhooks, max_users
  INTO free_plan
  FROM public.plans WHERE name = 'free' LIMIT 1;

  free_plan_id := free_plan.id;

  -- Create usage_limits with values from free plan
  INSERT INTO public.usage_limits (account_id, max_projects, max_smartlinks, max_webhooks, max_users)
  VALUES (
    new_account_id,
    COALESCE(free_plan.max_projects, 1),
    COALESCE(free_plan.max_smartlinks, 1),
    COALESCE(free_plan.max_webhooks, 1),
    COALESCE(free_plan.max_users, 1)
  );

  -- Create free subscription
  INSERT INTO public.subscriptions (account_id, plan_type, plan_id, status)
  VALUES (new_account_id, 'free', free_plan_id, 'active');

  -- Create default referral code
  INSERT INTO public.referral_codes (account_id, code)
  VALUES (new_account_id, encode(extensions.gen_random_bytes(6), 'hex'));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create trigger to propagate plan limit changes to all affected accounts
CREATE OR REPLACE FUNCTION public.sync_plan_limits_to_accounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage_limits for all accounts subscribed to this plan
  UPDATE public.usage_limits ul
  SET
    max_projects = NEW.max_projects,
    max_smartlinks = NEW.max_smartlinks,
    max_webhooks = NEW.max_webhooks,
    max_users = NEW.max_users
  FROM public.subscriptions s
  WHERE s.account_id = ul.account_id
    AND (s.plan_id = NEW.id OR (s.plan_type = NEW.name AND s.status = 'active'));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_plan_limits ON public.plans;
CREATE TRIGGER trg_sync_plan_limits
  AFTER UPDATE ON public.plans
  FOR EACH ROW
  WHEN (
    OLD.max_projects IS DISTINCT FROM NEW.max_projects OR
    OLD.max_smartlinks IS DISTINCT FROM NEW.max_smartlinks OR
    OLD.max_webhooks IS DISTINCT FROM NEW.max_webhooks OR
    OLD.max_users IS DISTINCT FROM NEW.max_users
  )
  EXECUTE FUNCTION public.sync_plan_limits_to_accounts();

-- 3. Fix existing free users with wrong limits
UPDATE public.usage_limits ul
SET
  max_projects = p.max_projects,
  max_smartlinks = p.max_smartlinks,
  max_webhooks = p.max_webhooks,
  max_users = p.max_users
FROM public.subscriptions s
JOIN public.plans p ON (p.name = s.plan_type OR p.id = s.plan_id)
WHERE s.account_id = ul.account_id
  AND s.status = 'active';

-- 4. Update column defaults to match free plan
ALTER TABLE public.usage_limits
  ALTER COLUMN max_projects SET DEFAULT 1,
  ALTER COLUMN max_smartlinks SET DEFAULT 1,
  ALTER COLUMN max_webhooks SET DEFAULT 1,
  ALTER COLUMN max_users SET DEFAULT 1;
