
-- Function to get user emails by IDs (for super admin listing)
CREATE OR REPLACE FUNCTION public.get_user_emails_by_ids(_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, email::text FROM auth.users WHERE id = ANY(_user_ids);
$$;

-- Create support_tickets table for contact form
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid,
  category text NOT NULL DEFAULT 'suggestion',
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (user_id = auth.uid());
