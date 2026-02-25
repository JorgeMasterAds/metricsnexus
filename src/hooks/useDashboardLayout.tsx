import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProject } from "@/hooks/useActiveProject";

export function useDashboardLayout(page: string, defaultOrder: string[]) {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [order, setOrder] = useState<string[]>(defaultOrder);

  const { data: savedLayout } = useQuery({
    queryKey: ["dashboard-layout", page, activeProjectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("dashboard_layouts")
        .select("layout_json")
        .eq("user_id", user.id)
        .eq("project_id", activeProjectId)
        .eq("page", page)
        .maybeSingle();
      return data?.layout_json as string[] | null;
    },
    enabled: !!activeProjectId,
  });

  useEffect(() => {
    if (savedLayout && Array.isArray(savedLayout) && savedLayout.length > 0) {
      // Merge: keep saved order, append any new sections not in saved
      const merged = [...savedLayout.filter((id: string) => defaultOrder.includes(id))];
      defaultOrder.forEach(id => { if (!merged.includes(id)) merged.push(id); });
      setOrder(merged);
    } else {
      setOrder(defaultOrder);
    }
  }, [savedLayout, defaultOrder.join(",")]);

  const saveMutation = useMutation({
    mutationFn: async (newOrder: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !activeProjectId) return;
      await (supabase as any)
        .from("dashboard_layouts")
        .upsert({
          user_id: user.id,
          project_id: activeProjectId,
          page,
          layout_json: newOrder,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,project_id,page" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layout", page, activeProjectId] });
    },
  });

  const handleReorder = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
  }, []);

  const toggleEdit = useCallback(() => {
    if (editMode) {
      // Saving on exit
      saveMutation.mutate(order);
    }
    setEditMode(prev => !prev);
  }, [editMode, order]);

  return { order, editMode, toggleEdit, handleReorder };
}
