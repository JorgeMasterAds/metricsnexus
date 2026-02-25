
-- 1. Create pipelines table (multiple Kanbans per project)
CREATE TABLE public.pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Pipeline Principal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pip_select" ON public.pipelines FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "pip_insert" ON public.pipelines FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "pip_update" ON public.pipelines FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "pip_delete" ON public.pipelines FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

CREATE INDEX idx_pipelines_account_project ON public.pipelines(account_id, project_id);

-- 2. Link products to pipelines for auto-routing
CREATE TABLE public.pipeline_product_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pipeline_id, product_id)
);

ALTER TABLE public.pipeline_product_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ppl_select" ON public.pipeline_product_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM pipelines p WHERE p.id = pipeline_product_links.pipeline_id AND p.account_id = ANY(get_user_account_ids(auth.uid())))
);
CREATE POLICY "ppl_insert" ON public.pipeline_product_links FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM pipelines p WHERE p.id = pipeline_product_links.pipeline_id AND p.account_id = ANY(get_user_account_ids(auth.uid())))
);
CREATE POLICY "ppl_delete" ON public.pipeline_product_links FOR DELETE USING (
  EXISTS (SELECT 1 FROM pipelines p WHERE p.id = pipeline_product_links.pipeline_id AND p.account_id = ANY(get_user_account_ids(auth.uid())))
);

-- 3. Add pipeline_id to pipeline_stages
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stages_pipeline ON public.pipeline_stages(pipeline_id);

-- 4. Webhook forms table
CREATE TABLE public.webhook_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  redirect_type TEXT NOT NULL DEFAULT 'url' CHECK (redirect_type IN ('url', 'checkout')),
  redirect_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wf_select" ON public.webhook_forms FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "wf_insert" ON public.webhook_forms FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "wf_update" ON public.webhook_forms FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "wf_delete" ON public.webhook_forms FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

CREATE INDEX idx_webhook_forms_account ON public.webhook_forms(account_id);

-- 5. Function to create default pipeline with stages
CREATE OR REPLACE FUNCTION public.create_default_pipeline(
  p_account_id UUID,
  p_project_id UUID,
  p_name TEXT DEFAULT 'Pipeline Principal'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_pipeline_id UUID;
BEGIN
  INSERT INTO pipelines (account_id, project_id, name)
  VALUES (p_account_id, p_project_id, p_name)
  RETURNING id INTO v_pipeline_id;

  INSERT INTO pipeline_stages (account_id, project_id, pipeline_id, name, color, position) VALUES
    (p_account_id, p_project_id, v_pipeline_id, 'Novo Lead', '#3b82f6', 0),
    (p_account_id, p_project_id, v_pipeline_id, 'Qualificado', '#8b5cf6', 1),
    (p_account_id, p_project_id, v_pipeline_id, 'Negociação', '#f59e0b', 2),
    (p_account_id, p_project_id, v_pipeline_id, 'Pagamento Pendente', '#ef4444', 3),
    (p_account_id, p_project_id, v_pipeline_id, 'Compra Realizada', '#10b981', 4),
    (p_account_id, p_project_id, v_pipeline_id, 'Perdido', '#6b7280', 5);

  RETURN v_pipeline_id;
END;
$$;

-- 6. Update upsert_lead_from_webhook to support auto-routing by product/status
CREATE OR REPLACE FUNCTION public.upsert_lead_from_webhook(
  p_account_id UUID, p_project_id UUID, p_name TEXT, p_email TEXT, p_phone TEXT,
  p_source TEXT, p_amount NUMERIC, p_conversion_id UUID, p_product_name TEXT,
  p_status TEXT, p_payment_method TEXT, p_utm_source TEXT, p_utm_medium TEXT, p_utm_campaign TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id UUID;
  v_tag_id UUID;
  v_first_stage_id UUID;
  v_target_pipeline_id UUID;
  v_target_stage_id UUID;
  v_product_id UUID;
BEGIN
  -- Find existing lead by email or phone
  IF p_email IS NOT NULL AND p_email != '' THEN
    SELECT id INTO v_lead_id FROM leads WHERE account_id = p_account_id AND email = p_email LIMIT 1;
  END IF;
  IF v_lead_id IS NULL AND p_phone IS NOT NULL AND p_phone != '' THEN
    SELECT id INTO v_lead_id FROM leads WHERE account_id = p_account_id AND phone = p_phone LIMIT 1;
  END IF;

  -- Find product by name to check pipeline linkage
  SELECT id INTO v_product_id FROM products WHERE account_id = p_account_id AND name = p_product_name LIMIT 1;

  -- Check if product is linked to a pipeline for auto-routing
  IF v_product_id IS NOT NULL THEN
    SELECT ppl.pipeline_id INTO v_target_pipeline_id
    FROM pipeline_product_links ppl
    JOIN pipelines pip ON pip.id = ppl.pipeline_id
    WHERE ppl.product_id = v_product_id AND pip.account_id = p_account_id
    LIMIT 1;
  END IF;

  -- Auto-route based on status
  IF v_target_pipeline_id IS NOT NULL THEN
    IF p_status IN ('approved', 'paid', 'completed') THEN
      SELECT id INTO v_target_stage_id FROM pipeline_stages
      WHERE pipeline_id = v_target_pipeline_id AND lower(name) IN ('compra realizada', 'compra', 'aprovado', 'paid')
      ORDER BY position LIMIT 1;
    ELSIF p_status IN ('waiting_payment', 'pending', 'billet_printed', 'pix_generated') THEN
      SELECT id INTO v_target_stage_id FROM pipeline_stages
      WHERE pipeline_id = v_target_pipeline_id AND lower(name) IN ('pagamento pendente', 'aguardando pagamento', 'pendente')
      ORDER BY position LIMIT 1;
    END IF;
    -- Fallback to first stage of that pipeline
    IF v_target_stage_id IS NULL THEN
      SELECT id INTO v_target_stage_id FROM pipeline_stages
      WHERE pipeline_id = v_target_pipeline_id
      ORDER BY position LIMIT 1;
    END IF;
  END IF;

  -- Fallback: get first pipeline stage
  IF v_target_stage_id IS NULL THEN
    SELECT id INTO v_target_stage_id FROM pipeline_stages
    WHERE account_id = p_account_id AND (project_id = p_project_id OR project_id IS NULL)
    ORDER BY position LIMIT 1;
  END IF;

  IF v_lead_id IS NOT NULL THEN
    UPDATE leads SET
      total_value = total_value + COALESCE(p_amount, 0),
      name = COALESCE(NULLIF(p_name, ''), name),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      stage_id = COALESCE(v_target_stage_id, stage_id),
      updated_at = now()
    WHERE id = v_lead_id;

    INSERT INTO lead_history (lead_id, account_id, action, details, metadata)
    VALUES (v_lead_id, p_account_id, 'purchase', 'Nova compra: ' || COALESCE(p_product_name, '?'),
      jsonb_build_object('amount', p_amount, 'product', p_product_name, 'status', p_status));
  ELSE
    INSERT INTO leads (account_id, project_id, name, email, phone, source, total_value, stage_id)
    VALUES (p_account_id, p_project_id, COALESCE(p_name, p_email, 'Lead'), p_email, p_phone, p_source, COALESCE(p_amount, 0), v_target_stage_id)
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
