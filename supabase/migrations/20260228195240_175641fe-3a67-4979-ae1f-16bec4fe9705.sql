
-- Table for shareable view tokens (public read-only access)
CREATE TABLE public.shared_view_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  label text NOT NULL DEFAULT 'Link de visualização',
  is_permanent boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT valid_expiry CHECK (is_permanent = true OR expires_at IS NOT NULL)
);

-- Unique index on token for fast lookup
CREATE UNIQUE INDEX idx_shared_view_tokens_token ON public.shared_view_tokens(token);

-- Enable RLS
ALTER TABLE public.shared_view_tokens ENABLE ROW LEVEL SECURITY;

-- Only account members can manage tokens
CREATE POLICY "svt_select" ON public.shared_view_tokens
  FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));

CREATE POLICY "svt_insert" ON public.shared_view_tokens
  FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));

CREATE POLICY "svt_update" ON public.shared_view_tokens
  FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));

CREATE POLICY "svt_delete" ON public.shared_view_tokens
  FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));
