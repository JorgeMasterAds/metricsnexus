import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Trophy, Pencil } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";

interface Props {
  since: string;
  until: string;
  goal: number;
  onEditGoal?: () => void;
}

export default function GamificationBar({ since, until, goal, onEditGoal }: Props) {
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();

  const { data: revenue = 0 } = useQuery({
    queryKey: ["gamification-revenue", since, until, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("amount")
        .eq("status", "approved")
        .gte("created_at", since)
        .lte("created_at", until);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { data } = await q;
      return (data || []).reduce((s: number, c: any) => s + Number(c.amount), 0);
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  const percent = goal > 0 ? Math.min((revenue / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - revenue, 0);
  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="rounded-xl bg-card border border-border/50 card-shadow p-4 sm:p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning shrink-0" />
          <span className="text-sm font-semibold">Meta de Faturamento</span>
          {onEditGoal && (
            <button onClick={onEditGoal} className="p-1 rounded hover:bg-accent/50 transition-colors" title="Editar meta">
              <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate">
          {fmt(revenue)} / {fmt(goal)}
        </span>
      </div>
      <Progress value={percent} className="h-3 mb-2" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{percent.toFixed(1)}% atingido</span>
        <span className="truncate ml-2 text-right">Faltam {fmt(remaining)}</span>
      </div>
      {percent >= 100 ? (
        <p className="mt-3 text-sm font-semibold text-center text-primary">
          🎉 Parabéns! Você bateu a meta de faturamento! Resultado incrível!
        </p>
      ) : (
        <p className="mt-3 text-xs text-center text-muted-foreground italic">
          💪 "O sucesso é a soma de pequenos esforços repetidos dia após dia."
        </p>
      )}
    </div>
  );
}
