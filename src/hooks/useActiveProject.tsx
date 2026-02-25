import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useCallback } from "react";

/**
 * Manages which project is currently "selected" for viewing.
 * This is separate from is_active (which controls whether a project processes events).
 * Selected project ID is stored in query cache under ["selected-project-id"].
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
    enabled: false, // never fetches, only used as cache store
    staleTime: Infinity,
  });

  // Determine the active project: use selection if valid, otherwise first active project
  const validSelection = selectedId && activeProjects.some((p: any) => p.id === selectedId);
  const activeProject = validSelection
    ? activeProjects.find((p: any) => p.id === selectedId)
    : activeProjects[0] || null;

  const selectProject = useCallback((projectId: string) => {
    qc.setQueryData(["selected-project-id", activeAccountId], projectId);
    // Also invalidate dependent queries
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
