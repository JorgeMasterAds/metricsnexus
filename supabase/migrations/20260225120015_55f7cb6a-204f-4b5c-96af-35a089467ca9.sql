
-- Revenue goals per project
CREATE TABLE IF NOT EXISTS public.revenue_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  goal numeric NOT NULL DEFAULT 1000000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, project_id)
);

ALTER TABLE public.revenue_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rg_select" ON public.revenue_goals FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "rg_insert" ON public.revenue_goals FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "rg_update" ON public.revenue_goals FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "rg_delete" ON public.revenue_goals FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));
