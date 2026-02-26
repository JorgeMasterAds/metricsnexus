import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import WebhookManager from "@/components/WebhookManager";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { Webhook, ScrollText, Filter, Download, ChevronDown, ChevronRight, ChevronLeft, FileCode, Plus, Copy, Trash2, ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import { exportToCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Integrations() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "webhooks";
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => { setActiveTab(tabParam); }, [tabParam]);

  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();

  const tabs = [
    { key: "webhooks", label: "Webhooks", icon: Webhook },
    { key: "forms", label: "Formulários", icon: FileCode },
    { key: "logs", label: "Webhook Logs", icon: ScrollText },
  ];

  return (
    <DashboardLayout title="Integrações" subtitle="Gerencie seus webhooks, formulários e integrações">
      <div className="w-full">
        <div className="flex items-center mb-6 border-b border-border/50">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 sm:flex-initial px-2 sm:px-4 py-3 sm:py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px flex items-center justify-center sm:justify-start gap-1.5 whitespace-nowrap",
                activeTab === tab.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              title={tab.label}
            >
              <tab.icon className="h-5 w-5 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "webhooks" && <WebhookManager />}
        {activeTab === "forms" && <FormsTab accountId={activeAccountId} projectId={activeProjectId} />}
        {activeTab === "logs" && <WebhookLogsTab accountId={activeAccountId} />}
      </div>
    </DashboardLayout>
  );
}

/* ─── Forms Tab ─── */

function FormsTab({ accountId, projectId }: { accountId?: string; projectId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState({ name: true, email: true, phone: true });
  const [redirectType, setRedirectType] = useState<"url" | "checkout">("url");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [selectedWebhookId, setSelectedWebhookId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showEmbed, setShowEmbed] = useState<string | null>(null);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);

  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const { data: webhooks = [] } = useQuery({
    queryKey: ["wh-forms-webhooks", accountId, projectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("webhooks")
        .select("id, name, token, platform")
        .eq("account_id", accountId)
        .eq("is_active", true)
        .order("name");
      if (projectId) q = q.eq("project_id", projectId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!accountId,
  });

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["webhook-forms", accountId, projectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("webhook_forms")
        .select("*, webhooks:webhook_id(id, name, token)")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!accountId,
  });

  const resetWizard = () => {
    setStep(1);
    setFormName("");
    setFields({ name: true, email: true, phone: true });
    setRedirectType("url");
    setRedirectUrl("");
    setSelectedWebhookId("");
  };

  const createForm = async () => {
    if (!formName.trim() || !selectedWebhookId || !accountId) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("webhook_forms").insert({
        account_id: accountId,
        project_id: projectId || null,
        webhook_id: selectedWebhookId,
        name: formName.trim(),
        redirect_type: redirectType,
        redirect_url: redirectUrl.trim() || null,
      });
      if (error) throw error;
      toast.success("Formulário criado!");
      resetWizard();
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["webhook-forms"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteForm = async () => {
    if (!deleteFormId) return;
    await (supabase as any).from("webhook_forms").delete().eq("id", deleteFormId);
    qc.invalidateQueries({ queryKey: ["webhook-forms"] });
    toast.success("Formulário excluído");
    setDeleteFormId(null);
  };

  const getFormEndpoint = (token: string) =>
    `https://${supabaseProjectId}.supabase.co/functions/v1/form-submit/${token}`;

  const generateEmbedCode = (form: any) => {
    const token = form.webhooks?.token || "";
    const endpoint = getFormEndpoint(token);
    const redirect = form.redirect_url ? `\n      window.location.href = "${form.redirect_url}";` : `\n      alert("Enviado com sucesso!");`;

    return `<!-- Formulário ${form.name} - Nexus Metrics -->
<form id="nexus-form-${form.id.slice(0, 8)}" style="max-width:400px;font-family:system-ui,sans-serif;">
  <div style="margin-bottom:12px;">
    <label style="display:block;font-size:14px;margin-bottom:4px;font-weight:500;">Nome</label>
    <input type="text" name="name" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
  </div>
  <div style="margin-bottom:12px;">
    <label style="display:block;font-size:14px;margin-bottom:4px;font-weight:500;">Telefone</label>
    <input type="tel" name="phone" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
  </div>
  <div style="margin-bottom:12px;">
    <label style="display:block;font-size:14px;margin-bottom:4px;font-weight:500;">E-mail</label>
    <input type="email" name="email" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
  </div>
  <button type="submit" style="width:100%;padding:12px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
    Enviar
  </button>
</form>
<script>
  document.getElementById("nexus-form-${form.id.slice(0, 8)}").addEventListener("submit", async function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.form_id = "${form.id}";
    try {
      const res = await fetch("${endpoint}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {${redirect}
      } else {
        alert("Erro ao enviar. Tente novamente.");
      }
    } catch {
      alert("Erro de conexão.");
    }
  });
</script>`;
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Formulários de captura</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crie formulários HTML para capturar leads diretamente em suas páginas.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetWizard(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Novo formulário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {step === 1 && "Dados do formulário"}
                {step === 2 && "Campos a coletar"}
                {step === 3 && "Destino após envio"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {step === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do formulário</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Captura Landing Page" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Webhook vinculado</Label>
                    {webhooks.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 rounded-lg border border-border bg-muted/30">
                        Nenhum webhook ativo neste projeto. Crie um webhook primeiro na aba Webhooks.
                      </p>
                    ) : (
                      <Select value={selectedWebhookId} onValueChange={setSelectedWebhookId}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione um webhook" /></SelectTrigger>
                        <SelectContent>
                          {webhooks.map((wh: any) => (
                            <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button onClick={() => setStep(2)} disabled={!formName.trim() || !selectedWebhookId} className="w-full text-xs">
                    Avançar
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <p className="text-xs text-muted-foreground">Quais campos o formulário vai coletar?</p>
                  <div className="space-y-3">
                    {[
                      { key: "name" as const, label: "Nome", required: true },
                      { key: "email" as const, label: "E-mail" },
                      { key: "phone" as const, label: "Telefone" },
                    ].map((f) => (
                      <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={fields[f.key]} disabled={f.required}
                          onCheckedChange={(v) => setFields(prev => ({ ...prev, [f.key]: !!v }))} />
                        {f.label} {f.required && <span className="text-[10px] text-muted-foreground">(obrigatório)</span>}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 text-xs">Voltar</Button>
                    <Button onClick={() => setStep(3)} className="flex-1 text-xs">Avançar</Button>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Após envio, redirecionar para:</Label>
                    <div className="flex gap-2">
                      <button onClick={() => setRedirectType("url")}
                        className={cn("px-3 py-1.5 text-xs rounded-lg transition-colors", redirectType === "url" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent")}>
                        URL personalizada
                      </button>
                      <button onClick={() => setRedirectType("checkout")}
                        className={cn("px-3 py-1.5 text-xs rounded-lg transition-colors", redirectType === "checkout" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent")}>
                        Checkout
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{redirectType === "checkout" ? "URL do Checkout" : "URL de Redirecionamento"}</Label>
                    <Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1 text-xs">Voltar</Button>
                    <Button onClick={createForm} disabled={saving} className="flex-1 text-xs">
                      {saving ? "Criando..." : "Criar Formulário"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {forms.length === 0 ? (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center">
          <FileCode className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum formulário criado neste projeto.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Novo formulário" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form: any) => (
            <div key={form.id} className="rounded-xl bg-card border border-border/50 card-shadow p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{form.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {form.redirect_type === "checkout" ? "→ Checkout" : "→ URL"}
                  </Badge>
                  {form.webhooks?.name && (
                    <span className="text-[10px] text-muted-foreground">via {form.webhooks.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                    onClick={() => setShowEmbed(showEmbed === form.id ? null : form.id)}>
                    <ExternalLink className="h-3 w-3" /> {showEmbed === form.id ? "Fechar" : "Código"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteFormId(form.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {showEmbed === form.id && (
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Textarea
                      readOnly
                      value={generateEmbedCode(form)}
                      className="font-mono text-[10px] h-40 bg-background"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 h-6 text-[10px] gap-1"
                      onClick={() => copy(generateEmbedCode(form))}
                    >
                      <Copy className="h-3 w-3" /> Copiar HTML
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Cole este código em qualquer página HTML para capturar leads automaticamente.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteFormId} onOpenChange={(v) => !v && setDeleteFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteForm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
          <span className="text-xs font-medium text-muted-foreground tracking-wider">Filtros</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-[10px] tracking-wider text-muted-foreground">Período</Label>
            <div className="mt-1"><DateFilter value={dateRange} onChange={(v) => { setDateRange(v); setPage(0); }} /></div>
          </div>
          <div className="min-w-[150px]">
            <Label className="text-[10px] tracking-wider text-muted-foreground">Projeto</Label>
            <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setWebhookFilter("all"); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <Label className="text-[10px] tracking-wider text-muted-foreground">Webhook</Label>
            <Select value={webhookFilter} onValueChange={(v) => { setWebhookFilter(v); setPage(0); }}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {webhooks.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[130px]">
            <Label className="text-[10px] tracking-wider text-muted-foreground">Status</Label>
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
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Projeto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Webhook</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Plataforma</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Atribuição</th>
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
