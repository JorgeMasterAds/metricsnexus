
-- Add lead_id column to survey_responses for CRM correlation
ALTER TABLE public.survey_responses ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_survey_responses_lead_id ON public.survey_responses(lead_id);
