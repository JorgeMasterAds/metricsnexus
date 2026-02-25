
-- ═══ CRM MODULE TABLES ═══

-- Pipeline stages (kanban columns)
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#10b981',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_select" ON public.pipeline_stages FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "ps_insert" ON public.pipeline_stages FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "ps_update" ON public.pipeline_stages FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "ps_delete" ON public.pipeline_stages FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE INDEX idx_pipeline_stages_account ON public.pipeline_stages(account_id, project_id);

-- Leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  source text,
  total_value numeric NOT NULL DEFAULT 0,
  stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_select" ON public.leads FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "lead_insert" ON public.leads FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "lead_update" ON public.leads FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "lead_delete" ON public.leads FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE INDEX idx_leads_account ON public.leads(account_id, project_id);
CREATE INDEX idx_leads_email ON public.leads(account_id, email);
CREATE INDEX idx_leads_phone ON public.leads(account_id, phone);
CREATE INDEX idx_leads_stage ON public.leads(stage_id);

-- Lead tags
CREATE TABLE public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lt_select" ON public.lead_tags FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "lt_insert" ON public.lead_tags FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "lt_update" ON public.lead_tags FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "lt_delete" ON public.lead_tags FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE INDEX idx_lead_tags_account ON public.lead_tags(account_id);

-- Lead-tag assignments (M2M)
CREATE TABLE public.lead_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.lead_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

ALTER TABLE public.lead_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lta_select" ON public.lead_tag_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.account_id = ANY(get_user_account_ids(auth.uid())))
);
CREATE POLICY "lta_insert" ON public.lead_tag_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.account_id = ANY(get_user_account_ids(auth.uid())))
);
CREATE POLICY "lta_delete" ON public.lead_tag_assignments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.account_id = ANY(get_user_account_ids(auth.uid())))
);
CREATE INDEX idx_lta_lead ON public.lead_tag_assignments(lead_id);
CREATE INDEX idx_lta_tag ON public.lead_tag_assignments(tag_id);

-- Lead history (activity log)
CREATE TABLE public.lead_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lh_select" ON public.lead_history FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "lh_insert" ON public.lead_history FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE INDEX idx_lead_history_lead ON public.lead_history(lead_id);

-- Lead notes (internal annotations)
CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ln_select" ON public.lead_notes FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "ln_insert" ON public.lead_notes FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "ln_delete" ON public.lead_notes FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE INDEX idx_lead_notes_lead ON public.lead_notes(lead_id);

-- Lead purchases (links leads to conversions)
CREATE TABLE public.lead_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversion_id uuid NOT NULL REFERENCES public.conversions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id, conversion_id)
);

ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lp_select" ON public.lead_purchases FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.account_id = ANY(get_user_account_ids(auth.uid())))
);
CREATE POLICY "lp_insert" ON public.lead_purchases FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.account_id = ANY(get_user_account_ids(auth.uid())))
);
CREATE INDEX idx_lead_purchases_lead ON public.lead_purchases(lead_id);

-- Trigger for updated_at on leads
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to upsert lead from webhook (called by edge function)
CREATE OR REPLACE FUNCTION public.upsert_lead_from_webhook(
  p_account_id uuid,
  p_project_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_source text,
  p_amount numeric,
  p_conversion_id uuid,
  p_product_name text,
  p_status text,
  p_payment_method text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_lead_id uuid;
  v_tag_id uuid;
  v_first_stage_id uuid;
BEGIN
  -- Find existing lead by email or phone
  IF p_email IS NOT NULL AND p_email != '' THEN
    SELECT id INTO v_lead_id FROM leads WHERE account_id = p_account_id AND email = p_email LIMIT 1;
  END IF;
  IF v_lead_id IS NULL AND p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT id INTO v_lead_id FROM leads WHERE account_id = p_account_id AND phone = p_phone LIMIT 1;
  END IF;

  -- Get first pipeline stage
  SELECT id INTO v_first_stage_id FROM pipeline_stages 
  WHERE account_id = p_account_id AND (project_id = p_project_id OR project_id IS NULL)
  ORDER BY position LIMIT 1;

  IF v_lead_id IS NOT NULL THEN
    -- Update existing lead
    UPDATE leads SET 
      total_value = total_value + COALESCE(p_amount, 0),
      name = COALESCE(NULLIF(p_name, ''), name),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      updated_at = now()
    WHERE id = v_lead_id;

    -- Log history
    INSERT INTO lead_history (lead_id, account_id, action, details, metadata)
    VALUES (v_lead_id, p_account_id, 'purchase', 'Nova compra: ' || COALESCE(p_product_name, '?'), 
      jsonb_build_object('amount', p_amount, 'product', p_product_name, 'status', p_status));
  ELSE
    -- Create new lead
    INSERT INTO leads (account_id, project_id, name, email, phone, source, total_value, stage_id)
    VALUES (p_account_id, p_project_id, COALESCE(p_name, p_email, 'Lead'), p_email, p_phone, p_source, COALESCE(p_amount, 0), v_first_stage_id)
    RETURNING id INTO v_lead_id;

    INSERT INTO lead_history (lead_id, account_id, action, details)
    VALUES (v_lead_id, p_account_id, 'created', 'Lead criado via webhook');
  END IF;

  -- Link purchase
  IF p_conversion_id IS NOT NULL THEN
    INSERT INTO lead_purchases (lead_id, conversion_id) VALUES (v_lead_id, p_conversion_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Auto-tag: product name
  IF p_product_name IS NOT NULL THEN
    SELECT id INTO v_tag_id FROM lead_tags WHERE account_id = p_account_id AND name = p_product_name LIMIT 1;
    IF v_tag_id IS NULL THEN
      INSERT INTO lead_tags (account_id, name, color) VALUES (p_account_id, p_product_name, '#8b5cf6') RETURNING id INTO v_tag_id;
    END IF;
    INSERT INTO lead_tag_assignments (lead_id, tag_id) VALUES (v_lead_id, v_tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Auto-tag: status
  IF p_status IS NOT NULL THEN
    SELECT id INTO v_tag_id FROM lead_tags WHERE account_id = p_account_id AND name = p_status LIMIT 1;
    IF v_tag_id IS NULL THEN
      INSERT INTO lead_tags (account_id, name, color) VALUES (p_account_id, p_status, '#10b981') RETURNING id INTO v_tag_id;
    END IF;
    INSERT INTO lead_tag_assignments (lead_id, tag_id) VALUES (v_lead_id, v_tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Auto-tag: source
  IF p_utm_source IS NOT NULL THEN
    SELECT id INTO v_tag_id FROM lead_tags WHERE account_id = p_account_id AND name = p_utm_source LIMIT 1;
    IF v_tag_id IS NULL THEN
      INSERT INTO lead_tags (account_id, name, color) VALUES (p_account_id, p_utm_source, '#f59e0b') RETURNING id INTO v_tag_id;
    END IF;
    INSERT INTO lead_tag_assignments (lead_id, tag_id) VALUES (v_lead_id, v_tag_id) ON CONFLICT DO NOTHING;
  END IF;

  -- Auto-tag: payment method
  IF p_payment_method IS NOT NULL THEN
    SELECT id INTO v_tag_id FROM lead_tags WHERE account_id = p_account_id AND name = p_payment_method LIMIT 1;
    IF v_tag_id IS NULL THEN
      INSERT INTO lead_tags (account_id, name, color) VALUES (p_account_id, p_payment_method, '#06b6d4') RETURNING id INTO v_tag_id;
    END IF;
    INSERT INTO lead_tag_assignments (lead_id, tag_id) VALUES (v_lead_id, v_tag_id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_lead_id;
END;
$$;
