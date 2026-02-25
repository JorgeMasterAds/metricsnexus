-- Create free subscription for existing accounts that don't have one
INSERT INTO public.subscriptions (account_id, plan_type, plan_id, status)
SELECT a.id, 'free', p.id, 'active'
FROM public.accounts a
CROSS JOIN public.plans p
LEFT JOIN public.subscriptions s ON s.account_id = a.id
WHERE p.name = 'free' AND s.id IS NULL;

-- Update handle_new_user to also create a free subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_account_id UUID;
  free_plan_id UUID;
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

  -- Create default usage_limits
  INSERT INTO public.usage_limits (account_id)
  VALUES (new_account_id);

  -- Create free subscription
  SELECT id INTO free_plan_id FROM public.plans WHERE name = 'free' LIMIT 1;
  INSERT INTO public.subscriptions (account_id, plan_type, plan_id, status)
  VALUES (new_account_id, 'free', free_plan_id, 'active');

  -- Create default referral code
  INSERT INTO public.referral_codes (account_id, code)
  VALUES (new_account_id, encode(extensions.gen_random_bytes(6), 'hex'));

  RETURN NEW;
END;
$function$;