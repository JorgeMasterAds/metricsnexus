import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Copy, Pencil, Check, X, Trash2, FolderOpen } from "lucide-react";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { useProject } from "@/hooks/useProject";
import { MAX_SMART_LINKS } from "@/hooks/useSubscription";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeProject, projects } = useProject();

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
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "projects">("general");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setWebhookSecret((profile as any).webhook_secret || "");
      setCustomDomain(profile.custom_domain || "");
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

  return (
    <DashboardLayout
      title="Configurações"
      subtitle="Gerencie sua conta e integrações"
      actions={<ProductTour {...TOURS.settings} triggerLabel="Tutorial" />}
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border/50 max-w-2xl">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "general" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Geral
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === "projects" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Projetos
        </button>
      </div>

      {activeTab === "general" ? (
        <div className="max-w-2xl space-y-6">
          {/* Projects Overview */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Seus Projetos
            </h2>
            <div className="space-y-3">
              {projectStats.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.name}</span>
                      {activeProject?.id === p.id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Ativo</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Criado em {new Date(p.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{p.smartLinks} links</span>
                    <span className="font-mono">R$ {p.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Perfil</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Alterar senha</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nova senha</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" minLength={6} />
              </div>
              <Button onClick={changePassword} disabled={saving || !newPassword} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">
                Alterar senha
              </Button>
            </div>
          </div>

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
                  <li>Certifique-se de que responde via HTTPS.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Webhook URL + Secret */}
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
                  Se configurado, envie o header <code className="bg-muted px-1 rounded">x-webhook-secret</code> com este valor em cada webhook.
                </p>
              </div>
            </div>
          </div>

          {/* Save button */}
          <Button onClick={saveProfile} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 w-full">
            {saving ? "Salvando..." : "Salvar todas as configurações"}
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
      ) : (
        /* Projects Tab */
        <div className="max-w-2xl space-y-6">
          {/* Global smart link counter */}
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

          {/* Project list */}
          <div className="space-y-3">
            {projectStats.map((p) => {
              const isEditing = editingProjectId === p.id;
              const hasData = p.views > 0 || p.conversions > 0 || p.smartLinks > 0;
              return (
                <div key={p.id} className="rounded-xl bg-card border border-border/50 card-shadow p-5">
                  <div className="flex items-center justify-between mb-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editProjectName}
                          onChange={(e) => setEditProjectName(e.target.value)}
                          className="h-8 text-sm max-w-[200px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameProject.mutate({ id: p.id, name: editProjectName });
                            if (e.key === "Escape") setEditingProjectId(null);
                          }}
                        />
                        <button onClick={() => renameProject.mutate({ id: p.id, name: editProjectName })} className="text-success">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingProjectId(null)} className="text-muted-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{p.name}</h3>
                        {activeProject?.id === p.id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Ativo</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {!isEditing && (
                        <button
                          onClick={() => { setEditingProjectId(p.id); setEditProjectName(p.name); }}
                          className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                          title="Renomear"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (hasData) {
                            if (!confirm(`Este projeto possui ${p.smartLinks} Smart Links, ${p.views} views e ${p.conversions} vendas. Tem certeza que deseja excluí-lo? Esta ação é irreversível.`)) return;
                          }
                          if (projects.length <= 1) {
                            toast({ title: "Não é possível excluir o único projeto", variant: "destructive" });
                            return;
                          }
                          deleteProject.mutate(p.id);
                        }}
                        className="p-1.5 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Smart Links</div>
                      <div className="text-sm font-mono font-semibold">{p.smartLinks}</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Views</div>
                      <div className="text-sm font-mono font-semibold">{p.views.toLocaleString("pt-BR")}</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Vendas</div>
                      <div className="text-sm font-mono font-semibold">{p.conversions.toLocaleString("pt-BR")}</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">Receita</div>
                      <div className="text-sm font-mono font-semibold">R$ {p.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Criado em {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
