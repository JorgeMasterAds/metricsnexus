
-- Update plan limits to match specified values
UPDATE public.plans SET max_projects = 1, max_smartlinks = 1, max_webhooks = 1, max_users = 1 WHERE name = 'free';
UPDATE public.plans SET max_projects = 3, max_smartlinks = 10, max_webhooks = 5, max_users = 3 WHERE name = 'bronze';
UPDATE public.plans SET max_projects = 3, max_smartlinks = 20, max_webhooks = 10, max_users = 5 WHERE name = 'prata';
UPDATE public.plans SET max_projects = 5, max_smartlinks = 20, max_webhooks = 20, max_users = 5 WHERE name = 'ouro';

-- Add RLS policies for plans management by super_admin
CREATE POLICY "plans_insert_super_admin" ON public.plans FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "plans_update_super_admin" ON public.plans FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "plans_delete_super_admin" ON public.plans FOR DELETE USING (public.is_super_admin(auth.uid()));
