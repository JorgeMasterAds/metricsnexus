-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate handle_new_user using extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id UUID;
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

  -- Create default referral code using extensions schema
  INSERT INTO public.referral_codes (account_id, code)
  VALUES (new_account_id, encode(extensions.gen_random_bytes(6), 'hex'));

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
