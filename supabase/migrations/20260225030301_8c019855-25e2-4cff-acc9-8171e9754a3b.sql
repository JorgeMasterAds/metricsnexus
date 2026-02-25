
-- Create a secure function to find user ID by email without loading all users
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1;
$$;

-- Revoke public access - only service role should call this
REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM authenticated;
