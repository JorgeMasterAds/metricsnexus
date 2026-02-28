import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import WebhookManager from "@/components/WebhookManager";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { Webhook, ScrollText, Filter, Download, ChevronDown, ChevronRight, ChevronLeft, FileCode, Plus, Copy, Trash2, ExternalLink, User, Mail, Phone, Check, Pencil, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  const [redirectUrl, setRedirectUrl] = useState("");
  const [isCheckout, setIsCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEmbed, setShowEmbed] = useState<string | null>(null);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["webhook-forms", accountId, projectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("webhook_forms")
        .select("*")
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
    setRedirectUrl("");
    setIsCheckout(false);
  };

  const createForm = async () => {
    if (!formName.trim() || !accountId) return;
    setSaving(true);
    try {
      // Create internal webhook for this form
      const whToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const { data: whData, error: whError } = await (supabase as any).from("webhooks").insert({
        account_id: accountId,
        project_id: projectId || null,
        name: `Formulário: ${formName.trim()}`,
        token: whToken,
        platform: "form",
        is_active: true,
      }).select("id").single();
      if (whError) throw whError;

      const { error } = await (supabase as any).from("webhook_forms").insert({
        account_id: accountId,
        project_id: projectId || null,
        webhook_id: whData.id,
        name: formName.trim(),
        redirect_type: isCheckout ? "checkout" : "url",
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
    const form = forms.find((f: any) => f.id === deleteFormId);
    if (form?.webhook_id) {
      await (supabase as any).from("webhooks").delete().eq("id", form.webhook_id);
    }
    await (supabase as any).from("webhook_forms").delete().eq("id", deleteFormId);
    qc.invalidateQueries({ queryKey: ["webhook-forms"] });
    toast.success("Formulário excluído");
    setDeleteFormId(null);
  };

  const saveEditForm = async () => {
    if (!editingFormId || !formName.trim()) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("webhook_forms").update({
        name: formName.trim(),
        redirect_type: isCheckout ? "checkout" : "url",
        redirect_url: redirectUrl.trim() || null,
      }).eq("id", editingFormId);
      if (error) throw error;
      toast.success("Formulário atualizado!");
      setEditFormOpen(false);
      setEditingFormId(null);
      resetWizard();
      qc.invalidateQueries({ queryKey: ["webhook-forms"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getFormEndpoint = (formId: string) => {
    const form = forms.find((f: any) => f.id === formId);
    // We need the webhook token - query it
    return `https://${supabaseProjectId}.supabase.co/functions/v1/form-submit`;
  };

  const generateEmbedCode = (form: any) => {
    const endpoint = `https://${supabaseProjectId}.supabase.co/functions/v1/form-submit`;
    const redirect = form.redirect_url
      ? (isCheckout
        ? `\n      const url = new URL("${form.redirect_url}");\n      url.searchParams.set("name", body.name || "");\n      url.searchParams.set("email", body.email || "");\n      url.searchParams.set("phone", body.phone || "");\n      window.location.href = url.toString();`
        : `\n      window.location.href = "${form.redirect_url}";`)
      : `\n      alert("Enviado com sucesso!");`;

    return `<!-- Formulário ${form.name} - Nexus Metrics -->
<form id="nexus-form-${form.id.slice(0, 8)}" style="max-width:400px;font-family:system-ui,sans-serif;">
${fields.name ? `  <div style="margin-bottom:12px;">
    <label style="display:block;font-size:14px;margin-bottom:4px;font-weight:500;">Nome</label>
    <input type="text" name="name" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
  </div>` : ""}
${fields.email ? `  <div style="margin-bottom:12px;">
    <label style="display:block;font-size:14px;margin-bottom:4px;font-weight:500;">E-mail</label>
    <input type="email" name="email" required style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
  </div>` : ""}
${fields.phone ? `  <div style="margin-bottom:12px;">
    <label style="display:block;font-size:14px;margin-bottom:4px;font-weight:500;">Telefone</label>
    <input type="tel" name="phone" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
  </div>` : ""}
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
    body.webhook_id = "${form.webhook_id}";
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm">Configuração de formulário</DialogTitle>
            </DialogHeader>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-0 py-2">
              <StepIndicator step={1} current={step} label="Campos do formulário" />
              <div className="w-16 h-px bg-border" />
              <StepIndicator step={2} current={step} label="URL de redirecionamento" />
              <div className="w-16 h-px bg-border" />
              <StepIndicator step={3} current={step} label="Código" />
            </div>

            <div className="space-y-4 pt-2">
              {step === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do formulário</Label>
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Captura Landing Page" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ative os interruptores abaixo de acordo com os campos que deseja em seu formulário.
                  </p>
                  <div className="space-y-2">
                    {[
                      { key: "name" as const, label: "Campo do nome", desc: "Captura o nome completo do usuário", icon: User, required: true },
                      { key: "email" as const, label: "Campo E-mail", desc: "Captura o endereço de e-mail", icon: Mail },
                      { key: "phone" as const, label: "Campo número", desc: "Captura o número de telefone", icon: Phone },
                    ].map((f) => (
                      <div key={f.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <f.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{f.label}</p>
                            <p className="text-xs text-muted-foreground">{f.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={fields[f.key]}
                          disabled={f.required}
                          onCheckedChange={(v) => setFields(prev => ({ ...prev, [f.key]: !!v }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)} disabled={!formName.trim()} className="text-xs">
                      Avançar
                    </Button>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Insira o URL para que o lead será redirecionado após preencher o formulário.
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">URL de redirecionamento</Label>
                    <Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="rounded-lg border border-border p-4 space-y-2">
                    <p className="text-xs font-medium">O link informado como destino é um checkout?</p>
                    <p className="text-[10px] text-muted-foreground">
                      Se marcado como "Sim", o sistema irá adicionar automaticamente parâmetros GET (UTM name, email, phone) ao URL de redirecionamento para pré-preencher informações no checkout.
                    </p>
                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={isCheckout} onCheckedChange={() => setIsCheckout(true)} /> Sim
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={!isCheckout} onCheckedChange={() => setIsCheckout(false)} /> Não
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)} className="text-xs">Voltar</Button>
                    <Button onClick={createForm} disabled={saving} className="text-xs">
                      {saving ? "Criando..." : "Ver HTML gerado"}
                    </Button>
                  </div>
                </>
              )}
              {step === 3 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Formulário criado! Veja o código na lista abaixo.
                </p>
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
                    {form.redirect_type === "checkout" ? "→ Checkout" : form.redirect_url ? "→ URL" : "Sem redirecionamento"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFormName(form.name);
                      setRedirectUrl(form.redirect_url || "");
                      setIsCheckout(form.redirect_type === "checkout");
                      setEditingFormId(form.id);
                      setEditFormOpen(true);
                    }}
                    title="Editar formulário"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
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

      {/* Edit Form Dialog */}
      <Dialog open={editFormOpen} onOpenChange={(v) => { if (!v) { setEditFormOpen(false); setEditingFormId(null); resetWizard(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Editar formulário</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do formulário</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL de redirecionamento</Label>
              <Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={isCheckout} onCheckedChange={(v) => setIsCheckout(!!v)} />
              <span className="text-xs">Link é um checkout (adicionar UTMs automaticamente)</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditFormOpen(false); resetWizard(); }}>Cancelar</Button>
              <Button size="sm" onClick={saveEditForm} disabled={saving || !formName.trim()}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteFormId} onOpenChange={(v) => !v && setDeleteFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível. O webhook interno também será removido.</AlertDialogDescription>
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

function StepIndicator({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold",
        done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {done ? <Check className="h-3 w-3" /> : step}
      </div>
      <span className={cn("text-[10px] font-medium hidden sm:inline", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
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
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const RETRYABLE = new Set(["error", "ignored", "duplicate", "canceled", "chargedback"]);

  const retryMutation = useMutation({
    mutationFn: async (log: any) => {
      setRetryingId(log.id);
      const { data: wh } = await (supabase as any).from("webhooks").select("token").eq("id", log.webhook_id).single();
      if (!wh?.token) throw new Error("Webhook não encontrado");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/webhook/${wh.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-reprocess-log-id": log.id },
        body: JSON.stringify(log.raw_payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Webhook reprocessado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["wh-int-logs"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao reprocessar: " + err.message);
    },
    onSettled: () => setRetryingId(null),
  });

  const copyJson = (log: any) => {
    navigator.clipboard.writeText(JSON.stringify(log.raw_payload, null, 2));
    toast.success("JSON copiado!");
  };

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
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground font-medium">Payload completo:</span>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); copyJson(log); }}>
                              <Copy className="h-3 w-3" /> Copiar JSON
                            </Button>
                            {RETRYABLE.has(log.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1 text-primary"
                                disabled={retryingId === log.id}
                                onClick={(e) => { e.stopPropagation(); retryMutation.mutate(log); }}
                              >
                                <RotateCcw className={cn("h-3 w-3", retryingId === log.id && "animate-spin")} /> Reprocessar
                              </Button>
                            )}
                          </div>
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
