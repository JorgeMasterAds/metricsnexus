
-- AI Agents module tables

-- API keys for external AI providers
CREATE TABLE public.ai_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- openai, anthropic, groq, etc
  label TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_api_keys_account ON public.ai_api_keys(account_id);
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aiak_select" ON public.ai_api_keys FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "aiak_insert" ON public.ai_api_keys FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "aiak_update" ON public.ai_api_keys FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "aiak_delete" ON public.ai_api_keys FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

-- WhatsApp devices
CREATE TABLE public.whatsapp_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  instance_name TEXT NOT NULL,
  api_url TEXT NOT NULL, -- Evolution API base URL
  api_key_encrypted TEXT NOT NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected', -- connected, disconnected, connecting
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_devices_account ON public.whatsapp_devices(account_id);
ALTER TABLE public.whatsapp_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_select" ON public.whatsapp_devices FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "wd_insert" ON public.whatsapp_devices FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "wd_update" ON public.whatsapp_devices FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "wd_delete" ON public.whatsapp_devices FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

-- AI Agents
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- whatsapp, form, webhook, manual
  trigger_config JSONB DEFAULT '{}',
  ai_config JSONB NOT NULL DEFAULT '{}', -- model, prompt, rules, knowledge_base
  actions JSONB NOT NULL DEFAULT '[]', -- array of action nodes
  max_executions_per_minute INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_agents_account ON public.ai_agents(account_id);
CREATE INDEX idx_ai_agents_project ON public.ai_agents(project_id);
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aia_select" ON public.ai_agents FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "aia_insert" ON public.ai_agents FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "aia_update" ON public.ai_agents FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "aia_delete" ON public.ai_agents FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

-- Agent execution logs
CREATE TABLE public.agent_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  trigger_data JSONB,
  ai_response TEXT,
  actions_executed JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'success', -- success, error, rate_limited
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_logs_agent ON public.agent_execution_logs(agent_id);
CREATE INDEX idx_agent_logs_account ON public.agent_execution_logs(account_id);
CREATE INDEX idx_agent_logs_created ON public.agent_execution_logs(created_at DESC);
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ael_select" ON public.agent_execution_logs FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));

-- Triggers for updated_at
CREATE TRIGGER update_ai_api_keys_updated_at BEFORE UPDATE ON public.ai_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_whatsapp_devices_updated_at BEFORE UPDATE ON public.whatsapp_devices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
