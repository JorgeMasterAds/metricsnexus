import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

export function useActiveProject() {
  const { activeAccountId } = useAccount();

  const { data: activeProject, isLoading } = useQuery({
    queryKey: ["sidebar-active-project", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("projects")
        .select("id, name, avatar_url, is_active")
        .eq("account_id", activeAccountId)
        .eq("is_active", true)
        .maybeSingle();
      if (data) return data;
      // Fallback to first project
      const { data: first } = await (supabase as any)
        .from("projects")
        .select("id, name, avatar_url, is_active")
        .eq("account_id", activeAccountId)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      return first;
    },
    enabled: !!activeAccountId,
  });

  return {
    activeProjectId: activeProject?.id as string | undefined,
    activeProject,
    isLoading,
  };
}
