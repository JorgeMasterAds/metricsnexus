import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import WebhookManager from "@/components/WebhookManager";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Webhook, ScrollText, Filter, Download, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import { exportToCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

export default function Integrations() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "webhooks";
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => { setActiveTab(tabParam); }, [tabParam]);

  const { activeAccountId } = useAccount();

  const tabs = [
    { key: "webhooks", label: "Webhooks", icon: Webhook },
    { key: "logs", label: "Webhook Logs", icon: ScrollText },
  ];

  return (
    <DashboardLayout title="Integrações" subtitle="Gerencie seus webhooks e integrações">
      <div className="w-full">
        <div className="flex items-center gap-1 mb-6 border-b border-border/50 overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "webhooks" && <WebhookManager />}
        {activeTab === "logs" && <WebhookLogsTab accountId={activeAccountId} />}
      </div>
    </DashboardLayout>
  );
}

/* ─── Webhook Logs Tab ─── */

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

const WH_PAGE_SIZE = 50;

function WebhookLogsTab({ accountId }: { accountId?: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [webhookFilter, setWebhookFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const since = dateRange.from.toISOString();
  const until = dateRange.to.toISOString();

  const { data: projects = [] } = useQuery({
    queryKey: ["wh-int-projects", accountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("projects").select("id, name").eq("account_id", accountId).order("name");
      return data || [];
    },
    enabled: !!accountId,
  });

  const { data: webhooks = [] } = useQuery({
    queryKey: ["wh-int-webhooks", accountId, projectFilter],
    queryFn: async () => {
      let q = (supabase as any).from("webhooks").select("id, name").eq("account_id", accountId).order("name");
      if (projectFilter !== "all") q = q.eq("project_id", projectFilter);
      const { data } = await q;
      return data || [];
    },
    enabled: !!accountId,
  });

  const projectMap = new Map<string, string>(projects.map((p: any) => [p.id, p.name]));
  const webhookMap = new Map<string, string>(webhooks.map((w: any) => [w.id, w.name]));

  const { data, isLoading } = useQuery({
    queryKey: ["wh-int-logs", accountId, projectFilter, since, until, page, statusFilter, webhookFilter],
    queryFn: async () => {
      const from = page * WH_PAGE_SIZE;
      const to = from + WH_PAGE_SIZE - 1;
      let q = (supabase as any)
        .from("webhook_logs")
        .select("*", { count: "exact" })
        .eq("account_id", accountId)
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
    enabled: !!accountId,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / WH_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Período</Label>
            <div className="mt-1"><DateFilter value={dateRange} onChange={(v) => { setDateRange(v); setPage(0); }} /></div>
          </div>
          <div className="min-w-[150px]">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Projeto</Label>
            <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setWebhookFilter("all"); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Webhook</Label>
            <Select value={webhookFilter} onValueChange={(v) => { setWebhookFilter(v); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {webhooks.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[130px]">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{total} registro(s)</span>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={() => exportToCsv(logs.map((l: any) => ({
              data: new Date(l.created_at).toLocaleString("pt-BR"),
              projeto: projectMap.get(l.project_id) || "—",
              webhook: webhookMap.get(l.webhook_id) || "—",
              plataforma: l.platform,
              evento: l.event_type,
              transaction_id: l.transaction_id,
              status: l.status,
            })), "webhook-logs")}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center text-muted-foreground text-sm">Nenhum webhook recebido no período.</div>
      ) : (
        <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/30">
                <th className="w-8" />
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Projeto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Webhook</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plataforma</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Atribuição</th>
              </tr></thead>
              <tbody>
                {logs.map((log: any) => (
                  <React.Fragment key={log.id}>
                    <tr className="border-b border-border/20 hover:bg-accent/20 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                      <td className="px-2 py-3 text-center">{expanded === log.id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-xs font-medium truncate max-w-[120px]">{projectMap.get(log.project_id) || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[140px]">{webhookMap.get(log.webhook_id) || "—"}</td>
                      <td className="px-4 py-3"><span className="text-xs capitalize font-medium">{log.platform}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.event_type || "—"}</td>
                      <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLOR[log.status] || "bg-muted text-muted-foreground")}>{log.status}</span></td>
                      <td className="px-4 py-3">{log.is_attributed ? <span className="text-xs text-success">✓ Atribuído</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    </tr>
                    {expanded === log.id && (
                      <tr className="border-b border-border/10">
                        <td colSpan={8} className="px-4 py-3 bg-muted/30">
                          {log.ignore_reason && <div className="text-xs mb-2"><span className="text-muted-foreground">Motivo: </span><span className="text-foreground">{log.ignore_reason}</span></div>}
                          <div className="text-xs text-muted-foreground mb-1 font-medium">Payload completo:</div>
                          <pre className="text-xs bg-background/50 rounded p-3 overflow-x-auto max-h-[300px] whitespace-pre-wrap break-all">{JSON.stringify(log.raw_payload, null, 2)}</pre>
                          {log.attributed_click_id && <div className="mt-2 text-xs"><span className="text-muted-foreground">Click ID: </span><span className="font-mono text-primary">{log.attributed_click_id}</span></div>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs gap-1"><ChevronLeft className="h-3.5 w-3.5" /> Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs gap-1">Próxima <ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
