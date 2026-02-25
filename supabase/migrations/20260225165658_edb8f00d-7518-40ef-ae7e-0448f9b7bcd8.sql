
CREATE POLICY "pu_update_admin"
ON public.project_users
FOR UPDATE
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN project_users pu ON pu.project_id = p.id
    WHERE pu.user_id = auth.uid()
    AND pu.role IN ('owner', 'admin')
  )
  OR
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.account_id = ANY (get_user_account_ids(auth.uid()))
    AND NOT EXISTS (
      SELECT 1 FROM project_users pu2 WHERE pu2.project_id = p.id AND pu2.user_id = auth.uid()
    )
  )
);
