-- 1. Create safe view for ai_api_keys (excluding encrypted key)
CREATE OR REPLACE VIEW public.ai_api_keys_safe WITH (security_invoker = true) AS
SELECT id, account_id, provider, label, is_active, created_at, updated_at
FROM public.ai_api_keys;

-- 2. Create safe view for whatsapp_devices (excluding encrypted key)
CREATE OR REPLACE VIEW public.whatsapp_devices_safe WITH (security_invoker = true) AS
SELECT id, account_id, project_id, instance_name, api_url, phone_number, status, last_seen_at, created_at, updated_at
FROM public.whatsapp_devices;