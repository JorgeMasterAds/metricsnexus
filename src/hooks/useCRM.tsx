import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { toast } from "sonner";

export function useCRM() {
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const qc = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ["crm-leads", activeAccountId, activeProjectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("leads")
        .select("*, lead_tag_assignments(tag_id, lead_tags(id, name, color))")
        .eq("account_id", activeAccountId)
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeAccountId && !!activeProjectId,
    staleTime: 30000,
  });

  const pipelinesQuery = useQuery({
    queryKey: ["crm-pipelines", activeAccountId, activeProjectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("pipelines")
        .select("*, pipeline_product_links(product_id, products:product_id(id, name))")
        .eq("account_id", activeAccountId)
        .eq("project_id", activeProjectId)
        .order("created_at");
      return data || [];
    },
    enabled: !!activeAccountId && !!activeProjectId,
  });

  const stagesQuery = useQuery({
    queryKey: ["crm-stages", activeAccountId, activeProjectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("pipeline_stages")
        .select("*")
        .eq("account_id", activeAccountId)
        .or(`project_id.eq.${activeProjectId},project_id.is.null`)
        .order("position");
      return data || [];
    },
    enabled: !!activeAccountId && !!activeProjectId,
  });

  const tagsQuery = useQuery({
    queryKey: ["crm-tags", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("lead_tags")
        .select("*")
        .eq("account_id", activeAccountId)
        .order("name");
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const productsQuery = useQuery({
    queryKey: ["crm-products", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("products")
        .select("id, name")
        .eq("account_id", activeAccountId)
        .order("name");
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const createLead = useMutation({
    mutationFn: async (lead: { name: string; email?: string; phone?: string; source?: string; stageId?: string }) => {
      const targetStageId = lead.stageId || stagesQuery.data?.[0]?.id || null;
      const { stageId: _, ...rest } = lead;
      const { error } = await (supabase as any).from("leads").insert({
        account_id: activeAccountId,
        project_id: activeProjectId,
        stage_id: targetStageId,
        ...rest,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-leads"] }); toast.success("Lead criado!"); },
    onError: () => toast.error("Erro ao criar lead"),
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await (supabase as any).from("leads").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-leads"] }); },
  });

  const moveLeadToStage = useMutation({
    mutationFn: async ({ leadId, stageId, stageName }: { leadId: string; stageId: string; stageName: string }) => {
      const { error } = await (supabase as any).from("leads").update({ stage_id: stageId }).eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-leads"] }); },
  });

  const createPipeline = useMutation({
    mutationFn: async ({ name, productIds }: { name: string; productIds?: string[] }) => {
      const { data, error } = await (supabase as any).rpc("create_default_pipeline", {
        p_account_id: activeAccountId,
        p_project_id: activeProjectId,
        p_name: name,
      });
      if (error) throw error;
      if (productIds && productIds.length > 0 && data) {
        const links = productIds.map((pid: string) => ({ pipeline_id: data, product_id: pid }));
        await (supabase as any).from("pipeline_product_links").insert(links);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-pipelines"] });
      qc.invalidateQueries({ queryKey: ["crm-stages"] });
      toast.success("Pipeline criado!");
    },
  });

  const deletePipeline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("pipelines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-pipelines"] });
      qc.invalidateQueries({ queryKey: ["crm-stages"] });
      toast.success("Pipeline removido!");
    },
  });

  const createStage = useMutation({
    mutationFn: async ({ name, color, pipelineId }: { name: string; color: string; pipelineId?: string }) => {
      const maxPos = Math.max(0, ...(stagesQuery.data || []).map((s: any) => s.position));
      const { error } = await (supabase as any).from("pipeline_stages").insert({
        account_id: activeAccountId,
        project_id: activeProjectId,
        pipeline_id: pipelineId || null,
        name,
        color,
        position: maxPos + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-stages"] }); toast.success("Etapa criada!"); },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; color?: string; position?: number }) => {
      const { error } = await (supabase as any).from("pipeline_stages").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-stages"] }); },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("pipeline_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-stages"] });
      qc.invalidateQueries({ queryKey: ["crm-leads"] });
      toast.success("Etapa removida!");
    },
  });

  const reorderStages = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const promises = orderedIds.map((id, i) =>
        (supabase as any).from("pipeline_stages").update({ position: i }).eq("id", id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-stages"] }); },
  });

  const addNote = useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("lead_notes").insert({
        lead_id: leadId,
        account_id: activeAccountId,
        user_id: user!.id,
        content,
      });
      if (error) throw error;
      await (supabase as any).from("lead_history").insert({
        lead_id: leadId,
        account_id: activeAccountId,
        action: "note_added",
        details: content.slice(0, 100),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-lead-notes"] });
      qc.invalidateQueries({ queryKey: ["crm-lead-history"] });
      toast.success("Anotação salva!");
    },
  });

  const addTag = useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { error } = await (supabase as any).from("lead_tag_assignments").insert({ lead_id: leadId, tag_id: tagId });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-leads"] }); },
  });

  const removeTag = useMutation({
    mutationFn: async ({ leadId, tagId }: { leadId: string; tagId: string }) => {
      const { error } = await (supabase as any).from("lead_tag_assignments").delete().eq("lead_id", leadId).eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-leads"] }); },
  });

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { error } = await (supabase as any).from("lead_tags").insert({ account_id: activeAccountId, name, color });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-tags"] }); toast.success("Tag criada!"); },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-leads"] }); toast.success("Lead removido!"); },
  });

  return {
    leads: leadsQuery.data || [],
    stages: stagesQuery.data || [],
    tags: tagsQuery.data || [],
    pipelines: pipelinesQuery.data || [],
    products: productsQuery.data || [],
    isLoading: leadsQuery.isLoading,
    createLead,
    updateLead,
    moveLeadToStage,
    createPipeline,
    deletePipeline,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
    addNote,
    addTag,
    removeTag,
    createTag,
    deleteLead,
  };
}

export function useLeadDetail(leadId: string | null) {
  const historyQuery = useQuery({
    queryKey: ["crm-lead-history", leadId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("lead_history")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!leadId,
  });

  const notesQuery = useQuery({
    queryKey: ["crm-lead-notes", leadId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("lead_notes")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!leadId,
  });

  const purchasesQuery = useQuery({
    queryKey: ["crm-lead-purchases", leadId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("lead_purchases")
        .select("*, conversions(*)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!leadId,
  });

  const surveyResponsesQuery = useQuery({
    queryKey: ["crm-lead-surveys", leadId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("survey_responses")
        .select("*, surveys(title, type, slug)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!leadId,
  });

  return {
    history: historyQuery.data || [],
    notes: notesQuery.data || [],
    purchases: purchasesQuery.data || [],
    surveyResponses: surveyResponsesQuery.data || [],
    isLoading: historyQuery.isLoading,
  };
}
