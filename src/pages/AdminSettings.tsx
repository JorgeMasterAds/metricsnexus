import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Copy, Globe, Settings, Users, Webhook, Sliders, UserPlus, Trash2, CreditCard, Package, Megaphone, Plus, Edit2, Check, X, ImagePlus, Search, ChevronDown, ChevronRight, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "users";
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => { setActiveTab(tabParam); }, [tabParam]);

  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoting, setPromoting] = useState(false);

  const { data: isSuperAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-super-admin-check"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await (supabase as any).from("super_admins").select("id").eq("user_id", userData.user.id).maybeSingle();
      return !!data;
    },
  });

  const { data: plans = [], refetch: refetchPlans } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("plans").select("*").order("price");
      return data || [];
    },
    enabled: !!isSuperAdmin,
  });

  const { data: superAdmins = [], refetch: refetchAdmins } = useQuery({
    queryKey: ["super-admins-list"],
    queryFn: async () => {
      const { data: saList } = await (supabase as any).from("super_admins").select("id, user_id, created_at");
      if (!saList || saList.length === 0) return [];
      const userIds = saList.map((sa: any) => sa.user_id);
      // Fetch names
      const { data: profiles } = await (supabase as any).from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
      // Fetch emails via RPC
      const { data: emails } = await (supabase as any).rpc("get_user_emails_by_ids", { _user_ids: userIds });
      const emailMap = new Map((emails || []).map((e: any) => [e.user_id, e.email]));
      return saList.map((sa: any) => ({
        ...sa,
        name: profileMap.get(sa.user_id) || "Sem nome",
        email: emailMap.get(sa.user_id) || "",
      }));
    },
    enabled: !!isSuperAdmin,
  });

  const { data: globalLimits } = useQuery({
    queryKey: ["admin-global-limits"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("platform_settings").select("*").maybeSingle();
      return data;
    },
    enabled: !!isSuperAdmin,
  });

  const [limits, setLimits] = useState({
    max_accounts: 1000,
    max_free_users: 100,
    log_retention_days: 90,
  });

  useEffect(() => {
    if (globalLimits) {
      setLimits({
        max_accounts: globalLimits.max_accounts ?? 1000,
        max_free_users: globalLimits.max_free_users ?? 100,
        log_retention_days: globalLimits.log_retention_days ?? 90,
      });
    }
  }, [globalLimits]);

  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ max_projects: 0, max_smartlinks: 0, max_webhooks: 0, max_users: 0, max_agents: 0, max_leads: 0, max_devices: 0 });

  const saveLimits = async () => {
    const { error } = await (supabase as any)
      .from("platform_settings")
      .upsert({ id: "global", ...limits, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Limites globais salvos!" });
    qc.invalidateQueries({ queryKey: ["admin-global-limits"] });
  };

  const savePlanLimits = async () => {
    if (!editingPlan) return;
    const { error } = await (supabase as any).from("plans").update({
      max_projects: planForm.max_projects,
      max_smartlinks: planForm.max_smartlinks,
      max_webhooks: planForm.max_webhooks,
      max_users: planForm.max_users,
      max_agents: planForm.max_agents,
      max_leads: planForm.max_leads,
      max_devices: planForm.max_devices,
    }).eq("id", editingPlan.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Limites do plano ${editingPlan.name} atualizados!` });
    setEditingPlan(null);
    refetchPlans();
  };

  const promoteToSuperAdmin = async () => {
    if (!promoteEmail.trim()) return;
    setPromoting(true);
    try {
      const { data: userId, error: findErr } = await (supabase as any).rpc("find_user_id_by_email", { _email: promoteEmail.trim() });
      if (findErr || !userId) throw new Error("Usuário não encontrado com este email.");
      const { error } = await (supabase as any).from("super_admins").insert({ user_id: userId });
      if (error) throw error;
      toast({ title: "Super Admin promovido!" });
      setPromoteEmail("");
      refetchAdmins();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setPromoting(false); }
  };

  const [removingSuperAdminId, setRemovingSuperAdminId] = useState<string | null>(null);

  const confirmRemoveSuperAdmin = async () => {
    if (!removingSuperAdminId) return;
    const { error } = await (supabase as any).from("super_admins").delete().eq("id", removingSuperAdminId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Super Admin removido" });
    setRemovingSuperAdminId(null);
    refetchAdmins();
  };

  const removeSuperAdmin = async (id: string) => {
    setRemovingSuperAdminId(id);
  };

  const [loginBgUrl, setLoginBgUrl] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementVersion, setAnnouncementVersion] = useState("");
  const [announcementCoverFile, setAnnouncementCoverFile] = useState<File | null>(null);
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [editAnnouncementTitle, setEditAnnouncementTitle] = useState("");
  const [editAnnouncementBody, setEditAnnouncementBody] = useState("");
  const [editAnnouncementVersion, setEditAnnouncementVersion] = useState("");
  const [editAnnouncementCoverFile, setEditAnnouncementCoverFile] = useState<File | null>(null);

  const { data: announcements = [], refetch: refetchAnnouncements } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("system_announcements").select("*").order("published_at", { ascending: false });
      return data || [];
    },
    enabled: !!isSuperAdmin,
  });

  const uploadCoverImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `covers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("announcement-covers").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return null; }
    const { data: urlData } = supabase.storage.from("announcement-covers").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const publishAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    setPublishingAnnouncement(true);
    try {
      let coverUrl: string | null = null;
      if (announcementCoverFile) {
        coverUrl = await uploadCoverImage(announcementCoverFile);
      }
      const { error } = await (supabase as any).from("system_announcements").insert({
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        version: announcementVersion.trim() || null,
        cover_image_url: coverUrl,
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: "Novidade publicada!" });
      setAnnouncementTitle("");
      setAnnouncementBody("");
      setAnnouncementVersion("");
      setAnnouncementCoverFile(null);
      refetchAnnouncements();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setPublishingAnnouncement(false); }
  };

  const updateAnnouncement = async () => {
    if (!editingAnnouncement) return;
    let coverUrl = editingAnnouncement.cover_image_url;
    if (editAnnouncementCoverFile) {
      const uploaded = await uploadCoverImage(editAnnouncementCoverFile);
      if (uploaded) coverUrl = uploaded;
    }
    const { error } = await (supabase as any).from("system_announcements").update({
      title: editAnnouncementTitle.trim(),
      body: editAnnouncementBody.trim(),
      version: editAnnouncementVersion.trim() || null,
      cover_image_url: coverUrl,
    }).eq("id", editingAnnouncement.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Novidade atualizada!" });
    setEditingAnnouncement(null);
    setEditAnnouncementCoverFile(null);
    refetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Excluir esta novidade?")) return;
    const { error } = await (supabase as any).from("system_announcements").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Novidade excluída" });
    refetchAnnouncements();
  };

  if (checkingAdmin) {
    return (
      <DashboardLayout title="Administração" subtitle="Configurações administrativas">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Administração" subtitle="Acesso restrito">
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-2">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground text-sm">Acesso restrito a administradores do sistema.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { key: "users", label: "Usuários", icon: Users },
    { key: "novidades", label: "Novidades", icon: Megaphone },
    { key: "platform", label: "Plataforma", icon: Globe },
    { key: "plans", label: "Planos", icon: Package },
    { key: "limits", label: "Limites Globais", icon: Sliders },
    { key: "superadmins", label: "Super Admins", icon: Shield },
    { key: "stripe", label: "Configuração Stripe", icon: Settings },
    { key: "webhook-stripe", label: "Webhook Stripe", icon: Webhook },
  ];

  const fmtNum = (n: number) => n.toLocaleString("pt-BR");

  return (
    <DashboardLayout title="Administração" subtitle="Configurações do sistema (Super Admin)">
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

      {activeTab === "novidades" && (
        <div className="w-full space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />Publicar Novidade
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Título</Label>
                  <Input value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} placeholder="Título da novidade" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Versão (opcional)</Label>
                  <Input value={announcementVersion} onChange={e => setAnnouncementVersion(e.target.value)} placeholder="Ex: v2.1.0" className="text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Corpo</Label>
                <Textarea value={announcementBody} onChange={e => setAnnouncementBody(e.target.value)} placeholder="Descreva a novidade..." className="text-xs min-h-[100px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Imagem de capa (opcional)</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-colors text-xs text-muted-foreground">
                    <ImagePlus className="h-4 w-4" />
                    {announcementCoverFile ? announcementCoverFile.name : "Selecionar imagem"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => setAnnouncementCoverFile(e.target.files?.[0] || null)} />
                  </label>
                  {announcementCoverFile && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => setAnnouncementCoverFile(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <Button size="sm" className="gradient-bg border-0 text-primary-foreground text-xs" onClick={publishAnnouncement} disabled={publishingAnnouncement || !announcementTitle.trim() || !announcementBody.trim()}>
                {publishingAnnouncement ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />Novidades Publicadas
            </h2>
            <div className="space-y-3">
              {announcements.map((a: any) => (
                <div key={a.id} className="p-4 rounded-lg bg-secondary/50 border border-border/30">
                  {editingAnnouncement?.id === a.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input value={editAnnouncementTitle} onChange={e => setEditAnnouncementTitle(e.target.value)} className="text-xs" placeholder="Título" />
                        <Input value={editAnnouncementVersion} onChange={e => setEditAnnouncementVersion(e.target.value)} className="text-xs" placeholder="Versão (opcional)" />
                      </div>
                      <Textarea value={editAnnouncementBody} onChange={e => setEditAnnouncementBody(e.target.value)} className="text-xs min-h-[80px]" />
                      <div className="space-y-1.5">
                        <Label className="text-xs">Imagem de capa</Label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-colors text-xs text-muted-foreground">
                            <ImagePlus className="h-4 w-4" />
                            {editAnnouncementCoverFile ? editAnnouncementCoverFile.name : (editingAnnouncement.cover_image_url ? "Trocar imagem" : "Selecionar imagem")}
                            <input type="file" accept="image/*" className="hidden" onChange={e => setEditAnnouncementCoverFile(e.target.files?.[0] || null)} />
                          </label>
                        </div>
                        {editingAnnouncement.cover_image_url && !editAnnouncementCoverFile && (
                          <img src={editingAnnouncement.cover_image_url} alt="" className="h-16 rounded-lg object-cover mt-1" />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gradient-bg border-0 text-primary-foreground text-xs gap-1" onClick={updateAnnouncement}>
                          <Check className="h-3 w-3" /> Salvar
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setEditingAnnouncement(null); setEditAnnouncementCoverFile(null); }}>
                          <X className="h-3 w-3" /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {a.cover_image_url && (
                        <img src={a.cover_image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-3" />
                      )}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold flex items-center gap-2">
                            {a.title}
                            {a.version && <Badge variant="outline" className="text-[10px]">{a.version}</Badge>}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{new Date(a.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => {
                            setEditingAnnouncement(a);
                            setEditAnnouncementTitle(a.title);
                            setEditAnnouncementBody(a.body);
                            setEditAnnouncementVersion(a.version || "");
                            setEditAnnouncementCoverFile(null);
                          }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteAnnouncement(a.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{a.body}</p>
                    </>
                  )}
                </div>
              ))}
              {announcements.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma novidade publicada.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && <AdminUsersTab />}

      {activeTab === "platform" && (
        <div className="w-full space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />Configurações da Plataforma
            </h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Imagem de fundo da tela de login</Label>
                <p className="text-[10px] text-muted-foreground">Insira a URL da imagem que aparecerá no lado direito da tela de login.</p>
                <Input value={loginBgUrl} onChange={(e) => setLoginBgUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="text-xs" />
              </div>
              <Button size="sm" className="gradient-bg border-0 text-primary-foreground hover:opacity-90 text-xs" onClick={async () => {
                const { error } = await (supabase as any).from("platform_settings").upsert({ id: "global", login_bg_url: loginBgUrl, updated_at: new Date().toISOString() }, { onConflict: "id" });
                if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
                toast({ title: "Imagem de fundo atualizada!" });
              }}>Salvar imagem de fundo</Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "plans" && (
        <div className="w-full space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />Limites por Plano
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Edite os limites de cada plano. Alterações aqui afetam novas assinaturas e upgrades.</p>
            <div className="space-y-3">
              {plans.map((plan: any) => (
                <div key={plan.id} className="p-4 rounded-lg bg-secondary/50 border border-border/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold capitalize">{plan.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                        {plan.stripe_price_id ? " · ✓ Stripe" : ""}
                      </p>
                    </div>
                    {editingPlan?.id === plan.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditingPlan(null)}>Cancelar</Button>
                        <Button size="sm" className="gradient-bg border-0 text-primary-foreground text-xs" onClick={savePlanLimits}>Salvar</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                        setEditingPlan(plan);
                        setPlanForm({ max_projects: plan.max_projects, max_smartlinks: plan.max_smartlinks, max_webhooks: plan.max_webhooks, max_users: plan.max_users, max_agents: plan.max_agents ?? 0, max_leads: plan.max_leads ?? 0, max_devices: plan.max_devices ?? 0 });
                      }}>Editar limites</Button>
                    )}
                  </div>
                  {editingPlan?.id === plan.id ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1"><Label className="text-[10px]">Projetos</Label><Input type="number" value={planForm.max_projects} onChange={e => setPlanForm({ ...planForm, max_projects: Number(e.target.value) })} className="text-xs h-8" /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Smart Links</Label><Input type="number" value={planForm.max_smartlinks} onChange={e => setPlanForm({ ...planForm, max_smartlinks: Number(e.target.value) })} className="text-xs h-8" /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Webhooks</Label><Input type="number" value={planForm.max_webhooks} onChange={e => setPlanForm({ ...planForm, max_webhooks: Number(e.target.value) })} className="text-xs h-8" /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Usuários</Label><Input type="number" value={planForm.max_users} onChange={e => setPlanForm({ ...planForm, max_users: Number(e.target.value) })} className="text-xs h-8" /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Agentes IA</Label><Input type="number" value={planForm.max_agents} onChange={e => setPlanForm({ ...planForm, max_agents: Number(e.target.value) })} className="text-xs h-8" /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Leads</Label><Input type="number" value={planForm.max_leads} onChange={e => setPlanForm({ ...planForm, max_leads: Number(e.target.value) })} className="text-xs h-8" /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Dispositivos</Label><Input type="number" value={planForm.max_devices} onChange={e => setPlanForm({ ...planForm, max_devices: Number(e.target.value) })} className="text-xs h-8" /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 text-center">
                      <div><p className="text-[10px] text-muted-foreground">Projetos</p><p className="text-sm font-bold">{fmtNum(plan.max_projects)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Smart Links</p><p className="text-sm font-bold">{fmtNum(plan.max_smartlinks)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Webhooks</p><p className="text-sm font-bold">{fmtNum(plan.max_webhooks)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Usuários</p><p className="text-sm font-bold">{fmtNum(plan.max_users)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Agentes IA</p><p className="text-sm font-bold">{fmtNum(plan.max_agents ?? 0)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Leads</p><p className="text-sm font-bold">{fmtNum(plan.max_leads ?? 0)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Dispositivos</p><p className="text-sm font-bold">{fmtNum(plan.max_devices ?? 0)}</p></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "limits" && (
        <div className="w-full space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />Limites Globais da Plataforma
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Configurações gerais que se aplicam a toda a plataforma, independente do plano.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Máx. contas na plataforma</Label><Input type="number" value={limits.max_accounts} onChange={e => setLimits({ ...limits, max_accounts: Number(e.target.value) })} className="text-xs" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Máx. usuários free permitidos</Label><Input type="number" value={limits.max_free_users} onChange={e => setLimits({ ...limits, max_free_users: Number(e.target.value) })} className="text-xs" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Retenção de logs (dias)</Label><Input type="number" value={limits.log_retention_days} onChange={e => setLimits({ ...limits, log_retention_days: Number(e.target.value) })} className="text-xs" /></div>
            </div>
            <Button onClick={saveLimits} size="sm" className="gradient-bg border-0 text-primary-foreground hover:opacity-90 text-xs mt-4">Salvar limites globais</Button>
          </div>
        </div>
      )}

      {activeTab === "superadmins" && (
        <div className="w-full space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />Promover Super Admin
            </h2>
            <div className="flex gap-2">
              <Input value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} placeholder="email@usuario.com" className="text-xs" />
              <Button size="sm" onClick={promoteToSuperAdmin} disabled={promoting || !promoteEmail.trim()} className="gradient-bg border-0 text-primary-foreground text-xs whitespace-nowrap">
                {promoting ? "Promovendo..." : "Promover"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />Super Administradores
            </h2>
            <div className="space-y-2">
              {superAdmins.map((sa: any) => (
                <div key={sa.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="text-sm font-medium">{sa.name}</p>
                    <p className="text-[10px] text-muted-foreground">{sa.email}</p>
                    <p className="text-[10px] text-muted-foreground">Desde {new Date(sa.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">Super Admin</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeSuperAdmin(sa.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {superAdmins.length === 0 && <p className="text-xs text-muted-foreground">Nenhum super admin encontrado.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "stripe" && (
        <div className="w-full space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />Configuração Stripe
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Criar products e prices no Stripe e vincular aos planos.</p>
            <Button size="sm" variant="outline" className="text-xs" onClick={async () => {
              try {
                const { data, error } = await supabase.functions.invoke("setup-stripe");
                if (error) throw error;
                toast({ title: "Stripe configurado!", description: JSON.stringify(data?.results?.map((r: any) => `${r.plan}: ${r.status}`)) });
                refetchPlans();
              } catch (err: any) {
                toast({ title: "Erro", description: err.message, variant: "destructive" });
              }
            }}>Configurar Stripe</Button>
          </div>
        </div>
      )}

      {activeTab === "webhook-stripe" && (
        <div className="w-full space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />Configuração do Webhook Stripe
            </h2>
            <div className="space-y-3 text-xs text-muted-foreground">
              <p>Configure o webhook no painel do Stripe para receber atualizações de assinatura automaticamente.</p>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">1. URL do Endpoint:</p>
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3 font-mono text-xs">
                  <span className="text-primary break-all select-all">https://fnpmuffrqrlofjvqytof.supabase.co/functions/v1/stripe-webhook</span>
                  <button onClick={() => { navigator.clipboard.writeText("https://fnpmuffrqrlofjvqytof.supabase.co/functions/v1/stripe-webhook"); toast({ title: "URL copiada!" }); }} className="shrink-0 p-1 rounded hover:bg-accent">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
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
                <p>Após criar o webhook, copie o <code className="bg-muted px-1 rounded">Signing secret</code> (whsec_...) e adicione como <code className="bg-muted px-1 rounded">STRIPE_WEBHOOK_SECRET</code>.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin removal modal */}
      <AlertDialog open={!!removingSuperAdminId} onOpenChange={(o) => !o && setRemovingSuperAdminId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Super Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá revogar os privilégios de super administrador deste usuário. Ele voltará aos limites do plano original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveSuperAdmin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

/* ─── Admin Users Tab ─── */
function AdminUsersTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const filteredUsers = users.filter((u: any) => {
    const matchesSearch = !search || 
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.account_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || (u.plan_name || "free").toLowerCase() === planFilter.toLowerCase();
    return matchesSearch && matchesPlan;
  });

  const uniquePlans = [...new Set(users.map((u: any) => u.plan_name || "free"))];

  const startEdit = (u: any) => {
    setEditingUser(u.user_id);
    setEditName(u.full_name || "");
    setEditPhone(u.phone || "");
  };

  const saveEdit = async (userId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_update_user", {
        _user_id: userId,
        _full_name: editName || null,
        _phone: editPhone || null,
      });
      if (error) throw error;
      toast({ title: "Usuário atualizado!" });
      setEditingUser(null);
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="w-full space-y-4">
      <div className="rounded-xl bg-card border border-border/50 card-shadow p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Buscar</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, email ou conta..." className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <div className="min-w-[140px]">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Plano</Label>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniquePlans.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="h-8 text-xs">{filteredUsers.length} usuário(s)</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center text-muted-foreground text-sm">Nenhum usuário encontrado.</div>
      ) : (
        <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="w-8" />
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Conta</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Plano</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Cadastro</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Último login</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: any) => (
                  <UserRow
                    key={u.user_id}
                    user={u}
                    isExpanded={expandedUser === u.user_id}
                    isEditing={editingUser === u.user_id}
                    editName={editName}
                    editPhone={editPhone}
                    saving={saving}
                    onToggle={() => setExpandedUser(expandedUser === u.user_id ? null : u.user_id)}
                    onStartEdit={() => startEdit(u)}
                    onCancelEdit={() => setEditingUser(null)}
                    onSave={() => saveEdit(u.user_id)}
                    onNameChange={setEditName}
                    onPhoneChange={setEditPhone}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({ user: u, isExpanded, isEditing, editName, editPhone, saving, onToggle, onStartEdit, onCancelEdit, onSave, onNameChange, onPhoneChange }: {
  user: any; isExpanded: boolean; isEditing: boolean; editName: string; editPhone: string; saving: boolean;
  onToggle: () => void; onStartEdit: () => void; onCancelEdit: () => void; onSave: () => void;
  onNameChange: (v: string) => void; onPhoneChange: (v: string) => void;
}) {
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString("pt-BR") : "—";

  return (
    <>
      <tr className="border-b border-border/20 hover:bg-accent/20 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="px-2 py-3 text-center">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-muted overflow-hidden flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
              {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : (u.full_name?.charAt(0)?.toUpperCase() || "?")}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{u.full_name || "Sem nome"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">{u.account_name || "—"}</td>
        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] capitalize">{u.plan_name || "free"}</Badge></td>
        <td className="px-4 py-3">
          <Badge variant={u.subscription_status === "active" ? "default" : "secondary"} className={cn("text-[10px] capitalize", u.subscription_status === "active" && "bg-success/20 text-success border-success/30")}>
            {u.subscription_status || "—"}
          </Badge>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">{fmtDate(u.created_at)}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">{fmtDate(u.last_sign_in_at)}</td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-border/10">
          <td colSpan={7} className="px-4 py-4 bg-muted/30">
            {isEditing ? (
              <div className="space-y-3 max-w-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome</Label>
                    <Input value={editName} onChange={(e) => onNameChange(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefone</Label>
                    <Input value={editPhone} onChange={(e) => onPhoneChange(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-7 text-xs gradient-bg border-0 text-primary-foreground hover:opacity-90 gap-1" disabled={saving} onClick={onSave}>
                    <Save className="h-3 w-3" />{saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancelEdit}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-muted-foreground block">Email</span><span className="font-medium break-all">{u.email}</span></div>
                  <div><span className="text-muted-foreground block">Telefone</span><span className="font-medium">{u.phone || "—"}</span></div>
                  <div><span className="text-muted-foreground block">Plano</span><span className="font-medium capitalize">{u.plan_name || "free"} ({u.plan_type || "free"})</span></div>
                  <div><span className="text-muted-foreground block">Status Assinatura</span><span className="font-medium capitalize">{u.subscription_status || "—"}</span></div>
                  <div><span className="text-muted-foreground block">Data de Cadastro</span><span className="font-medium font-mono">{fmtDateTime(u.created_at)}</span></div>
                  <div><span className="text-muted-foreground block">Último Login</span><span className="font-medium font-mono">{fmtDateTime(u.last_sign_in_at)}</span></div>
                  <div><span className="text-muted-foreground block">Assinatura desde</span><span className="font-medium font-mono">{fmtDateTime(u.subscription_created_at)}</span></div>
                  <div><span className="text-muted-foreground block">Conta (Org)</span><span className="font-medium">{u.account_name || "—"}</span></div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onStartEdit(); }}>
                  <Edit2 className="h-3 w-3" /> Editar
                </Button>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
