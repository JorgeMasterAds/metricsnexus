import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { toast } from "@/hooks/use-toast";

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  account_id: string;
  type: "short_text" | "long_text" | "multiple_choice" | "checkbox" | "dropdown" | "linear_scale" | "rating" | "welcome" | "thank_you";
  title: string;
  description: string | null;
  is_required: boolean;
  position: number;
  options: any[];
  config: Record<string, any>;
  scoring: Record<string, any>;
  logic: any[];
  created_at: string;
  updated_at: string;
}

export interface Survey {
  id: string;
  account_id: string;
  project_id: string;
  title: string;
  description: string | null;
  type: "survey" | "quiz";
  slug: string;
  is_published: boolean;
  scoring_enabled: boolean;
  show_results: boolean;
  welcome_message: string | null;
  thank_you_message: string | null;
  theme_color: string;
  created_at: string;
  updated_at: string;
  questions?: SurveyQuestion[];
  _response_count?: number;
}

export function useSurveys() {
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const qc = useQueryClient();

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ["surveys", activeAccountId, activeProjectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("surveys")
        .select("*, survey_questions(id)")
        .eq("account_id", activeAccountId)
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        _response_count: 0,
        questions: undefined,
      })) as Survey[];
    },
    enabled: !!activeAccountId && !!activeProjectId,
  });

  const createSurvey = useMutation({
    mutationFn: async (input: { title: string; type: "survey" | "quiz" }) => {
      const { data, error } = await (supabase as any)
        .from("surveys")
        .insert({
          account_id: activeAccountId,
          project_id: activeProjectId,
          title: input.title,
          type: input.type,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Survey;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surveys"] });
    },
  });

  const updateSurvey = useMutation({
    mutationFn: async (input: Partial<Survey> & { id: string }) => {
      const { id, ...rest } = input;
      // Remove non-db fields
      delete (rest as any)._response_count;
      delete (rest as any).questions;
      delete (rest as any).survey_questions;
      const { error } = await (supabase as any)
        .from("surveys")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surveys"] });
    },
  });

  const deleteSurvey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("surveys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surveys"] });
      toast({ title: "Pesquisa excluída" });
    },
  });

  return { surveys, isLoading, createSurvey, updateSurvey, deleteSurvey };
}

export function useSurveyDetail(surveyId: string | null) {
  const { activeAccountId } = useAccount();
  const qc = useQueryClient();

  const { data: survey, isLoading } = useQuery({
    queryKey: ["survey-detail", surveyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .single();
      if (error) throw error;
      return data as Survey;
    },
    enabled: !!surveyId,
  });

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ["survey-questions", surveyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("survey_questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("position");
      if (error) throw error;
      return (data || []) as SurveyQuestion[];
    },
    enabled: !!surveyId,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["survey-responses", surveyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("survey_responses")
        .select("*, survey_answers(*)")
        .eq("survey_id", surveyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!surveyId,
  });

  const saveQuestion = useMutation({
    mutationFn: async (q: Partial<SurveyQuestion> & { id?: string }) => {
      if (q.id) {
        const { id, ...rest } = q;
        const { error } = await (supabase as any).from("survey_questions").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("survey_questions").insert({
          ...q,
          survey_id: surveyId,
          account_id: activeAccountId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["survey-questions", surveyId] });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await (supabase as any).from("survey_questions").delete().eq("id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["survey-questions", surveyId] });
    },
  });

  const reorderQuestions = useMutation({
    mutationFn: async (ordered: { id: string; position: number }[]) => {
      for (const item of ordered) {
        await (supabase as any).from("survey_questions").update({ position: item.position }).eq("id", item.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["survey-questions", surveyId] });
    },
  });

  return {
    survey,
    questions,
    responses,
    isLoading: isLoading || loadingQuestions,
    saveQuestion,
    deleteQuestion,
    reorderQuestions,
    refetchResponses: () => qc.invalidateQueries({ queryKey: ["survey-responses", surveyId] }),
  };
}
