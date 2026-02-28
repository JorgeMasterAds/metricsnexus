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
import { Copy, User, Camera, Shield, Building2, CreditCard, Users, Plus, Edit2, Mail, UserPlus, Globe, X, ChevronDown, ChevronRight, ChevronLeft, Download, FolderOpen, Filter, Webhook, Gift, ExternalLink, CheckCircle, Clock, DollarSign, Key, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { useAccount } from "@/hooks/useAccount";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateProjectModal from "@/components/CreateProjectModal";
import EditProjectModal from "@/components/EditProjectModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SharedViewManager from "@/components/SharedViewManager";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeAccount, activeAccountId } = useAccount();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "personal";
  const [activeTab, setActiveTab] = useState(tabParam === "organization" ? "personal" : tabParam);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);

  // Deactivation confirmation
  const [deactivateProject, setDeactivateProject] = useState<any>(null);

  useEffect(() => { setActiveTab(tabParam); }, [tabParam]);

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

  const [orgName, setOrgName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

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

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("projects").select("*").eq("account_id", activeAccountId).order("created_at");
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("subscriptions").select("*, plans:plan_id(*)").eq("account_id", activeAccountId).maybeSingle();
      return data;
    },
    enabled: !!activeAccountId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => { const { data } = await (supabase as any).from("plans_public").select("*").order("price"); return data || []; },
  });

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["settings-is-super-admin"],
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return false;
      const { data } = await (supabase as any).from("super_admins").select("id").eq("user_id", u.id).maybeSingle();
      return !!data;
    },
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", activeAccountId],
    queryFn: async () => {
      if (!projects.length) return [];
      const projectIds = projects.map((p: any) => p.id);
      const { data } = await (supabase as any).from("project_users").select("*, profiles:user_id(full_name, avatar_url)").in("project_id", projectIds);
      return data || [];
    },
    enabled: projects.length > 0,
  });

  // Fetch emails for all project members
  const allMemberUserIds = [...new Set(projectMembers.map((m: any) => m.user_id).filter(Boolean))] as string[];
  const { data: memberEmails = [] } = useQuery({
    queryKey: ["member-emails", allMemberUserIds],
    queryFn: async () => {
      if (!allMemberUserIds.length) return [];
      const { data } = await supabase.rpc("get_user_emails_by_ids", { _user_ids: allMemberUserIds });
      return data || [];
    },
    enabled: allMemberUserIds.length > 0,
  });
  const emailMap: Record<string, string> = {};
  for (const e of memberEmails) emailMap[(e as any).user_id] = (e as any).email;

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("account_users").select("*, profiles:user_id(full_name, avatar_url)").eq("account_id", activeAccountId);
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  // Pending invites for current user
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ["settings-pending-invites"],
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return [];
      const { data, error } = await (supabase as any)
        .from("project_users")
        .select("id, project_id, role, invited_at")
        .eq("user_id", u.id)
        .is("accepted_at", null)
        .not("invited_at", "is", null);
      if (error) return [];
      if (!data || data.length === 0) return [];
      const pIds = data.map((d: any) => d.project_id);
      const { data: pNames } = await (supabase as any).from("projects").select("id, name").in("id", pIds);
      const pMap = new Map((pNames || []).map((p: any) => [p.id, p.name]));
      return data.map((inv: any) => ({ ...inv, project_name: pMap.get(inv.project_id) || "Projeto" }));
    },
  });

  const acceptInviteFromProjects = async (invite: any) => {
    try {
      await (supabase as any).from("project_users").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
      toast({ title: "Convite aceito!", description: `Você agora faz parte de "${invite.project_name}"` });
      qc.invalidateQueries({ queryKey: ["settings-pending-invites"] });
      qc.invalidateQueries({ queryKey: ["pending-invites"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const rejectInviteFromProjects = async (invite: any) => {
    try {
      await (supabase as any).from("project_users").delete().eq("id", invite.id);
      toast({ title: "Convite recusado" });
      qc.invalidateQueries({ queryKey: ["settings-pending-invites"] });
      qc.invalidateQueries({ queryKey: ["pending-invites"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  // Referral data
  const { data: referralCode } = useQuery({
    queryKey: ["referral-code", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("referral_codes").select("*").eq("account_id", activeAccountId).eq("is_active", true).maybeSingle();
      return data;
    },
    enabled: !!activeAccountId,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("referrals").select("*, commissions(*)").eq("referrer_account_id", activeAccountId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["commissions", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("commissions").select("*").eq("account_id", activeAccountId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const { data: connectStatus } = useQuery({
    queryKey: ["connect-status", activeAccountId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("connect-onboarding", { body: { action: "status" } });
      if (error) return { status: "not_started" };
      return data;
    },
    enabled: !!activeAccountId,
  });

  const [connectLoading, setConnectLoading] = useState(false);
  const startConnectOnboarding = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-onboarding", { body: { action: "onboard" } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setConnectLoading(false); }
  };

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

  const toggleProject = async (project: any) => {
    if (project.is_active) {
      setDeactivateProject(project);
    } else {
      await (supabase as any).from("projects").update({ is_active: true }).eq("id", project.id);
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["active-projects"] });
      toast({ title: "Projeto ativado!" });
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateProject) return;
    await (supabase as any).from("projects").update({ is_active: false }).eq("id", deactivateProject.id);
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["active-projects"] });
    setDeactivateProject(null);
    toast({ title: "Projeto desativado" });
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

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await (supabase as any).from("project_users").update({ role: newRole }).eq("id", memberId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["project-members"] });
      toast({ title: "Papel atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro ao atualizar papel", description: err.message, variant: "destructive" });
    }
  };

  const tabs = [
    { key: "personal", label: "Dados Pessoais", icon: User },
    { key: "projects", label: "Projetos", icon: FolderOpen },
    { key: "team", label: "Equipe", icon: Users },
    { key: "subscription", label: "Assinatura", icon: CreditCard },
    { key: "referrals", label: "Indicações", icon: Gift },
    { key: "apis", label: "APIs", icon: Key },
  ];

  return (
    <DashboardLayout
      title="Configurações"
      subtitle="Gerencie sua conta e organização"
      actions={<ProductTour {...TOURS.settings} triggerLabel="Tutorial" />}
    >
      <div className="w-full flex items-center mb-6 border-b border-border/50">
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

      {/* ===== PERSONAL ===== */}
      {activeTab === "personal" && (
        <div className="w-full space-y-6">
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

          <Button onClick={saveProfile} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">
            {saving ? "Salvando..." : "Salvar dados pessoais"}
          </Button>
        </div>
      )}




      {/* ===== PROJECTS ===== */}
      {activeTab === "projects" && (
        <div className="w-full space-y-6">
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
                        {p.avatar_url ? <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" /> : p.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          {p.name}
                          <button onClick={() => setEditProject(p)} className="text-muted-foreground hover:text-foreground"><Edit2 className="h-3 w-3" /></button>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleProject(p)}>
                      <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px] cursor-pointer hover:opacity-80 transition-opacity">{p.is_active ? "Ativo" : "Inativo"}</Badge>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pendingInvites.length > 0 && (
            <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />Convites Pendentes
                <Badge className="text-[10px] gradient-bg border-0 text-primary-foreground">{pendingInvites.length}</Badge>
              </h2>
              <div className="space-y-2">
                {pendingInvites.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                    <div>
                      <p className="text-sm font-medium">{inv.project_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Papel: <span className="capitalize">{inv.role}</span>
                        {inv.invited_at && <> · {new Date(inv.invited_at).toLocaleDateString("pt-BR")}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="h-7 text-xs gradient-bg border-0 text-primary-foreground hover:opacity-90" onClick={() => acceptInviteFromProjects(inv)}>Aceitar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => rejectInviteFromProjects(inv)}>Recusar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== SUBSCRIPTION ===== */}
      {activeTab === "subscription" && (
        <div className="w-full space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Plano Atual</h2>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/30 mb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-lg font-bold capitalize">
                    {isSuperAdmin ? "Ouro" : (subscription?.plans?.name || subscription?.plan_type || "Free")}
                  </p>
                  {isSuperAdmin && <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">Super Admin</Badge>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{subscription?.status || "ativo"}</Badge>
                </div>
              </div>
              {isSuperAdmin ? (
                <p className="text-sm text-muted-foreground">Acesso completo</p>
              ) : (
                <p className="text-2xl font-bold">R$ {(subscription?.plans?.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<span className="text-xs text-muted-foreground font-normal">/mês</span></p>
              )}
            </div>

            {/* Plan entitlements */}
            {(() => {
              const plan = subscription?.plans;
              if (!plan && !isSuperAdmin) return null;
              const entitlements = isSuperAdmin
                ? [
                    { label: "Projetos", value: "Ilimitados" },
                    { label: "Smart Links", value: "Ilimitados" },
                    { label: "Webhooks", value: "Ilimitados" },
                    { label: "Usuários", value: "Ilimitados" },
                    { label: "Leads", value: "Ilimitados" },
                    { label: "Agentes IA", value: "Ilimitados" },
                    { label: "Dispositivos", value: "Ilimitados" },
                  ]
                : [
                    { label: "Projetos", value: `${plan?.max_projects ?? 1}` },
                    { label: "Smart Links", value: `${plan?.max_smartlinks ?? 1}` },
                    { label: "Webhooks", value: plan?.max_webhooks === -1 ? "Ilimitados" : `${plan?.max_webhooks ?? 1}` },
                    { label: "Usuários", value: `${plan?.max_users ?? 1}` },
                    { label: "Leads", value: `${plan?.max_leads ?? 100}` },
                    { label: "Agentes IA", value: `${plan?.max_agents ?? 1}` },
                    { label: "Dispositivos", value: `${plan?.max_devices ?? 1}` },
                  ];
              return (
                <div className="rounded-lg border border-border/30 p-4 mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground mb-3">Recursos incluídos no plano</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {entitlements.map((e, i) => (
                      <div key={i} className="text-center p-2.5 rounded-lg bg-muted/30">
                        <p className="text-sm font-bold text-foreground">{e.value}</p>
                        <p className="text-[10px] text-muted-foreground">{e.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {!isSuperAdmin && subscription?.current_period_end && <p className="text-xs text-muted-foreground">Próxima cobrança: {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}</p>}
            <div className="flex gap-2 mt-3">
              {!isSuperAdmin && subscription?.stripe_subscription_id && (
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={async () => {
                  try { const { data, error } = await supabase.functions.invoke("customer-portal"); if (error) throw error; if (data?.url) window.location.href = data.url; } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
                }}><CreditCard className="h-3 w-3" /> Gerenciar assinatura</Button>
              )}
              {!isSuperAdmin && subscription?.stripe_subscription_id && (
                <Button size="sm" variant="ghost" className="text-xs gap-1.5" onClick={async () => {
                  try { const { data, error } = await supabase.functions.invoke("customer-portal"); if (error) throw error; if (data?.url) window.location.href = data.url; } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
                }}>Meio de pagamento</Button>
              )}
            </div>
          </div>

          {!isSuperAdmin && (
            <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
              <h2 className="text-sm font-semibold mb-4">Planos Disponíveis</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map((plan: any) => {
                  const isCurrentPlan = subscription?.plan_id === plan.id || (!subscription?.plan_id && plan.name === 'free');
                  const dynamicFeatures = [
                    `${plan.max_projects ?? 1} ${(plan.max_projects ?? 1) === 1 ? 'projeto' : 'projetos'}`,
                    `${plan.max_smartlinks ?? 1} ${(plan.max_smartlinks ?? 1) === 1 ? 'smartlink' : 'smartlinks'}`,
                    plan.max_webhooks === -1 ? 'Webhooks ilimitados' : `${plan.max_webhooks ?? 1} ${(plan.max_webhooks ?? 1) === 1 ? 'webhook' : 'webhooks'}`,
                    `${plan.max_users ?? 1} ${(plan.max_users ?? 1) === 1 ? 'usuário' : 'usuários'}`,
                  ];
                  const extraFeatures = (plan.features || []).filter((f: string) =>
                    !/^\d+\s+(projeto|smartlink|webhook|usuário)/i.test(f) && !/ilimitado/i.test(f)
                  );
                  const allFeatures = [...dynamicFeatures, ...extraFeatures];
                  return (
                    <div key={plan.id} className={`p-4 rounded-xl border transition-colors ${isCurrentPlan ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"}`}>
                      <h3 className="font-semibold capitalize mb-1">{plan.name}</h3>
                      <p className="text-xl font-bold mb-3">R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<span className="text-xs text-muted-foreground font-normal">/mês</span></p>
                      <ul className="space-y-1">
                        {allFeatures.map((f: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-primary shrink-0" />{f}</li>
                        ))}
                      </ul>
                      {isCurrentPlan ? (
                        <Badge className="mt-3 justify-center text-xs">Plano atual</Badge>
                      ) : plan.name === 'free' ? null : (
                        <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={async () => {
                          if (!plan.stripe_price_id) { toast({ title: "Plano indisponível", variant: "destructive" }); return; }
                          try { const refCode = localStorage.getItem("referral_code"); const { data, error } = await supabase.functions.invoke("create-checkout", { body: { priceId: plan.stripe_price_id, referralCode: refCode || undefined } }); if (error) throw error; if (data?.url) window.location.href = data.url; } catch (err: any) { toast({ title: "Erro ao iniciar checkout", description: err.message, variant: "destructive" }); }
                        }}>{subscription?.stripe_subscription_id ? "Alterar plano" : "Assinar"}</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Shared View Links */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <SharedViewManager />
          </div>
        </div>
      )}

      {/* ===== TEAM ===== */}
      {activeTab === "team" && (
        <div className="w-full space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" />Convidar Membro</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>E-mail do usuário</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="usuario@email.com" /></div>
                <div className="space-y-1.5">
                  <Label>Projeto</Label>
                  <Select value={inviteProjectId} onValueChange={setInviteProjectId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                    <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
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

          {projects.map((project: any) => {
            const members = projectMembers.filter((m: any) => m.project_id === project.id);
            const currentUserIsMember = members.some((m: any) => m.user_id === user?.id);
            const currentUserMember = members.find((m: any) => m.user_id === user?.id);
            const accountRole = teamMembers.find((m: any) => m.user_id === user?.id)?.role;
            const isAccountOwnerOrAdmin = accountRole === "owner" || accountRole === "admin";
            const isCurrentUserAdmin = isAccountOwnerOrAdmin || !currentUserIsMember || currentUserMember?.role === "owner" || currentUserMember?.role === "admin";
            const allMembers = currentUserIsMember ? members : [
              { id: "current-user-owner", user_id: user?.id, role: "owner", accepted_at: new Date().toISOString(), profiles: { full_name: profile?.full_name || user?.email || "Você", avatar_url: profile?.avatar_url } },
              ...members,
            ];
            return (
              <div key={project.id} className="rounded-xl bg-card border border-border/50 card-shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />{project.name}
                    <Badge variant="outline" className="text-[10px] ml-1">{allMembers.length} {allMembers.length === 1 ? "membro" : "membros"}</Badge>
                  </h2>
                </div>
                {allMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum membro neste projeto.</p>
                ) : (
                  <div className="space-y-2">
                    {allMembers.map((m: any) => {
                      const memberEmail = m.user_id === user?.id ? user?.email : emailMap[m.user_id];
                      const canChangeRole = isCurrentUserAdmin && m.id !== "current-user-owner" && m.user_id !== user?.id;
                      return (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold text-muted-foreground">
                              {m.profiles?.avatar_url ? <img src={m.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : m.profiles?.full_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{m.profiles?.full_name || "Usuário"}</p>
                              {memberEmail && <p className="text-[10px] text-muted-foreground">{memberEmail}</p>}
                              <p className="text-[10px] text-muted-foreground">{m.accepted_at ? `Adicionado em ${new Date(m.accepted_at).toLocaleDateString("pt-BR")}` : "Convite pendente"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canChangeRole ? (
                              <Select value={m.role} onValueChange={(val) => updateMemberRole(m.id, val)}>
                                <SelectTrigger className="h-7 w-auto text-[10px] capitalize border-border/50 px-2 gap-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewer">Visualizador</SelectItem>
                                  <SelectItem value="member">Membro</SelectItem>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="owner">Owner</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                            )}
                            {m.id !== "current-user-owner" && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeMember(m.id)}><X className="h-3.5 w-3.5" /></Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        </div>
      )}

      {/* ===== REFERRALS ===== */}
      {activeTab === "referrals" && (
        <div className="w-full space-y-6">
          {/* Referral Link */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Gift className="h-4 w-4 text-primary" />Seu Link de Indicação</h2>
            <p className="text-xs text-muted-foreground mb-4">Compartilhe seu link e ganhe <span className="text-primary font-semibold">50% de comissão</span> sobre a primeira mensalidade de cada indicado.</p>
            {referralCode ? (
              <div className="flex items-center gap-2">
                <Input readOnly value={`${window.location.origin}/auth?ref=${referralCode.code}`} className="text-xs font-mono" />
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${referralCode.code}`);
                  toast({ title: "Link copiado!" });
                }}>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Código de indicação não encontrado.</p>
            )}
          </div>

          {/* Stripe Connect Status */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Conta de Recebimento (Stripe Connect)</h2>
            <p className="text-xs text-muted-foreground mb-4">Para receber comissões automaticamente, conecte sua conta ao Stripe.</p>

            {connectStatus?.status === 'active' ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm text-success font-medium">Conta conectada e ativa</span>
              </div>
            ) : connectStatus?.status === 'pending' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm text-warning font-medium">Cadastro incompleto</span>
                </div>
                <Button onClick={startConnectOnboarding} disabled={connectLoading} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {connectLoading ? "Carregando..." : "Completar cadastro"}
                </Button>
              </div>
            ) : (
              <Button onClick={startConnectOnboarding} disabled={connectLoading} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                {connectLoading ? "Carregando..." : "Conectar conta Stripe"}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-card border border-border/50 card-shadow p-4 text-center">
              <p className="text-2xl font-bold">{referrals.length}</p>
              <p className="text-xs text-muted-foreground">Indicações</p>
            </div>
            <div className="rounded-xl bg-card border border-border/50 card-shadow p-4 text-center">
              <p className="text-2xl font-bold text-success">R$ {commissions.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + Number(c.amount), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">Comissões Pagas</p>
            </div>
            <div className="rounded-xl bg-card border border-border/50 card-shadow p-4 text-center">
              <p className="text-2xl font-bold text-warning">R$ {commissions.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + Number(c.amount), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">Comissões Pendentes</p>
            </div>
          </div>

          {/* Commissions List */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Histórico de Comissões</h2>
            {commissions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma comissão registrada ainda. Compartilhe seu link de indicação para começar a ganhar!</p>
            ) : (
              <div className="space-y-2">
                {commissions.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                    <div>
                      <p className="text-sm font-medium">{c.description || "Comissão de indicação"}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">R$ {Number(c.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      <Badge variant={c.status === 'paid' ? 'default' : 'secondary'} className={`text-[10px] ${c.status === 'paid' ? 'bg-success/20 text-success border-success/30' : ''}`}>
                        {c.status === 'paid' ? 'Pago' : c.status === 'pending' ? 'Pendente' : c.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
      <EditProjectModal open={!!editProject} onOpenChange={(o) => { if (!o) setEditProject(null); }} project={editProject} />

      {/* ===== APIs ===== */}
      {activeTab === "apis" && (
        <ApiKeysTab accountId={activeAccountId} />
      )}

      {/* Deactivation confirmation dialog */}
      <AlertDialog open={!!deactivateProject} onOpenChange={(o) => { if (!o) setDeactivateProject(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar projeto "{deactivateProject?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja desativar este projeto? Os seguintes impactos ocorrerão:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Webhooks deixarão de processar eventos</li>
                <li>Dashboard não computará novos dados</li>
                <li>Smart Links deixarão de funcionar</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">Você pode reativar o projeto a qualquer momento.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function ApiKeysTab({ accountId }: { accountId: string | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["ai-api-keys", accountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ai_api_keys")
        .select("id, provider, label, is_active, created_at")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!accountId,
  });

  const handleAdd = async () => {
    if (!label.trim() || !apiKey.trim()) return;
    const { error } = await (supabase as any).from("ai_api_keys").insert({
      account_id: accountId,
      provider,
      label: label.trim(),
      api_key_encrypted: apiKey.trim(),
    });
    if (error) {
      toast({ title: "Erro", description: "Falha ao salvar API key", variant: "destructive" });
      return;
    }
    toast({ title: "API key adicionada!" });
    qc.invalidateQueries({ queryKey: ["ai-api-keys"] });
    setShowAdd(false);
    setLabel("");
    setApiKey("");
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("ai_api_keys").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ai-api-keys"] });
    toast({ title: "API key removida" });
  };

  return (
    <div className="w-full space-y-6">
      <div className="rounded-xl bg-card border border-border/50 card-shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Chaves de API — Provedores de IA</h3>
            <p className="text-xs text-muted-foreground mt-1">Cadastre suas API keys para OpenAI, Anthropic, Groq e outros.</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Nova API Key
          </Button>
        </div>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-muted-foreground">
          <strong className="text-amber-400">🔒 Segurança:</strong> As chaves são armazenadas no banco e nunca expostas no frontend.
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : keys.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Nenhuma API key cadastrada</div>
        ) : (
          <div className="space-y-2">
            {keys.map((k: any) => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{k.label}</p>
                    <p className="text-xs text-muted-foreground capitalize">{k.provider} • {new Date(k.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(k.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6 space-y-4">
          <h4 className="text-sm font-semibold">Adicionar API Key</h4>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Provedor</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border shadow-lg">
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nome / Identificador</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: OpenAI Produção" />
            </div>
            <div>
              <Label className="text-xs">API Key</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>Salvar</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
