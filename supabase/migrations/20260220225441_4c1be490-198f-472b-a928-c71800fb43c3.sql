
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  hotmart_webhook_secret TEXT,
  cakto_webhook_secret TEXT,
  integration_platform TEXT DEFAULT 'hotmart',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Smart Links table
CREATE TABLE public.smart_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Variants table
CREATE TABLE public.variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Views table
CREATE TABLE public.views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id TEXT NOT NULL UNIQUE,
  smart_link_id UUID NOT NULL REFERENCES public.smart_links(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.variants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash TEXT,
  user_agent TEXT,
  referer TEXT,
  device TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversions table
CREATE TABLE public.conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  smart_link_id UUID REFERENCES public.smart_links(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.variants(id) ON DELETE SET NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  product_name TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_order_bump BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'approved',
  paid_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook logs table
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  event_type TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  attributed_click_id TEXT,
  attributed_variant_id UUID,
  is_attributed BOOLEAN NOT NULL DEFAULT false,
  ignore_reason TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_views_click_id ON public.views(click_id);
CREATE INDEX idx_views_smart_link_id ON public.views(smart_link_id);
CREATE INDEX idx_views_variant_id ON public.views(variant_id);
CREATE INDEX idx_views_created_at ON public.views(created_at);
CREATE INDEX idx_views_user_id ON public.views(user_id);

CREATE INDEX idx_conversions_click_id ON public.conversions(click_id);
CREATE INDEX idx_conversions_transaction_id ON public.conversions(transaction_id);
CREATE INDEX idx_conversions_smart_link_id ON public.conversions(smart_link_id);
CREATE INDEX idx_conversions_created_at ON public.conversions(created_at);
CREATE INDEX idx_conversions_user_id ON public.conversions(user_id);

CREATE INDEX idx_smart_links_user_id ON public.smart_links(user_id);
CREATE INDEX idx_smart_links_slug ON public.smart_links(slug);
CREATE INDEX idx_variants_smart_link_id ON public.variants(smart_link_id);
CREATE INDEX idx_webhook_logs_user_id ON public.webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);

-- RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Smart Links policies
CREATE POLICY "Users can manage own smart links" ON public.smart_links FOR ALL USING (auth.uid() = user_id);

-- Variants policies
CREATE POLICY "Users can manage own variants" ON public.variants FOR ALL USING (auth.uid() = user_id);

-- Views policies
CREATE POLICY "Users can view own views" ON public.views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert views" ON public.views FOR INSERT WITH CHECK (true);

-- Conversions policies
CREATE POLICY "Users can view own conversions" ON public.conversions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert conversions" ON public.conversions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update conversions" ON public.conversions FOR UPDATE USING (true);

-- Webhook logs policies
CREATE POLICY "Users can view own webhook logs" ON public.webhook_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert webhook logs" ON public.webhook_logs FOR INSERT WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_smart_links_updated_at BEFORE UPDATE ON public.smart_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_variants_updated_at BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
