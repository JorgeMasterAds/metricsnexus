import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useActiveProject";

export type ProjectRole = "owner" | "admin" | "member" | "viewer" | null;

/**
 * Returns the current user's role in the active project.
 * - owner/admin: full access (create, edit, delete)
 * - member: can create & edit, but delete requires admin approval
 * - viewer: read-only, cannot create, edit, or delete
 */
export function useProjectRole() {
  const { activeProjectId } = useActiveProject();

  const { data: role, isLoading } = useQuery({
    queryKey: ["project-role", activeProjectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !activeProjectId) return null;

      // Check if super admin first
      const { data: sa } = await (supabase as any)
        .from("super_admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (sa) return "owner" as ProjectRole;

      // Check project_users role
      const { data: pu } = await (supabase as any)
        .from("project_users")
        .select("role")
        .eq("project_id", activeProjectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (pu) return pu.role as ProjectRole;

      // If not in project_users, check account_users (owner/admin of account = owner of project)
      const { data: project } = await (supabase as any)
        .from("projects")
        .select("account_id")
        .eq("id", activeProjectId)
        .maybeSingle();

      if (project) {
        const { data: au } = await (supabase as any)
          .from("account_users")
          .select("role")
          .eq("account_id", project.account_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (au) return au.role as ProjectRole;
      }

      return null;
    },
    enabled: !!activeProjectId,
  });

  const isAdmin = role === "owner" || role === "admin";
  const canCreate = role === "owner" || role === "admin" || role === "member";
  const canEdit = role === "owner" || role === "admin" || role === "member";
  const canDelete = role === "owner" || role === "admin";

  return {
    role: role ?? null,
    isLoading,
    isAdmin,
    canCreate,
    canEdit,
    canDelete,
    isViewer: role === "viewer",
    isMember: role === "member",
  };
}
