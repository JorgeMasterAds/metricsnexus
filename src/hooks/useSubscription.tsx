import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";

export const FIXED_GOALS = [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000];

export function getFixedGoal(currentRevenue: number): number {
  for (const goal of FIXED_GOALS) {
    if (goal > currentRevenue) return goal;
  }
  return FIXED_GOALS[FIXED_GOALS.length - 1];
}

export function useUsageLimits() {
  const { activeAccountId } = useAccount();

  const { data: limits } = useQuery({
    queryKey: ["usage-limits", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("usage_limits")
        .select("*")
        .eq("account_id", activeAccountId)
        .maybeSingle();
      return data;
    },
    enabled: !!activeAccountId,
  });

  return {
    maxProjects: limits?.max_projects ?? 1,
    maxSmartlinks: limits?.max_smartlinks ?? 1,
    maxWebhooks: limits?.max_webhooks ?? 1,
    maxUsers: limits?.max_users ?? 1,
    maxDashboards: limits?.max_dashboards ?? 5,
  };
}

// Keep backward-compatible exports for existing code
export const MAX_SMART_LINKS = 25;
export const MAX_USERS = 10;
