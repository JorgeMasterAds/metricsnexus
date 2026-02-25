
-- Function for super admins to list all users with account/subscription info
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  full_name text,
  phone text,
  avatar_url text,
  account_id uuid,
  account_name text,
  plan_type text,
  plan_name text,
  subscription_status text,
  subscription_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can call this
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    p.full_name,
    a.phone,
    p.avatar_url,
    au.account_id,
    a.name AS account_name,
    s.plan_type,
    pl.name AS plan_name,
    s.status::text AS subscription_status,
    s.created_at AS subscription_created_at
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN account_users au ON au.user_id = u.id
  LEFT JOIN accounts a ON a.id = au.account_id
  LEFT JOIN subscriptions s ON s.account_id = au.account_id
  LEFT JOIN plans pl ON pl.id = s.plan_id
  ORDER BY u.created_at DESC;
END;
$$;

-- Function for super admins to update a user's profile
CREATE OR REPLACE FUNCTION public.admin_update_user(
  _user_id uuid,
  _full_name text DEFAULT NULL,
  _phone text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update profile name
  IF _full_name IS NOT NULL THEN
    UPDATE profiles SET full_name = _full_name, updated_at = now() WHERE id = _user_id;
  END IF;

  -- Update account phone (via account_users link)
  IF _phone IS NOT NULL THEN
    UPDATE accounts SET phone = _phone, updated_at = now()
    WHERE id = (SELECT account_id FROM account_users WHERE user_id = _user_id LIMIT 1);
  END IF;
END;
$$;
