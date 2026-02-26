import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { toast } from "sonner";

export function useAIAgents() {
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const qc = useQueryClient();

  const agentsQuery = useQuery({
    queryKey: ["ai-agents", activeAccountId, activeProjectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ai_agents")
        .select("*")
        .eq("account_id", activeAccountId)
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeAccountId && !!activeProjectId,
  });

  const apiKeysQuery = useQuery({
    queryKey: ["ai-api-keys", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ai_api_keys")
        .select("id, provider, label, is_active, created_at")
        .eq("account_id", activeAccountId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const devicesQuery = useQuery({
    queryKey: ["whatsapp-devices", activeAccountId, activeProjectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("whatsapp_devices")
        .select("*")
        .eq("account_id", activeAccountId)
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeAccountId && !!activeProjectId,
  });

  const logsQuery = useQuery({
    queryKey: ["agent-logs", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("agent_execution_logs")
        .select("*, ai_agents(name)")
        .eq("account_id", activeAccountId)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const createAgent = useMutation({
    mutationFn: async (agent: {
      name: string;
      description?: string;
      trigger_type: string;
      trigger_config?: any;
      ai_config?: any;
      actions?: any[];
    }) => {
      const { data, error } = await (supabase as any).from("ai_agents").insert({
        account_id: activeAccountId,
        project_id: activeProjectId,
        ...agent,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente criado!");
    },
    onError: () => toast.error("Erro ao criar agente"),
  });

  const updateAgent = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await (supabase as any).from("ai_agents").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente atualizado!");
    },
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ai_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente removido!");
    },
  });

  const addApiKey = useMutation({
    mutationFn: async ({ provider, label, apiKey }: { provider: string; label: string; apiKey: string }) => {
      const { error } = await (supabase as any).from("ai_api_keys").insert({
        account_id: activeAccountId,
        provider,
        label,
        api_key_encrypted: apiKey, // In production, encrypt server-side
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-api-keys"] });
      toast.success("API key adicionada!");
    },
  });

  const deleteApiKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ai_api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-api-keys"] });
      toast.success("API key removida!");
    },
  });

  const addDevice = useMutation({
    mutationFn: async ({ instanceName, apiUrl, apiKey }: { instanceName: string; apiUrl: string; apiKey: string }) => {
      const { error } = await (supabase as any).from("whatsapp_devices").insert({
        account_id: activeAccountId,
        project_id: activeProjectId,
        instance_name: instanceName,
        api_url: apiUrl,
        api_key_encrypted: apiKey,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-devices"] });
      toast.success("Dispositivo adicionado!");
    },
  });

  const deleteDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("whatsapp_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-devices"] });
      toast.success("Dispositivo removido!");
    },
  });

  return {
    agents: agentsQuery.data || [],
    apiKeys: apiKeysQuery.data || [],
    devices: devicesQuery.data || [],
    logs: logsQuery.data || [],
    isLoading: agentsQuery.isLoading,
    createAgent,
    updateAgent,
    deleteAgent,
    addApiKey,
    deleteApiKey,
    addDevice,
    deleteDevice,
  };
}
