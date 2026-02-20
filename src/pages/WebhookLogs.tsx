import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  approved: "bg-success/20 text-success",
  ignored: "bg-muted text-muted-foreground",
  duplicate: "bg-yellow-500/20 text-yellow-400",
  error: "bg-destructive/20 text-destructive",
  received: "bg-blue-500/20 text-blue-400",
};

export default function WebhookLogs() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [platform, setPlatform] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["webhook-logs", platform],
    queryFn: async () => {
      let q = supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (platform !== "all") q = q.eq("platform", platform);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <DashboardLayout
      title="Webhook Logs"
      subtitle="Histórico de webhooks recebidos"
      actions={
        <div className="flex gap-1">
          {["all", "hotmart", "cakto"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${
                platform === p ? "gradient-bg text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {p === "all" ? "Todos" : p}
            </button>
          ))}
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center text-muted-foreground text-sm">
          Nenhum webhook recebido ainda.
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="w-8" />
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plataforma</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Evento</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Transaction ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Atribuição</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <>
                    <tr
                      key={log.id}
                      className="border-b border-border/20 hover:bg-accent/20 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="px-2 py-3 text-center">
                        {expanded === log.id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs capitalize font-medium">{log.platform}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.event_type || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.transaction_id || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLOR[log.status] || "bg-muted text-muted-foreground")}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.is_attributed ? (
                          <span className="text-xs text-success">✓ Atribuído</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não atribuído</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{log.ignore_reason || "—"}</td>
                    </tr>
                    {expanded === log.id && (
                      <tr key={`${log.id}-exp`} className="border-b border-border/10">
                        <td colSpan={8} className="px-4 py-3 bg-muted/30">
                          <div className="text-xs text-muted-foreground mb-1 font-medium">Payload completo:</div>
                          <pre className="text-xs bg-background/50 rounded p-3 overflow-x-auto max-h-[300px] whitespace-pre-wrap break-all">
                            {JSON.stringify(log.raw_payload, null, 2)}
                          </pre>
                          {log.attributed_click_id && (
                            <div className="mt-2 text-xs">
                              <span className="text-muted-foreground">Click ID atribuído: </span>
                              <span className="font-mono text-primary">{log.attributed_click_id}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
