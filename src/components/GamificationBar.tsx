import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import { getFixedGoal } from "@/hooks/useSubscription";
import { useProject } from "@/hooks/useProject";

interface Props {
  since: string;
  until: string;
}

export default function GamificationBar({ since, until }: Props) {
  const { activeProject } = useProject();
  const projectId = activeProject?.id;

  const sinceDate = since.split("T")[0];
  const untilDate = until.split("T")[0];

  // Read from daily_metrics instead of raw conversions
  const { data: revenue = 0 } = useQuery({
    queryKey: ["gamification-revenue", sinceDate, untilDate, projectId],
    queryFn: async () => {
      let q = supabase
        .from("daily_metrics")
        .select("revenue")
        .gte("date", sinceDate)
        .lte("date", untilDate);
      if (projectId) q = (q as any).eq("project_id", projectId);
      const { data } = await q;
      return (data || []).reduce((s, m) => s + Number(m.revenue), 0);
    },
    staleTime: 60000,
    enabled: !!projectId,
  });

  const goal = getFixedGoal(revenue);
  const percent = Math.min((revenue / goal) * 100, 100);
  const remaining = Math.max(goal - revenue, 0);

  return (
    <div className="rounded-xl bg-card border border-border/50 card-shadow p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          <span className="text-sm font-semibold">Meta de Faturamento</span>
        </div>
        <span className="text-xs text-muted-foreground">
          R$ {revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / R$ {goal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <Progress value={percent} className="h-3 mb-2" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{percent.toFixed(1)}% atingido</span>
        <span>Faltam R$ {remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}
