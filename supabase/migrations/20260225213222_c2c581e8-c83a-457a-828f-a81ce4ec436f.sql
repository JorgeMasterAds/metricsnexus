
-- Function: when a user becomes super_admin, upgrade their account limits to "ouro" plan
CREATE OR REPLACE FUNCTION public.sync_super_admin_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ouro_plan RECORD;
  acct_id UUID;
BEGIN
  -- Get ouro plan limits
  SELECT max_projects, max_smartlinks, max_webhooks, max_users
  INTO ouro_plan
  FROM public.plans WHERE lower(name) = 'ouro' LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get all account_ids for this user
  FOR acct_id IN
    SELECT account_id FROM public.account_users WHERE user_id = NEW.user_id
  LOOP
    UPDATE public.usage_limits
    SET
      max_projects = ouro_plan.max_projects,
      max_smartlinks = ouro_plan.max_smartlinks,
      max_webhooks = ouro_plan.max_webhooks,
      max_users = ouro_plan.max_users
    WHERE account_id = acct_id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger: fire when a new super_admin is inserted
CREATE TRIGGER trg_sync_super_admin_limits
  AFTER INSERT ON public.super_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_super_admin_limits();

-- Also handle removal: revert to their actual plan limits
CREATE OR REPLACE FUNCTION public.revert_super_admin_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  acct_id UUID;
  plan_row RECORD;
BEGIN
  FOR acct_id IN
    SELECT account_id FROM public.account_users WHERE user_id = OLD.user_id
  LOOP
    SELECT p.max_projects, p.max_smartlinks, p.max_webhooks, p.max_users
    INTO plan_row
    FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.account_id = acct_id AND s.status = 'active'
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.usage_limits
      SET
        max_projects = plan_row.max_projects,
        max_smartlinks = plan_row.max_smartlinks,
        max_webhooks = plan_row.max_webhooks,
        max_users = plan_row.max_users
      WHERE account_id = acct_id;
    END IF;
  END LOOP;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_revert_super_admin_limits
  AFTER DELETE ON public.super_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_super_admin_limits();

-- Sync existing super admins now
DO $$
DECLARE
  ouro RECORD;
  sa RECORD;
  acct_id UUID;
BEGIN
  SELECT max_projects, max_smartlinks, max_webhooks, max_users
  INTO ouro
  FROM public.plans WHERE lower(name) = 'ouro' LIMIT 1;

  IF FOUND THEN
    FOR sa IN SELECT user_id FROM public.super_admins LOOP
      FOR acct_id IN SELECT account_id FROM public.account_users WHERE user_id = sa.user_id LOOP
        UPDATE public.usage_limits
        SET max_projects = ouro.max_projects, max_smartlinks = ouro.max_smartlinks,
            max_webhooks = ouro.max_webhooks, max_users = ouro.max_users
        WHERE account_id = acct_id;
      END LOOP;
    END LOOP;
  END IF;
END;
$$;
