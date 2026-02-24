import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Copy, Pencil, Check, X, Trash2, FolderOpen, User, Camera, Shield, Settings as SettingsIcon } from "lucide-react";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { useProject } from "@/hooks/useProject";
import { MAX_SMART_LINKS } from "@/hooks/useSubscription";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeProject, projects } = useProject();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const projectAvatarInputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return data;
    },
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [uploadingProjectAvatar, setUploadingProjectAvatar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "organization" | "integrations">("personal");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setWebhookSecret((profile as any).webhook_secret || "");
      setCustomDomain(profile.custom_domain || "");
      setPhone((profile as any).phone || "");
      setLanguage((profile as any).language || "pt-BR");
      setAvatarUrl((profile as any).avatar_url || "");
    }
    if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

  // Project stats
  const { data: projectStats = [] } = useQuery({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const results = [];
      for (const p of projects) {
        const [slCount, viewsCount, convsData] = await Promise.all([
          supabase.from("smart_links").select("id", { count: "exact", head: true }).eq("project_id", p.id),
          supabase.from("daily_metrics").select("views").eq("project_id", p.id),
          supabase.from("daily_metrics").select("conversions, revenue").eq("project_id", p.id),
        ]);
        const totalViews = (viewsCount.data || []).reduce((s: number, m: any) => s + Number(m.views), 0);
        const totalConversions = (convsData.data || []).reduce((s: number, m: any) => s + Number(m.conversions), 0);
        const totalRevenue = (convsData.data || []).reduce((s: number, m: any) => s + Number(m.revenue), 0);
        results.push({
          id: p.id,
          name: p.name,
          created_at: p.created_at,
          avatar_url: (p as any).avatar_url || "",
          smartLinks: slCount.count || 0,
          views: totalViews,
          conversions: totalConversions,
          revenue: totalRevenue,
        });
      }
      return results;
    },
    enabled: projects.length > 0,
    staleTime: 60000,
  });

  const { data: totalSmartLinksCount = 0 } = useQuery({
    queryKey: ["smart-links-total-count"],
    queryFn: async () => {
      const { count } = await supabase.from("smart_links").select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  const renameProject = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase as any).from("projects").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project-stats"] });
      setEditingProjectId(null);
      toast({ title: "Projeto renomeado!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project-stats"] });
      toast({ title: "Projeto excluído!" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url: url } as any).eq("id", user.id);
    setAvatarUrl(url);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast({ title: "Foto atualizada!" });
  };

  const uploadProjectAvatar = async (file: File, projectId: string) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/project-${projectId}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    await (supabase as any).from("projects").update({ avatar_url: url }).eq("id", projectId);
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["project-stats"] });
    toast({ title: "Foto do projeto atualizada!" });
  };

  const isValidDomain = (domain: string) => {
    if (!domain) return true;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain.toLowerCase());
  };

  const saveProfile = async () => {
    if (customDomain && !isValidDomain(customDomain)) {
      toast({ title: "Domínio inválido", description: "Use um formato válido como tracker.meudominio.com", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName,
        webhook_secret: webhookSecret || null,
        custom_domain: customDomain || null,
        phone: phone || null,
        language,
      } as any).eq("id", user?.id);
      if (error) throw error;
      if (email !== user?.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email });
        if (emailErr) throw emailErr;
        toast({ title: "Email atualizado", description: "Verifique o novo email para confirmar." });
      }
      toast({ title: "Perfil atualizado!" });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas diferentes", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "A senha deve ter no mínimo 8 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "APAGAR MINHA CONTA") {
      toast({ title: "Digite exatamente: APAGAR MINHA CONTA", variant: "destructive" });
      return;
    }
    toast({ title: "Funcionalidade em desenvolvimento", description: "Entre em contato com o suporte para excluir sua conta." });
  };

  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `https://${supabaseProjectId}.supabase.co/functions/v1/webhook`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const tabs = [
    { key: "personal" as const, label: "Dados Pessoais", icon: User },
    { key: "organization" as const, label: "Minha Organização", icon: FolderOpen },
    { key: "integrations" as const, label: "Integrações", icon: SettingsIcon },
  ];

  return (
    <DashboardLayout
      title="Configurações"
      subtitle="Gerencie sua conta e integrações"
      actions={<ProductTour {...TOURS.settings} triggerLabel="Tutorial" />}
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border/50 overflow-x-auto">
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

      {activeTab === "personal" && (
        <div className="max-w-2xl space-y-6">
          {/* Avatar + Name */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Dados Pessoais</h2>
            <div className="flex items-start gap-6">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full bg-muted/50 border-2 border-border/50 overflow-hidden flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
                />
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nome completo</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Idioma</Label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="pt-BR">Português brasileiro</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Alterar senha</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nova senha</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" minLength={8} />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirmar nova senha</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" minLength={8} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Requisitos: mínimo 8 caracteres</p>
              </div>
              <Button onClick={changePassword} disabled={saving || !newPassword} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">
                Alterar senha
              </Button>
            </div>
          </div>

          {/* 2FA */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">Verificação de dois fatores (2FA)</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Se ativar esta opção, será enviado um código de verificação via e-mail ao conectar.
                  </p>
                </div>
              </div>
              <Switch
                checked={false}
                onCheckedChange={() => toast({ title: "Em breve", description: "A verificação de dois fatores estará disponível em breve." })}
              />
            </div>
          </div>

          {/* Save */}
          <Button onClick={saveProfile} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 w-full">
            {saving ? "Salvando..." : "Salvar dados pessoais"}
          </Button>

          {/* Danger zone */}
          <div className="rounded-xl bg-card border border-destructive/30 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-1 text-destructive">Zona de Perigo</h2>
            <p className="text-xs text-muted-foreground mb-4">Ações irreversíveis da sua conta</p>
            {!showDeleteConfirm ? (
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                Apagar conta
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-destructive">Para confirmar, digite <strong>APAGAR MINHA CONTA</strong> abaixo:</p>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="APAGAR MINHA CONTA"
                  className="border-destructive/50"
                />
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={deleteAccount} disabled={deleteConfirm !== "APAGAR MINHA CONTA"}>
                    Confirmar exclusão
                  </Button>
                  <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "organization" && (
        <div className="max-w-4xl space-y-6">
          {/* Smart Links counter */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Smart Links na conta</h3>
              <p className="text-xs text-muted-foreground">Limite global de {MAX_SMART_LINKS} Smart Links por conta</p>
            </div>
            <span className="text-lg font-mono font-semibold">
              <span className={totalSmartLinksCount >= MAX_SMART_LINKS ? "text-destructive" : "text-foreground"}>
                {totalSmartLinksCount}
              </span>
              <span className="text-muted-foreground">/{MAX_SMART_LINKS}</span>
            </span>
          </div>

          {/* Project grid like UTMfy */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Seus projetos</h3>
                <p className="text-xs text-muted-foreground">Gerencie seus projetos aqui</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projectStats.map((p) => {
                const isEditing = editingProjectId === p.id;
                const hasData = p.views > 0 || p.conversions > 0 || p.smartLinks > 0;
                return (
                  <div key={p.id} className="rounded-xl bg-card border border-border/50 card-shadow p-4 flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative group">
                        <div className="h-10 w-10 rounded-full bg-muted/50 border border-border/50 overflow-hidden flex items-center justify-center shrink-0">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setUploadingProjectAvatar(p.id);
                            projectAvatarInputRef.current?.click();
                          }}
                          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <Camera className="h-3.5 w-3.5 text-white" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editProjectName}
                              onChange={(e) => setEditProjectName(e.target.value)}
                              className="h-7 text-xs"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") renameProject.mutate({ id: p.id, name: editProjectName });
                                if (e.key === "Escape") setEditingProjectId(null);
                              }}
                            />
                            <button onClick={() => renameProject.mutate({ id: p.id, name: editProjectName })} className="text-success">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{p.name}</span>
                              {activeProject?.id === p.id && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium shrink-0">Ativo</span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              Criado em {new Date(p.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!isEditing && (
                          <button
                            onClick={() => { setEditingProjectId(p.id); setEditProjectName(p.name); }}
                            className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (hasData && !confirm(`Excluir "${p.name}"? Esta ação é irreversível.`)) return;
                            if (projects.length <= 1) {
                              toast({ title: "Não é possível excluir o único projeto", variant: "destructive" });
                              return;
                            }
                            deleteProject.mutate(p.id);
                          }}
                          className="p-1 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-muted/30 p-2">
                        <div className="text-[10px] text-muted-foreground">Links</div>
                        <div className="text-xs font-mono font-semibold">{p.smartLinks}</div>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-2">
                        <div className="text-[10px] text-muted-foreground">Receita</div>
                        <div className="text-xs font-mono font-semibold">R$ {p.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <input
            ref={projectAvatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && uploadingProjectAvatar) uploadProjectAvatar(f, uploadingProjectAvatar);
            }}
          />
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="max-w-2xl space-y-6">
          {/* Custom Domain */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-1">Domínio Personalizado do Tracker</h2>
            <p className="text-xs text-muted-foreground mb-4">Configure um domínio próprio para seus Smart Links</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Domínio</Label>
                <Input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                  placeholder="tracker.meudominio.com"
                />
                {customDomain && !isValidDomain(customDomain) && (
                  <p className="text-xs text-destructive">Formato inválido. Use: tracker.meudominio.com</p>
                )}
              </div>
              <div className="rounded-lg bg-muted/30 border border-border/30 p-4 space-y-2">
                <p className="text-xs font-medium text-foreground">Para usar seu próprio subdomínio:</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Acesse seu provedor DNS.</li>
                  <li>
                    Crie um registro <strong>CNAME</strong>:
                    <div className="bg-background/50 rounded p-2 font-mono text-xs mt-1 ml-4">
                      <div>Nome: <strong>tracker</strong></div>
                      <div>Apontando para: <strong>{supabaseProjectId}.supabase.co</strong></div>
                    </div>
                  </li>
                  <li>Aguarde propagação (até 48h).</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Webhook */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-1">Webhook</h2>
            <p className="text-xs text-muted-foreground mb-4">Configure o recebimento de vendas da sua plataforma.</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>URL do Webhook</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => copy(webhookUrl)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Cole esta URL na configuração de webhook da sua plataforma de vendas.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Webhook Secret (opcional)</Label>
                <Input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="Seu secret de validação" />
                <p className="text-xs text-muted-foreground">
                  Envie o header <code className="bg-muted px-1 rounded">x-webhook-secret</code> com este valor.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={saveProfile} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 w-full">
            {saving ? "Salvando..." : "Salvar integrações"}
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
