-- Platform settings table for super admin global config
CREATE TABLE public.platform_settings (
  id text PRIMARY KEY DEFAULT 'global',
  max_accounts integer DEFAULT 1000,
  max_users_per_account integer DEFAULT 10,
  max_projects_per_account integer DEFAULT 10,
  max_free_users integer DEFAULT 100,
  max_free_events_monthly integer DEFAULT 10000,
  max_smartlinks_free integer DEFAULT 5,
  max_webhooks_free integer DEFAULT 2,
  log_retention_days integer DEFAULT 90,
  login_bg_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can read
CREATE POLICY "ps_select_super_admin" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- Only super admins can insert
CREATE POLICY "ps_insert_super_admin" ON public.platform_settings
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can update
CREATE POLICY "ps_update_super_admin" ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Allow super admins to manage super_admins table (promote/remove)
CREATE POLICY "sa_insert_super_admin" ON public.super_admins
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "sa_delete_super_admin" ON public.super_admins
  FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Allow super admins to see all super_admins
CREATE POLICY "sa_select_all_super_admin" ON public.super_admins
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- Insert default row
INSERT INTO public.platform_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;