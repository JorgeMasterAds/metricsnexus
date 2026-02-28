
-- Surveys table (pesquisas e quizzes)
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova Pesquisa',
  description TEXT,
  type TEXT NOT NULL DEFAULT 'survey' CHECK (type IN ('survey', 'quiz')),
  slug TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(6), 'hex'),
  is_published BOOLEAN NOT NULL DEFAULT false,
  scoring_enabled BOOLEAN NOT NULL DEFAULT false,
  show_results BOOLEAN NOT NULL DEFAULT false,
  welcome_message TEXT,
  thank_you_message TEXT DEFAULT 'Obrigado por responder!',
  theme_color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(slug)
);

-- Survey questions
CREATE TABLE public.survey_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'short_text' CHECK (type IN ('short_text', 'long_text', 'multiple_choice', 'checkbox', 'dropdown', 'linear_scale', 'rating', 'welcome', 'thank_you')),
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  options JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  scoring JSONB DEFAULT '{}'::jsonb,
  logic JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Survey responses (one per respondent)
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  respondent_name TEXT,
  respondent_email TEXT,
  total_score INTEGER DEFAULT 0,
  max_possible_score INTEGER DEFAULT 0,
  qualification TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Survey answers (one per question per response)
CREATE TABLE public.survey_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  answer_value TEXT,
  answer_options JSONB DEFAULT '[]'::jsonb,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for surveys
CREATE POLICY "survey_select" ON public.surveys FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "survey_insert" ON public.surveys FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "survey_update" ON public.surveys FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "survey_delete" ON public.surveys FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

-- RLS for questions
CREATE POLICY "sq_select" ON public.survey_questions FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "sq_insert" ON public.survey_questions FOR INSERT WITH CHECK (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "sq_update" ON public.survey_questions FOR UPDATE USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "sq_delete" ON public.survey_questions FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

-- RLS for responses - owners can read, public can insert
CREATE POLICY "sr_select" ON public.survey_responses FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));
CREATE POLICY "sr_delete" ON public.survey_responses FOR DELETE USING (account_id = ANY(get_user_account_ids(auth.uid())));

-- RLS for answers - owners can read
CREATE POLICY "sa_select" ON public.survey_answers FOR SELECT USING (account_id = ANY(get_user_account_ids(auth.uid())));

-- Public insert for responses and answers (anonymous respondents) - via edge function with service role
-- No direct public insert policy needed - edge function handles it

-- Indexes
CREATE INDEX idx_surveys_project ON public.surveys(project_id);
CREATE INDEX idx_surveys_slug ON public.surveys(slug);
CREATE INDEX idx_survey_questions_survey ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_answers_response ON public.survey_answers(response_id);

-- Triggers for updated_at
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_survey_questions_updated_at BEFORE UPDATE ON public.survey_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
