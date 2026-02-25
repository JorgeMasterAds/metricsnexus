-- Update plan prices and limits
UPDATE plans SET price = 0, max_projects = 1, max_smartlinks = 1, max_webhooks = 1, max_users = 1,
  features = '["1 projeto", "1 smartlink", "1 webhook", "1 usuário"]'::jsonb
WHERE name = 'free';

UPDATE plans SET price = 29.90, max_projects = 3, max_smartlinks = 20, max_webhooks = 5, max_users = 5,
  features = '["3 projetos", "20 smartlinks", "5 webhooks", "5 usuários", "Relatórios básicos", "Suporte padrão"]'::jsonb
WHERE name = 'bronze';

UPDATE plans SET price = 49.90, max_projects = 5, max_smartlinks = 100, max_webhooks = 20, max_users = 20,
  features = '["5 projetos", "100 smartlinks", "20 webhooks", "20 usuários", "Exportação CSV", "Filtros avançados", "Suporte prioritário"]'::jsonb
WHERE name = 'prata';

UPDATE plans SET price = 99.90, max_projects = 10, max_smartlinks = 500, max_webhooks = -1, max_users = 100,
  features = '["10 projetos", "500 smartlinks", "Webhooks ilimitados", "100 usuários", "Relatórios avançados", "API futura", "Suporte dedicado"]'::jsonb
WHERE name = 'ouro';

-- Add stripe_price_id column to plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_product_id text;