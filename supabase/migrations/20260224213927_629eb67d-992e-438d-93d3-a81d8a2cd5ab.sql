
-- Drop existing overly permissive policies on integrations
DROP POLICY IF EXISTS "int_select" ON public.integrations;
DROP POLICY IF EXISTS "int_insert" ON public.integrations;
DROP POLICY IF EXISTS "int_update" ON public.integrations;
DROP POLICY IF EXISTS "int_delete" ON public.integrations;

-- Helper function: check if user has admin or owner role in a specific account
CREATE OR REPLACE FUNCTION public.user_has_admin_access(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_users
    WHERE user_id = _user_id
      AND account_id = _account_id
      AND role IN ('owner', 'admin')
  );
$$;

-- integrations: only admin/owner can SELECT
CREATE POLICY "int_select_admin"
  ON public.integrations FOR SELECT
  TO authenticated
  USING (
    public.user_has_admin_access(auth.uid(), account_id)
  );

-- integrations: only admin/owner can INSERT
CREATE POLICY "int_insert_admin"
  ON public.integrations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_admin_access(auth.uid(), account_id)
  );

-- integrations: only admin/owner can UPDATE
CREATE POLICY "int_update_admin"
  ON public.integrations FOR UPDATE
  TO authenticated
  USING (
    public.user_has_admin_access(auth.uid(), account_id)
  );

-- integrations: only admin/owner can DELETE
CREATE POLICY "int_delete_admin"
  ON public.integrations FOR DELETE
  TO authenticated
  USING (
    public.user_has_admin_access(auth.uid(), account_id)
  );
