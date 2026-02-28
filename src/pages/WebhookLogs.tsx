import DashboardLayout from "@/components/DashboardLayout";
import ChartLoaderInline from "@/components/ChartLoaderInline";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Download, ChevronLeft, Filter, Copy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csv";
import { useAccount } from "@/hooks/useAccount";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_COLOR: Record<string, string> = {
  approved: "bg-success/20 text-success",
  ignored: "bg-muted text-muted-foreground",
  duplicate: "bg-yellow-500/20 text-yellow-400",
  error: "bg-destructive/20 text-destructive",
  received: "bg-blue-500/20 text-blue-400",
  refunded: "bg-orange-500/20 text-orange-400",
  chargedback: "bg-destructive/20 text-destructive",
  canceled: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 50;

export default function WebhookLogs() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [webhookFilter, setWebhookFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const { activeAccountId } = useAccount();

  const since = dateRange.from.toISOString();
  const until = dateRange.to.toISOString();

  // Fetch all projects for the account
  const { data: projects = [] } = useQuery({
    queryKey: ["wh-projects", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("projects")
        .select("id, name")
        .eq("account_id", activeAccountId)
        .order("name");
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  // Fetch webhooks filtered by project if selected
  const { data: webhooks = [] } = useQuery({
    queryKey: ["wh-filter-list", activeAccountId, projectFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("webhooks")
        .select("id, name")
        .eq("account_id", activeAccountId)
        .order("name");
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data } = await q;
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const projectMap = new Map<string, string>(projects.map((p: any) => [p.id, p.name]));
  const webhookMap = new Map<string, string>(webhooks.map((w: any) => [w.id, w.name]));

  const { data, isLoading } = useQuery({
    queryKey: ["webhook-logs", activeAccountId, projectFilter, since, until, page, statusFilter, webhookFilter],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = (supabase as any)
        .from("webhook_logs")
        .select("*", { count: "exact" })
        .eq("account_id", activeAccountId)
        .gte("created_at", since)
        .lte("created_at", until)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (webhookFilter !== "all") q = q.eq("webhook_id", webhookFilter);
      const { data, error, count } = await q;
      if (error) throw error;
      return { logs: data || [], total: count || 0 };
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const retryMutation = useMutation({
    mutationFn: async (log: any) => {
      setRetryingId(log.id);
      const { data: wh } = await (supabase as any)
        .from("webhooks")
        .select("token")
        .eq("id", log.webhook_id)
        .single();
      if (!wh?.token) throw new Error("Webhook não encontrado");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/webhook/${wh.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log.raw_payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Webhook reprocessado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["webhook-logs"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao reprocessar", description: err.message, variant: "destructive" });
    },
    onSettled: () => setRetryingId(null),
  });

  return (
    <DashboardLayout
      title="Webhook Logs"
      subtitle="Histórico de webhooks recebidos (toda a conta)"
      actions={
        <div className="flex items-center gap-2">
          <ProductTour {...TOURS.webhookLogs} />
          <DateFilter value={dateRange} onChange={(v) => { setDateRange(v); setPage(0); }} />
        </div>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filtros:
        </div>
        <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setWebhookFilter("all"); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
            <SelectItem value="duplicate">Duplicate</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="chargedback">Chargedback</SelectItem>
          </SelectContent>
        </Select>
        <Select value={webhookFilter} onValueChange={(v) => { setWebhookFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Webhook" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os webhooks</SelectItem>
            {webhooks.map((w: any) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{total} registro(s)</span>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => exportToCsv(logs.map((l: any) => ({
            data: new Date(l.created_at).toLocaleString("pt-BR"),
            projeto: projectMap.get(l.project_id) || "—",
            webhook: webhookMap.get(l.webhook_id) || "—",
            plataforma: l.platform,
            evento: l.event_type,
            transaction_id: l.transaction_id,
            status: l.status,
            atribuido: l.is_attributed ? "Sim" : "Não",
            motivo: l.ignore_reason,
          })), "webhook-logs")}
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {isLoading ? (
        <ChartLoaderInline text="Carregando logs..." />
      ) : logs.length === 0 ? (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center text-muted-foreground text-sm">
          Nenhum webhook recebido no período.
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="w-8" />
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Projeto</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Webhook</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plataforma</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Evento</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Transaction</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Atribuição</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      expanded={expanded === log.id}
                      onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
                      projectName={projectMap.get(log.project_id) || "—"}
                      webhookName={webhookMap.get(log.webhook_id) || "—"}
                      onRetry={(l) => retryMutation.mutate(l)}
                      isRetrying={retryingId === log.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs gap-1">
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs gap-1">
                  Próxima <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

const RETRYABLE_STATUSES = new Set(["error", "ignored", "duplicate", "canceled", "chargedback"]);

function LogRow({ log, expanded, onToggle, projectName, webhookName, onRetry, isRetrying }: {
  log: any; expanded: boolean; onToggle: () => void; projectName: string; webhookName: string;
  onRetry: (log: any) => void; isRetrying: boolean;
}) {
  const copyJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(log.raw_payload, null, 2));
    toast({ title: "JSON copiado!" });
  };

  return (
    <>
      <tr className="border-b border-border/20 hover:bg-accent/20 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="px-2 py-3 text-center">
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
          {new Date(log.created_at).toLocaleString("pt-BR")}
        </td>
        <td className="px-4 py-3 text-xs font-medium truncate max-w-[120px]">{projectName}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[140px]">{webhookName}</td>
        <td className="px-4 py-3"><span className="text-xs capitalize font-medium">{log.platform}</span></td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{log.event_type || "—"}</td>
        <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[120px]">{log.transaction_id || "—"}</td>
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
      </tr>
      {expanded && (
        <tr className="border-b border-border/10">
          <td colSpan={9} className="px-4 py-3 bg-muted/30">
            {log.ignore_reason && (
              <div className="text-xs mb-2">
                <span className="text-muted-foreground">Motivo: </span>
                <span className="text-foreground">{log.ignore_reason}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-medium">Payload completo:</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={copyJson}>
                <Copy className="h-3 w-3" /> Copiar JSON
              </Button>
              {RETRYABLE_STATUSES.has(log.status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1 text-primary"
                  disabled={isRetrying}
                  onClick={(e) => { e.stopPropagation(); onRetry(log); }}
                >
                  <RotateCcw className={cn("h-3 w-3", isRetrying && "animate-spin")} /> Reprocessar
                </Button>
              )}
            </div>
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
  );
}
