import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/MetricCard";
import { Activity, Clock, AlertTriangle, RefreshCw, Server, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const healthMetrics = [
  { label: "Latência Redirect", value: "32ms", icon: Zap, change: "Média últimas 24h", changeType: "neutral" as const },
  { label: "Taxa de Erro", value: "0.02%", icon: AlertTriangle, change: "3 erros em 14.2K req", changeType: "positive" as const },
  { label: "Webhooks Falha", value: "2", icon: RefreshCw, change: "Em retry automático", changeType: "negative" as const },
  { label: "Fila Pendente", value: "14", icon: Server, change: "Processando normalmente", changeType: "neutral" as const },
];

const recentLogs = [
  { time: "14:32:01", level: "info", message: "Redirect processed: /vsl-main → Variante B (32ms)" },
  { time: "14:31:58", level: "info", message: "Conversion received: click_id=ck_8f2a, value=R$497.00" },
  { time: "14:31:45", level: "warn", message: "Webhook retry #2: endpoint https://hooks.app/notify (timeout)" },
  { time: "14:31:30", level: "info", message: "Bot detected: UA=AhrefsBot, IP=xxx.xxx.xxx.xxx, flagged" },
  { time: "14:31:12", level: "info", message: "Redirect processed: /checkout-price → R$ 497 (28ms)" },
  { time: "14:30:55", level: "error", message: "Webhook failed: endpoint unreachable after 3 retries" },
  { time: "14:30:40", level: "info", message: "Auto-optimization: /vsl-main weights adjusted (50/30/20 → 55/28/17)" },
  { time: "14:30:22", level: "info", message: "Redirect processed: /lp-cold → Social Proof (41ms)" },
];

export default function SystemHealth() {
  return (
    <DashboardLayout
      title="System Health"
      subtitle="Monitoramento e observabilidade do sistema"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {healthMetrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* System status */}
      <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
        <h3 className="text-sm font-semibold mb-4">Status dos Serviços</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "Redirect Engine", status: "operational" },
            { name: "Tracking Engine", status: "operational" },
            { name: "Analytics Engine", status: "operational" },
            { name: "Worker Assíncrono", status: "operational" },
            { name: "API Pública", status: "operational" },
            { name: "Webhook Dispatcher", status: "degraded" },
          ].map((service) => (
            <div key={service.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/20">
              <span className="text-sm">{service.name}</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  service.status === "operational" ? "bg-success" : "bg-warning animate-pulse"
                )} />
                <span className={cn(
                  "text-xs capitalize",
                  service.status === "operational" ? "text-success" : "text-warning"
                )}>
                  {service.status === "operational" ? "OK" : "Degraded"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="text-sm font-semibold">Logs Recentes</h3>
        </div>
        <div className="divide-y divide-border/10">
          {recentLogs.map((log, i) => (
            <div key={i} className="px-5 py-2.5 flex items-start gap-3 text-xs font-mono hover:bg-accent/20 transition-colors">
              <span className="text-muted-foreground shrink-0 w-16">{log.time}</span>
              <span className={cn(
                "shrink-0 w-12 uppercase font-semibold",
                log.level === "info" && "text-info",
                log.level === "warn" && "text-warning",
                log.level === "error" && "text-destructive",
              )}>
                {log.level}
              </span>
              <span className="text-secondary-foreground">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
