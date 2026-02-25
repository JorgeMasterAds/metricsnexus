-- Fix plans limits to match requirements
UPDATE public.plans SET max_smartlinks = 10, max_users = 3 WHERE name = 'bronze';
UPDATE public.plans SET max_smartlinks = 25, max_users = 10, max_webhooks = 15 WHERE name = 'prata';
UPDATE public.plans SET max_smartlinks = 100, max_users = 50, max_webhooks = 50 WHERE name = 'ouro';
