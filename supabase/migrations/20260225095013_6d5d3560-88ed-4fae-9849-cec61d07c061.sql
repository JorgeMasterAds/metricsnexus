
-- 1) Deny all client-side writes on conversion_events (only service role can write)
CREATE POLICY "ce_insert_deny" ON public.conversion_events
FOR INSERT WITH CHECK (false);

CREATE POLICY "ce_update_deny" ON public.conversion_events
FOR UPDATE USING (false);

CREATE POLICY "ce_delete_deny" ON public.conversion_events
FOR DELETE USING (false);

-- 2) Allow only owners/admins to update account_users (prevents member self-promotion)
CREATE POLICY "au_update_owner_admin" ON public.account_users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.account_users au
    WHERE au.account_id = account_users.account_id
    AND au.user_id = auth.uid()
    AND au.role IN ('owner', 'admin')
  )
);
