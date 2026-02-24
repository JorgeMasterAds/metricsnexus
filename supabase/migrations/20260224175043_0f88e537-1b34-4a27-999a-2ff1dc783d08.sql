
-- Table for individual items within a sale (main product + order bumps)
CREATE TABLE public.conversion_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversion_id uuid NOT NULL REFERENCES public.conversions(id) ON DELETE CASCADE,
  user_id uuid,
  project_id uuid REFERENCES public.projects(id),
  product_name text NOT NULL DEFAULT 'Unknown',
  amount numeric NOT NULL DEFAULT 0,
  is_order_bump boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversion_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own conversion items"
  ON public.conversion_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage conversion items"
  ON public.conversion_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_conversion_items_conversion_id ON public.conversion_items(conversion_id);
CREATE INDEX idx_conversion_items_project_id ON public.conversion_items(project_id);
CREATE INDEX idx_conversion_items_user_id ON public.conversion_items(user_id);
