
-- Table to persist tour completion per user
CREATE TABLE IF NOT EXISTS public.user_tour_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_id)
);

ALTER TABLE public.user_tour_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own completions"
  ON public.user_tour_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON public.user_tour_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add new limit columns to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_agents integer NOT NULL DEFAULT 1;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_leads integer NOT NULL DEFAULT 100;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_devices integer NOT NULL DEFAULT 1;
