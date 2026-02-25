
-- Add project_id to clicks for direct project-level filtering
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Add project_id to conversions for direct project-level filtering
ALTER TABLE public.conversions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Backfill clicks.project_id from smartlinks
UPDATE public.clicks c
SET project_id = s.project_id
FROM public.smartlinks s
WHERE c.smartlink_id = s.id
  AND c.project_id IS NULL
  AND s.project_id IS NOT NULL;

-- Backfill conversions.project_id from smartlinks
UPDATE public.conversions cv
SET project_id = s.project_id
FROM public.smartlinks s
WHERE cv.smartlink_id = s.id
  AND cv.project_id IS NULL
  AND s.project_id IS NOT NULL;

-- Also backfill conversions via clicks if smartlink_id is null but click_id exists
UPDATE public.conversions cv
SET project_id = cl.project_id
FROM public.clicks cl
WHERE cv.click_id = cl.click_id
  AND cv.project_id IS NULL
  AND cl.project_id IS NOT NULL;

-- Create indexes for efficient project-scoped queries
CREATE INDEX IF NOT EXISTS idx_clicks_project_id ON public.clicks(project_id);
CREATE INDEX IF NOT EXISTS idx_conversions_project_id ON public.conversions(project_id);
CREATE INDEX IF NOT EXISTS idx_clicks_project_created ON public.clicks(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversions_project_created ON public.conversions(project_id, created_at);
