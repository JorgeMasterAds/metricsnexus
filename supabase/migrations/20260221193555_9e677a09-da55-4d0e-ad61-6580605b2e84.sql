
-- 1. Plan type enum
DO $$ BEGIN
  CREATE TYPE public.plan_type AS ENUM ('bronze', 'prata', 'ouro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type public.plan_type NOT NULL DEFAULT 'bronze',
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Daily metrics table
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  user_id uuid NOT NULL,
  smart_link_id uuid,
  variant_id uuid,
  views integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  UNIQUE(date, user_id, smart_link_id, variant_id)
);

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily metrics"
  ON public.daily_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage daily metrics"
  ON public.daily_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Conversion events audit table
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  event_type text NOT NULL,
  user_id uuid,
  raw_payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversion events"
  ON public.conversion_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage conversion events"
  ON public.conversion_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Redirect error logs table
CREATE TABLE IF NOT EXISTS public.redirect_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id uuid,
  variant_id uuid,
  slug text,
  status_code integer NOT NULL,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.redirect_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage redirect errors"
  ON public.redirect_errors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Add is_suspect to views
ALTER TABLE public.views ADD COLUMN IF NOT EXISTS is_suspect boolean DEFAULT false;

-- 7. Index on utm_medium
CREATE INDEX IF NOT EXISTS idx_views_utm_medium ON public.views(utm_medium);

-- 8. Remove gamification_goal editability concept (keep column for now, we'll use fixed goals in code)
