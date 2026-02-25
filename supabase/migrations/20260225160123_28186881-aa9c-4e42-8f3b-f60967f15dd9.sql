
-- Allow super admins to manage announcements
CREATE POLICY "sa_insert_announcements"
ON system_announcements FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "sa_update_announcements"
ON system_announcements FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "sa_delete_announcements"
ON system_announcements FOR DELETE
USING (is_super_admin(auth.uid()));
