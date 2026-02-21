import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";

interface Props {
  since: string;
  until: string;
}

export default function GamificationBar({ since, until }: Props) {
  const { data: profile } = useQuery({
    queryKey: ["profile-goal"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("gamification_goal").maybeSingle();
      return data;
    },
  });

  const { data: revenue = 0 } = useQuery({
    queryKey: ["gamification-revenue", since, until],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversions")
        .select("amount")
        .eq("status", "approved")
        .gte("created_at", since)
        .lte("created_at", until);
      return (data || []).reduce((s, c) => s + Number(c.amount), 0);
    },
  });

  const goal = Number(profile?.gamification_goal || 1000000);
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
