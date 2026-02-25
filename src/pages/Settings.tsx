import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, User, Camera, Shield, Building2, CreditCard, Users, Plus, Edit2, Mail, UserPlus, Globe, X, ChevronDown, ChevronRight, ChevronLeft, Download, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { useAccount } from "@/hooks/useAccount";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateProjectModal from "@/components/CreateProjectModal";
import EditProjectModal from "@/components/EditProjectModal";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeAccount, activeAccountId } = useAccount();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const projectAvatarInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "personal";
  const [activeTab, setActiveTab] = useState(tabParam);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);

  useEffect(() => { setActiveTab(tabParam); }, [tabParam]);

  // --- Auth user & profile ---
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => { const { data } = await supabase.auth.getUser(); return data.user; },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => { const { data } = await (supabase as any).from("profiles").select("*").maybeSingle(); return data; },
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Organization fields
  const [orgName, setOrgName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Team invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");

  useEffect(() => {
    if (profile) { setFullName(profile.full_name || ""); setAvatarUrl(profile.avatar_url || ""); }
    if (user) { setEmail(user.email || ""); }
  }, [profile, user]);

  useEffect(() => {
    if (activeAccount) {
      setOrgName(activeAccount.name || "");
      setCompanyName(activeAccount.company_name || "");
      setDocNumber(activeAccount.cnpj || "");
      setPhone(activeAccount.phone || "");
      setAddress(activeAccount.address || "");
      setResponsibleName(activeAccount.responsible_name || "");
      setAdminEmail(activeAccount.admin_email || "");
    }
  }, [activeAccount]);

  // --- Projects ---
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("projects").select("*").eq("account_id", activeAccountId).order("created_at");
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  // --- Subscription & Plan ---
  const { data: subscription } = useQuery({
    queryKey: ["subscription", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("subscriptions").select("*, plans:plan_id(*)").eq("account_id", activeAccountId).maybeSingle();
      return data;
    },
    enabled: !!activeAccountId,
  });

  const { data: plans = [], refetch: refetchPlans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => { const { data } = await (supabase as any).from("plans").select("*").order("price"); return data || []; },
  });

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await (supabase as any).from("super_admins").select("id").eq("user_id", userData.user.id).maybeSingle();
      return !!data;
    },
  });

  // --- Team members by project ---
  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", activeAccountId],
    queryFn: async () => {
      if (!projects.length) return [];
      const projectIds = projects.map((p: any) => p.id);
      const { data } = await (supabase as any)
        .from("project_users")
        .select("*, profiles:user_id(full_name, avatar_url)")
        .in("project_id", projectIds);
      return data || [];
    },
    enabled: projects.length > 0,
  });

  // --- Account members ---
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("account_users").select("*, profiles:user_id(full_name, avatar_url)").eq("account_id", activeAccountId);
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  // --- Actions ---
  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    await (supabase as any).from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setAvatarUrl(url);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast({ title: "Foto atualizada!" });
  };

  const uploadProjectAvatar = async (file: File, projectId: string) => {
    const ext = file.name.split(".").pop();
    const path = `projects/${projectId}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    await (supabase as any).from("projects").update({ avatar_url: url }).eq("id", projectId);
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast({ title: "Foto do projeto atualizada!" });
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await (supabase as any).from("profiles").update({ full_name: fullName }).eq("id", user?.id);
      if (email !== user?.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email });
        if (emailErr) throw emailErr;
        toast({ title: "Email atualizado", description: "Verifique o novo email para confirmar." });
      }
      toast({ title: "Perfil atualizado!" });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveOrganization = async () => {
    if (!activeAccount) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("accounts").update({
        name: orgName, company_name: companyName, cnpj: docNumber,
        phone, address, responsible_name: responsibleName, admin_email: adminEmail,
      }).eq("id", activeAccount.id);
      if (error) throw error;
      toast({ title: "Organização atualizada!" });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) { toast({ title: "Senhas diferentes", variant: "destructive" }); return; }
    if (newPassword.length < 8) { toast({ title: "A senha deve ter no mínimo 8 caracteres", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleProject = async (id: string, isActive: boolean) => {
    await (supabase as any).from("projects").update({ is_active: !isActive }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  const saveProjectName = async (id: string) => {
    if (!editingProjectName.trim()) return;
    await (supabase as any).from("projects").update({ name: editingProjectName.trim() }).eq("id", id);
    setEditingProjectId(null);
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["sidebar-active-project"] });
    toast({ title: "Nome do projeto atualizado!" });
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !inviteProjectId) {
      toast({ title: "Preencha email e selecione um projeto", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: { email: inviteEmail.trim(), project_id: inviteProjectId, role: inviteRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Membro adicionado!", description: data?.message });
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["project-members"] });
    } catch (err: any) {
      toast({ title: "Erro ao convidar", description: err.message, variant: "destructive" });
    } finally { setInviting(false); }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Remover este membro do projeto?")) return;
    await (supabase as any).from("project_users").delete().eq("id", memberId);
    qc.invalidateQueries({ queryKey: ["project-members"] });
    toast({ title: "Membro removido" });
  };

  const tabs = [
    { key: "personal", label: "Dados Pessoais", icon: User },
    { key: "organization", label: "Minha Organização", icon: Building2 },
    { key: "projects", label: "Projetos", icon: FolderOpen },
    { key: "team", label: "Equipe", icon: Users },
    { key: "webhooks", label: "Webhook Logs", icon: Globe },
    { key: "subscription", label: "Assinatura", icon: CreditCard },
  ];

  return (
    <DashboardLayout
      title="Configurações"
      subtitle="Gerencie sua conta e organização"
      actions={<ProductTour {...TOURS.settings} triggerLabel="Tutorial" />}
    >
      <div className="max-w-4xl w-full mx-auto flex items-center gap-1 mb-6 border-b border-border/50 flex-wrap">
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

      {/* ===== PERSONAL ===== */}
      {activeTab === "personal" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Dados Pessoais</h2>
            <div className="flex items-start gap-6">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full bg-muted/50 border-2 border-border/50 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : <User className="h-8 w-8 text-muted-foreground" />}
                </div>
                <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Alterar senha</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5"><Label>Nova senha</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" /></div>
              <div className="space-y-1.5"><Label>Confirmar</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" /></div>
            </div>
            <Button onClick={changePassword} disabled={saving || !newPassword} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">Alterar senha</Button>
          </div>

          <Button onClick={saveProfile} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 w-full">
            {saving ? "Salvando..." : "Salvar dados pessoais"}
          </Button>
        </div>
      )}

      {/* ===== ORGANIZATION ===== */}
      {activeTab === "organization" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Dados da Organização</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Nome da conta</Label><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Minha Empresa" /></div>
                <div className="space-y-1.5"><Label>Razão Social</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Empresa LTDA" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Documento (CPF ou CNPJ)</Label>
                  <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                </div>
                <div className="space-y-1.5"><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
              </div>
              <div className="space-y-1.5"><Label>Endereço</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, cidade - UF" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Responsável</Label><Input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>E-mail administrativo</Label><Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /></div>
              </div>
            </div>
          </div>

          <Button onClick={saveOrganization} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 w-full">
            {saving ? "Salvando..." : "Salvar organização"}
          </Button>
        </div>
      )}

      {/* ===== PROJECTS ===== */}
      {activeTab === "projects" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2"><FolderOpen className="h-4 w-4 text-primary" />Projetos</h2>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCreateProjectOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Novo Projeto
              </Button>
            </div>
            {projects.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum projeto criado.</p>
            ) : (
              <div className="space-y-2">
                {projects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold text-muted-foreground">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          p.name?.charAt(0)?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {p.name}
                          <button onClick={() => setEditProject(p)} className="text-muted-foreground hover:text-foreground">
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleProject(p.id, p.is_active)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SUBSCRIPTION ===== */}
      {activeTab === "subscription" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Plano Atual</h2>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/30 mb-4">
              <div>
                <p className="text-lg font-bold capitalize">{subscription?.plans?.name || subscription?.plan_type || "Free"}</p>
                <p className="text-xs text-muted-foreground">
                  Status: <Badge variant="outline" className="text-[10px] ml-1 capitalize">{subscription?.status || "ativo"}</Badge>
                </p>
              </div>
              <p className="text-2xl font-bold">
                R$ {(subscription?.plans?.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                <span className="text-xs text-muted-foreground font-normal">/mês</span>
              </p>
            </div>
            {subscription?.current_period_end && (
              <p className="text-xs text-muted-foreground">Próxima cobrança: {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}</p>
            )}
            {subscription?.stripe_subscription_id && (
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke("customer-portal");
                  if (error) throw error;
                  if (data?.url) window.location.href = data.url;
                } catch (err: any) {
                  toast({ title: "Erro", description: err.message, variant: "destructive" });
                }
              }}>
                Gerenciar assinatura
              </Button>
            )}
          </div>

          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Planos Disponíveis</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan: any) => {
                const isCurrentPlan = subscription?.plan_id === plan.id || (!subscription?.plan_id && plan.name === 'free');
                return (
                  <div key={plan.id} className={`p-4 rounded-xl border transition-colors ${isCurrentPlan ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"}`}>
                    <h3 className="font-semibold capitalize mb-1">{plan.name}</h3>
                    <p className="text-xl font-bold mb-3">R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<span className="text-xs text-muted-foreground font-normal">/mês</span></p>
                    <ul className="space-y-1">
                      {(plan.features || []).map((f: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-primary shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan ? (
                      <Badge className="w-full mt-3 justify-center text-xs">Plano atual</Badge>
                    ) : plan.name === 'free' ? null : (
                      <Button size="sm" variant="outline" className="w-full mt-3 text-xs" onClick={async () => {
                        if (!plan.stripe_price_id) {
                          toast({ title: "Plano indisponível", description: "Stripe ainda não configurado para este plano.", variant: "destructive" });
                          return;
                        }
                        try {
                          const { data, error } = await supabase.functions.invoke("create-checkout", {
                            body: { priceId: plan.stripe_price_id },
                          });
                          if (error) throw error;
                          if (data?.url) window.location.href = data.url;
                        } catch (err: any) {
                          toast({ title: "Erro ao iniciar checkout", description: err.message, variant: "destructive" });
                        }
                      }}>
                        {subscription?.stripe_subscription_id ? "Alterar plano" : "Assinar"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {isSuperAdmin && (
            <>
              <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Configuração Stripe (Super Admin)</h2>
                <p className="text-xs text-muted-foreground mb-3">Criar products e prices no Stripe e vincular aos planos.</p>
                <Button size="sm" variant="outline" className="text-xs" onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke("setup-stripe");
                    if (error) throw error;
                    toast({ title: "Stripe configurado!", description: JSON.stringify(data?.results?.map((r: any) => `${r.plan}: ${r.status}`)) });
                    refetchPlans();
                  } catch (err: any) {
                    toast({ title: "Erro", description: err.message, variant: "destructive" });
                  }
                }}>
                  Configurar Stripe
                </Button>
              </div>

              <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
                <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />Configuração do Webhook Stripe</h2>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <p>Configure o webhook no painel do Stripe para receber atualizações de assinatura automaticamente.</p>
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">1. URL do Endpoint:</p>
                    <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3 font-mono text-xs">
                      <span className="text-primary break-all select-all">https://fnpmuffrqrlofjvqytof.supabase.co/functions/v1/stripe-webhook</span>
                      <button onClick={() => { navigator.clipboard.writeText("https://fnpmuffrqrlofjvqytof.supabase.co/functions/v1/stripe-webhook"); toast({ title: "URL copiada!" }); }} className="shrink-0 p-1 rounded hover:bg-accent"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">2. Eventos para selecionar:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li><code className="bg-muted px-1 rounded">checkout.session.completed</code></li>
                      <li><code className="bg-muted px-1 rounded">invoice.paid</code></li>
                      <li><code className="bg-muted px-1 rounded">invoice.payment_failed</code></li>
                      <li><code className="bg-muted px-1 rounded">customer.subscription.deleted</code></li>
                      <li><code className="bg-muted px-1 rounded">customer.subscription.updated</code></li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">3. Webhook Secret:</p>
                    <p>Após criar o webhook no Stripe, copie o <code className="bg-muted px-1 rounded">Signing secret</code> (whsec_...) e adicione como <code className="bg-muted px-1 rounded">STRIPE_WEBHOOK_SECRET</code> nas configurações de secrets do Supabase.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== TEAM ===== */}
      {activeTab === "team" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
          {/* Invite form */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" />Convidar Membro</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>E-mail do usuário</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="usuario@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Projeto</Label>
                  <Select value={inviteProjectId} onValueChange={setInviteProjectId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Papel</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={inviteMember} disabled={inviting || !inviteEmail.trim() || !inviteProjectId} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 w-full">
                    {inviting ? "Convidando..." : "Convidar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Members by project */}
          {projects.map((project: any) => {
            const members = projectMembers.filter((m: any) => m.project_id === project.id);
            return (
              <div key={project.id} className="rounded-xl bg-card border border-border/50 card-shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {project.name}
                    <Badge variant="outline" className="text-[10px] ml-1">{members.length} {members.length === 1 ? "membro" : "membros"}</Badge>
                  </h2>
                </div>
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum membro neste projeto.</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {m.profiles?.avatar_url ? (
                              <img src={m.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              m.profiles?.full_name?.charAt(0)?.toUpperCase() || "?"
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{m.profiles?.full_name || "Usuário"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {m.accepted_at ? `Adicionado em ${new Date(m.accepted_at).toLocaleDateString("pt-BR")}` : "Convite pendente"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeMember(m.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Account-level team */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Membros da Organização</h2>
            {teamMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum membro encontrado.</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold text-muted-foreground">
                        {m.profiles?.avatar_url ? (
                          <img src={m.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          m.profiles?.full_name?.charAt(0)?.toUpperCase() || "?"
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.profiles?.full_name || "Usuário"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {m.accepted_at ? new Date(m.accepted_at).toLocaleDateString("pt-BR") : "Pendente"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== WEBHOOK LOGS ===== */}
      {activeTab === "webhooks" && (
        <div className="max-w-4xl w-full mx-auto">
          <WebhookLogsTab accountId={activeAccountId} />
        </div>
      )}

      <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
      <EditProjectModal open={!!editProject} onOpenChange={(o) => { if (!o) setEditProject(null); }} project={editProject} />
    </DashboardLayout>
  );
}

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

  const { data, isLoading } = useQuery({
    queryKey: ["webhook-logs-tab", accountId, page],
    queryFn: async () => {
      const from = page * WH_PAGE_SIZE;
      const to = from + WH_PAGE_SIZE - 1;
      let q = (supabase as any)
        .from("webhook_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (accountId) q = q.eq("account_id", accountId);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center text-muted-foreground text-sm">
        Nenhum webhook recebido.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{total} registro(s)</span>
      </div>
      <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="w-8" />
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plataforma</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Atribuição</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <React.Fragment key={log.id}>
                  <tr
                    className="border-b border-border/20 hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td className="px-2 py-3 text-center">
                      {expanded === log.id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3"><span className="text-xs capitalize font-medium">{log.platform}</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{log.event_type || "—"}</td>
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
                  {expanded === log.id && (
                    <tr className="border-b border-border/10">
                      <td colSpan={6} className="px-4 py-3 bg-muted/30">
                        <div className="text-xs text-muted-foreground mb-1 font-medium">Payload completo:</div>
                        <pre className="text-xs bg-background/50 rounded p-3 overflow-x-auto max-h-[300px] whitespace-pre-wrap break-all">
                          {JSON.stringify(log.raw_payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
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
    </div>
  );
}
