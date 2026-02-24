
-- ============================================================
-- NEXUS METRICS — FULL SCHEMA MIGRATION (Phase 1)
-- Multi-tenant SaaS architecture
-- ============================================================

-- ======================== ENUMS ========================

CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE public.conversion_status AS ENUM ('approved', 'refunded', 'chargedback', 'canceled', 'pending');
CREATE TYPE public.ad_platform AS ENUM ('meta', 'google', 'tiktok', 'other');
CREATE TYPE public.integration_provider AS ENUM ('meta_ads', 'google_ads', 'hotmart', 'eduzz', 'kiwify', 'monetizze', 'other');
CREATE TYPE public.payout_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
CREATE TYPE public.notification_channel AS ENUM ('email', 'webhook');

-- ======================== HELPER: updated_at trigger ========================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ======================== CORE TABLES ========================

-- accounts (central tenant entity)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  tax_rate NUMERIC(5,2) DEFAULT 0,
  webhook_secret TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- profiles (1:1 with auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- user_roles (for RLS security definer functions)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- account_users (N:N users <-> accounts)
CREATE TABLE public.account_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (account_id, user_id)
);

-- subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT DEFAULT 'free',
  status public.subscription_status DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- usage_limits
CREATE TABLE public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL UNIQUE,
  max_dashboards INT DEFAULT 5,
  max_users INT DEFAULT 3,
  max_webhooks INT DEFAULT 10,
  max_smartlinks INT DEFAULT 25
);

-- dashboards
CREATE TABLE public.dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_dashboards_updated BEFORE UPDATE ON public.dashboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT,
  name TEXT NOT NULL,
  platform TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- product_costs (historical cost tracking)
CREATE TABLE public.product_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  cost NUMERIC(12,2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- taxes
CREATE TABLE public.taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pixels
CREATE TABLE public.pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  pixel_id TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_pixels_updated BEFORE UPDATE ON public.pixels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- smartlinks
CREATE TABLE public.smartlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_smartlinks_updated BEFORE UPDATE ON public.smartlinks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- smartlink_variants
CREATE TABLE public.smartlink_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smartlink_id UUID REFERENCES public.smartlinks(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  url TEXT NOT NULL,
  weight INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- clicks (utm_events)
CREATE TABLE public.clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  smartlink_id UUID REFERENCES public.smartlinks(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.smartlink_variants(id) ON DELETE SET NULL,
  click_id TEXT UNIQUE NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer TEXT,
  ip TEXT,
  user_agent TEXT,
  device_type TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- conversions
CREATE TABLE public.conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  click_id TEXT,
  smartlink_id UUID REFERENCES public.smartlinks(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.smartlink_variants(id) ON DELETE SET NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  platform TEXT,
  product_name TEXT,
  amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  status public.conversion_status DEFAULT 'approved',
  is_order_bump BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_conversions_updated BEFORE UPDATE ON public.conversions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- conversion_items
CREATE TABLE public.conversion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id UUID REFERENCES public.conversions(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  is_order_bump BOOLEAN DEFAULT false,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- conversion_events (audit log)
CREATE TABLE public.conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- webhook_logs
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  platform TEXT,
  raw_payload JSONB,
  status TEXT DEFAULT 'received',
  ignore_reason TEXT,
  event_type TEXT,
  transaction_id TEXT,
  attributed_click_id TEXT,
  is_attributed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  provider public.integration_provider NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  external_account_id TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_integrations_updated BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ad_accounts
CREATE TABLE public.ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE NOT NULL,
  platform public.ad_platform NOT NULL,
  external_account_id TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ad_spend
CREATE TABLE public.ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  ad_account_id UUID REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  campaign_id TEXT,
  campaign_name TEXT,
  adset_name TEXT,
  ad_name TEXT,
  spend NUMERIC(12,2) DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  date DATE NOT NULL,
  platform public.ad_platform NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- daily_metrics
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  smartlink_id UUID REFERENCES public.smartlinks(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.smartlink_variants(id) ON DELETE SET NULL,
  views INT DEFAULT 0,
  conversions INT DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- referral_codes
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  referred_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- commissions
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  period_start DATE,
  period_end DATE,
  status public.payout_status DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- payout_requests
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status public.payout_status DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- notification_settings
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_report_time TEXT DEFAULT '08:00',
  channel public.notification_channel DEFAULT 'email',
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- system_announcements
CREATE TABLE public.system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT now()
);

-- system_announcement_reads
CREATE TABLE public.system_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.system_announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

-- ======================== INDICES ========================

CREATE INDEX idx_clicks_utm_source ON public.clicks(utm_source);
CREATE INDEX idx_clicks_utm_medium ON public.clicks(utm_medium);
CREATE INDEX idx_clicks_utm_campaign ON public.clicks(utm_campaign);
CREATE INDEX idx_clicks_created_at ON public.clicks(created_at);
CREATE INDEX idx_clicks_smartlink_id ON public.clicks(smartlink_id);
CREATE INDEX idx_clicks_account_id ON public.clicks(account_id);

CREATE INDEX idx_conversions_account_id ON public.conversions(account_id);
CREATE INDEX idx_conversions_created_at ON public.conversions(created_at);
CREATE INDEX idx_conversions_product_name ON public.conversions(product_name);

CREATE INDEX idx_ad_spend_campaign_id ON public.ad_spend(campaign_id);
CREATE INDEX idx_ad_spend_date ON public.ad_spend(date);
CREATE INDEX idx_ad_spend_account_id ON public.ad_spend(account_id);
CREATE INDEX idx_ad_spend_platform ON public.ad_spend(platform);

CREATE INDEX idx_daily_metrics_date ON public.daily_metrics(date);
CREATE INDEX idx_daily_metrics_account_id ON public.daily_metrics(account_id);
CREATE INDEX idx_daily_metrics_smartlink_id ON public.daily_metrics(smartlink_id);

CREATE INDEX idx_webhook_logs_account_id ON public.webhook_logs(account_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);

CREATE INDEX idx_smartlinks_account_id ON public.smartlinks(account_id);
CREATE INDEX idx_account_users_user_id ON public.account_users(user_id);
CREATE INDEX idx_account_users_account_id ON public.account_users(account_id);

-- ======================== SECURITY DEFINER FUNCTIONS ========================

-- Get all account_ids a user belongs to (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_account_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(account_id), '{}')
  FROM public.account_users
  WHERE user_id = _user_id;
$$;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ======================== AUTO-CREATE PROFILE + ACCOUNT ON SIGNUP ========================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Create account
  INSERT INTO public.accounts (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha Conta'))
  RETURNING id INTO new_account_id;

  -- Link user to account as owner
  INSERT INTO public.account_users (account_id, user_id, role, accepted_at)
  VALUES (new_account_id, NEW.id, 'owner', now());

  -- Set user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');

  -- Create default usage_limits
  INSERT INTO public.usage_limits (account_id)
  VALUES (new_account_id);

  -- Create default referral code
  INSERT INTO public.referral_codes (account_id, code)
  VALUES (new_account_id, encode(gen_random_bytes(6), 'hex'));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================== RLS POLICIES ========================

-- Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartlink_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_announcement_reads ENABLE ROW LEVEL SECURITY;

-- profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles: users can read their own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- accounts: users can access accounts they belong to
CREATE POLICY "Users can view their accounts" ON public.accounts FOR SELECT TO authenticated
  USING (id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "Users can update their accounts" ON public.accounts FOR UPDATE TO authenticated
  USING (id = ANY(public.get_user_account_ids(auth.uid())));

-- account_users: users can see members of their accounts
CREATE POLICY "Users can view account members" ON public.account_users FOR SELECT TO authenticated
  USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "Owners can insert account members" ON public.account_users FOR INSERT TO authenticated
  WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "Owners can delete account members" ON public.account_users FOR DELETE TO authenticated
  USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- Macro for account_id-based tables: SELECT, INSERT, UPDATE, DELETE
-- subscriptions
CREATE POLICY "sub_select" ON public.subscriptions FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "sub_insert" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "sub_update" ON public.subscriptions FOR UPDATE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- usage_limits
CREATE POLICY "ul_select" ON public.usage_limits FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- dashboards
CREATE POLICY "dash_select" ON public.dashboards FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "dash_insert" ON public.dashboards FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "dash_update" ON public.dashboards FOR UPDATE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "dash_delete" ON public.dashboards FOR DELETE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- products
CREATE POLICY "prod_select" ON public.products FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "prod_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "prod_update" ON public.products FOR UPDATE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "prod_delete" ON public.products FOR DELETE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- product_costs
CREATE POLICY "pc_select" ON public.product_costs FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "pc_insert" ON public.product_costs FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- taxes
CREATE POLICY "tax_select" ON public.taxes FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "tax_insert" ON public.taxes FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "tax_update" ON public.taxes FOR UPDATE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "tax_delete" ON public.taxes FOR DELETE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- pixels
CREATE POLICY "px_select" ON public.pixels FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "px_insert" ON public.pixels FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "px_update" ON public.pixels FOR UPDATE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "px_delete" ON public.pixels FOR DELETE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- smartlinks
CREATE POLICY "sl_select" ON public.smartlinks FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "sl_insert" ON public.smartlinks FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "sl_update" ON public.smartlinks FOR UPDATE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "sl_delete" ON public.smartlinks FOR DELETE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- smartlink_variants
CREATE POLICY "sv_select" ON public.smartlink_variants FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "sv_insert" ON public.smartlink_variants FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "sv_update" ON public.smartlink_variants FOR UPDATE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "sv_delete" ON public.smartlink_variants FOR DELETE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- clicks
CREATE POLICY "click_select" ON public.clicks FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- conversions
CREATE POLICY "conv_select" ON public.conversions FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- conversion_items
CREATE POLICY "ci_select" ON public.conversion_items FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- conversion_events
CREATE POLICY "ce_select" ON public.conversion_events FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- webhook_logs
CREATE POLICY "wl_select" ON public.webhook_logs FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- integrations
CREATE POLICY "int_select" ON public.integrations FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "int_insert" ON public.integrations FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "int_update" ON public.integrations FOR UPDATE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "int_delete" ON public.integrations FOR DELETE TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- ad_accounts
CREATE POLICY "aa_select" ON public.ad_accounts FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "aa_insert" ON public.ad_accounts FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- ad_spend
CREATE POLICY "as_select" ON public.ad_spend FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- daily_metrics
CREATE POLICY "dm_select" ON public.daily_metrics FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- referral_codes
CREATE POLICY "rc_select" ON public.referral_codes FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- referrals
CREATE POLICY "ref_select" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_account_id = ANY(public.get_user_account_ids(auth.uid())) OR referred_account_id = ANY(public.get_user_account_ids(auth.uid())));

-- commissions
CREATE POLICY "comm_select" ON public.commissions FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- payout_requests
CREATE POLICY "pr_select" ON public.payout_requests FOR SELECT TO authenticated USING (account_id = ANY(public.get_user_account_ids(auth.uid())));
CREATE POLICY "pr_insert" ON public.payout_requests FOR INSERT TO authenticated WITH CHECK (account_id = ANY(public.get_user_account_ids(auth.uid())));

-- notification_settings
CREATE POLICY "ns_select" ON public.notification_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ns_insert" ON public.notification_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ns_update" ON public.notification_settings FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- system_announcements: public read
CREATE POLICY "sa_select" ON public.system_announcements FOR SELECT TO authenticated USING (true);

-- system_announcement_reads
CREATE POLICY "sar_select" ON public.system_announcement_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sar_insert" ON public.system_announcement_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
