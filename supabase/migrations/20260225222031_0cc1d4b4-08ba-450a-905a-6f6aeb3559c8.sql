-- Table for deletion requests that need admin approval
CREATE TABLE public.deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  resource_type TEXT NOT NULL, -- 'smartlink', 'webhook', etc.
  resource_id UUID NOT NULL,
  resource_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dr_select" ON public.deletion_requests FOR SELECT USING (
  account_id = ANY (get_user_account_ids(auth.uid()))
);

CREATE POLICY "dr_insert" ON public.deletion_requests FOR INSERT WITH CHECK (
  account_id = ANY (get_user_account_ids(auth.uid()))
);

CREATE POLICY "dr_update" ON public.deletion_requests FOR UPDATE USING (
  account_id = ANY (get_user_account_ids(auth.uid()))
);

CREATE POLICY "dr_delete" ON public.deletion_requests FOR DELETE USING (
  account_id = ANY (get_user_account_ids(auth.uid()))
);
