import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
}

export default function MetricCard({ label, value, change, changeType = "neutral", icon: Icon }: MetricCardProps) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="h-7 w-7 rounded-lg gradient-bg-soft flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
      </div>
      <div className="text-lg font-bold">{value}</div>
      {change && (
        <div className={cn(
          "text-xs mt-1 font-medium",
          changeType === "positive" && "text-success",
          changeType === "negative" && "text-destructive",
          changeType === "neutral" && "text-muted-foreground"
        )}>
          {change}
        </div>
      )}
    </div>
  );
}
