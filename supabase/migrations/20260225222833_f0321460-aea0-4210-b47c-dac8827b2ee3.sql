
CREATE TABLE public.investments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  date_from date NOT NULL,
  date_to date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(account_id, project_id, date_from, date_to)
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_select" ON public.investments FOR SELECT
  USING (account_id = ANY (get_user_account_ids(auth.uid())));

CREATE POLICY "inv_insert" ON public.investments FOR INSERT
  WITH CHECK (account_id = ANY (get_user_account_ids(auth.uid())));

CREATE POLICY "inv_update" ON public.investments FOR UPDATE
  USING (account_id = ANY (get_user_account_ids(auth.uid())));

CREATE POLICY "inv_delete" ON public.investments FOR DELETE
  USING (account_id = ANY (get_user_account_ids(auth.uid())));
