import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useCallback, useEffect } from "react";

const LAST_PROJECT_KEY = "nexus_last_project";

/**
 * Manages which project is currently "selected" for viewing.
 * Persists the last used project in localStorage.
 */
export function useActiveProject() {
  const { activeAccountId } = useAccount();
  const qc = useQueryClient();

  // Fetch all active projects
  const { data: activeProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["active-projects", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("projects")
        .select("id, name, avatar_url, is_active")
        .eq("account_id", activeAccountId)
        .eq("is_active", true)
        .order("created_at");
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  // Get stored selection from cache
  const { data: selectedId } = useQuery({
    queryKey: ["selected-project-id", activeAccountId],
    queryFn: () => null as string | null,
    enabled: false,
    staleTime: Infinity,
  });

  // On mount, restore from localStorage if no cache selection
  useEffect(() => {
    if (!activeAccountId || activeProjects.length === 0) return;
    const cached = qc.getQueryData(["selected-project-id", activeAccountId]);
    if (!cached) {
      const saved = localStorage.getItem(`${LAST_PROJECT_KEY}_${activeAccountId}`);
      if (saved && activeProjects.some((p: any) => p.id === saved)) {
        qc.setQueryData(["selected-project-id", activeAccountId], saved);
      }
    }
  }, [activeAccountId, activeProjects, qc]);

  const validSelection = selectedId && activeProjects.some((p: any) => p.id === selectedId);
  const activeProject = validSelection
    ? activeProjects.find((p: any) => p.id === selectedId)
    : activeProjects[0] || null;

  const selectProject = useCallback((projectId: string) => {
    qc.setQueryData(["selected-project-id", activeAccountId], projectId);
    if (activeAccountId) {
      localStorage.setItem(`${LAST_PROJECT_KEY}_${activeAccountId}`, projectId);
    }
    qc.invalidateQueries({ queryKey: ["sidebar-active-project"] });
  }, [qc, activeAccountId]);

  return {
    activeProjectId: activeProject?.id as string | undefined,
    activeProject,
    activeProjects,
    isLoading: loadingProjects,
    selectProject,
  };
}
