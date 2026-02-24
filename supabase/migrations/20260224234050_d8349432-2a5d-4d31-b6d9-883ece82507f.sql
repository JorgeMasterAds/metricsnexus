
-- 1. Plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  max_projects integer NOT NULL DEFAULT 1,
  max_smartlinks integer NOT NULL DEFAULT 1,
  max_webhooks integer NOT NULL DEFAULT 1,
  max_users integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_select" ON public.plans FOR SELECT USING (true);

INSERT INTO public.plans (name, max_projects, max_smartlinks, max_webhooks, max_users, price, features) VALUES
  ('free', 1, 1, 1, 1, 0, '["1 projeto","1 smartlink","1 webhook","1 usuário"]'::jsonb),
  ('bronze', 2, 10, 10, 2, 49.90, '["2 projetos","10 smartlinks","10 webhooks","2 usuários","Relatórios básicos"]'::jsonb),
  ('prata', 3, 25, 15, 5, 99.90, '["3 projetos","25 smartlinks","15 webhooks","5 usuários","Exportação CSV","Filtros avançados"]'::jsonb),
  ('ouro', 5, 50, -1, 10, 199.90, '["5 projetos","50 smartlinks","Webhooks ilimitados","10 usuários","Relatórios avançados","API futura"]'::jsonb);

-- 2. Link subscriptions to plans
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id);

-- 3. Projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_account_id ON public.projects(account_id);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proj_select" ON public.projects FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "proj_insert" ON public.projects FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "proj_update" ON public.projects FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "proj_delete" ON public.projects FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Project users (invites per project)
CREATE TABLE public.project_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pu_select" ON public.project_users FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE account_id = ANY(get_user_account_ids(auth.uid())))
);
CREATE POLICY "pu_insert" ON public.project_users FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM public.projects WHERE account_id = ANY(get_user_account_ids(auth.uid())))
);
CREATE POLICY "pu_delete" ON public.project_users FOR DELETE USING (
  project_id IN (SELECT id FROM public.projects WHERE account_id = ANY(get_user_account_ids(auth.uid())))
);

-- 5. Add platform_name to webhooks
ALTER TABLE public.webhooks ADD COLUMN IF NOT EXISTS platform_name text;

-- 6. Add project_id to key tables (nullable for backward compat)
ALTER TABLE public.webhooks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
ALTER TABLE public.smartlinks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);

-- 7. Add max_projects to usage_limits
ALTER TABLE public.usage_limits ADD COLUMN IF NOT EXISTS max_projects integer DEFAULT 10;

-- 8. Super admins table (avoids enum modification in transaction)
CREATE TABLE public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_select_own" ON public.super_admins FOR SELECT USING (user_id = auth.uid());

-- 9. is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = _user_id
  );
$$;

-- 10. Create default project for each existing account
INSERT INTO public.projects (account_id, name)
SELECT id, name || ' - Projeto Principal'
FROM public.accounts
WHERE id NOT IN (SELECT account_id FROM public.projects);

-- 11. Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatar_select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatar_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "avatar_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "avatar_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
