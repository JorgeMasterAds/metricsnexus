import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Copy, Globe, Settings, Users, Webhook, Sliders, UserPlus, Trash2, CreditCard, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "stripe";
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
      const { data } = await (supabase as any).from("super_admins").select("id, user_id, created_at, profiles:user_id(full_name)");
      if (!data) return [];
      // Fetch emails via RPC for each user
      const enriched = await Promise.all(data.map(async (sa: any) => {
        // Try to get email from auth - we use find_user_id_by_email in reverse isn't possible,
        // so we show the profile name and user_id
        return { ...sa, name: sa.profiles?.full_name || "Sem nome" };
      }));
      return enriched;
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
    max_users_per_account: 10,
    max_projects_per_account: 10,
    max_free_users: 100,
    max_free_events_monthly: 10000,
    max_smartlinks_free: 5,
    max_webhooks_free: 2,
    log_retention_days: 90,
  });

  useEffect(() => {
    if (globalLimits) {
      setLimits({
        max_accounts: globalLimits.max_accounts ?? 1000,
        max_users_per_account: globalLimits.max_users_per_account ?? 10,
        max_projects_per_account: globalLimits.max_projects_per_account ?? 10,
        max_free_users: globalLimits.max_free_users ?? 100,
        max_free_events_monthly: globalLimits.max_free_events_monthly ?? 10000,
        max_smartlinks_free: globalLimits.max_smartlinks_free ?? 5,
        max_webhooks_free: globalLimits.max_webhooks_free ?? 2,
        log_retention_days: globalLimits.log_retention_days ?? 90,
      });
    }
  }, [globalLimits]);

  // Plan editing state
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ max_projects: 0, max_smartlinks: 0, max_webhooks: 0, max_users: 0 });

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

  const removeSuperAdmin = async (id: string) => {
    if (!confirm("Remover este Super Admin?")) return;
    const { error } = await (supabase as any).from("super_admins").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Super Admin removido" });
    refetchAdmins();
  };

  const [loginBgUrl, setLoginBgUrl] = useState("");

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
    { key: "stripe", label: "Configuração Stripe", icon: Settings },
    { key: "webhook-stripe", label: "Webhook Stripe", icon: Webhook },
    { key: "superadmins", label: "Super Admins", icon: Users },
    { key: "plans", label: "Planos", icon: Package },
    { key: "limits", label: "Limites Globais", icon: Sliders },
    { key: "platform", label: "Plataforma", icon: Globe },
  ];

  const fmtNum = (n: number) => n.toLocaleString("pt-BR");

  return (
    <DashboardLayout title="Administração" subtitle="Configurações do sistema (Super Admin)">
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

      {activeTab === "stripe" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
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
        <div className="max-w-4xl w-full mx-auto space-y-6">
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

      {activeTab === "superadmins" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
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
                    <p className="text-[10px] text-muted-foreground font-mono">{sa.user_id}</p>
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

      {activeTab === "plans" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
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
                        setPlanForm({ max_projects: plan.max_projects, max_smartlinks: plan.max_smartlinks, max_webhooks: plan.max_webhooks, max_users: plan.max_users });
                      }}>Editar limites</Button>
                    )}
                  </div>

                  {editingPlan?.id === plan.id ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Projetos</Label>
                        <Input type="number" value={planForm.max_projects} onChange={e => setPlanForm({ ...planForm, max_projects: Number(e.target.value) })} className="text-xs h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Smart Links</Label>
                        <Input type="number" value={planForm.max_smartlinks} onChange={e => setPlanForm({ ...planForm, max_smartlinks: Number(e.target.value) })} className="text-xs h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Webhooks</Label>
                        <Input type="number" value={planForm.max_webhooks} onChange={e => setPlanForm({ ...planForm, max_webhooks: Number(e.target.value) })} className="text-xs h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Usuários</Label>
                        <Input type="number" value={planForm.max_users} onChange={e => setPlanForm({ ...planForm, max_users: Number(e.target.value) })} className="text-xs h-8" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div><p className="text-[10px] text-muted-foreground">Projetos</p><p className="text-sm font-bold">{fmtNum(plan.max_projects)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Smart Links</p><p className="text-sm font-bold">{fmtNum(plan.max_smartlinks)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Webhooks</p><p className="text-sm font-bold">{fmtNum(plan.max_webhooks)}</p></div>
                      <div><p className="text-[10px] text-muted-foreground">Usuários</p><p className="text-sm font-bold">{fmtNum(plan.max_users)}</p></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "limits" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />Limites Globais da Plataforma
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Configurações gerais que se aplicam a toda a plataforma, independente do plano. Limites por plano devem ser ajustados na aba "Planos".</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Máx. contas criadas na plataforma</Label>
                <Input type="number" value={limits.max_accounts} onChange={e => setLimits({ ...limits, max_accounts: Number(e.target.value) })} className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Máx. usuários por conta</Label>
                <Input type="number" value={limits.max_users_per_account} onChange={e => setLimits({ ...limits, max_users_per_account: Number(e.target.value) })} className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Máx. projetos por conta</Label>
                <Input type="number" value={limits.max_projects_per_account} onChange={e => setLimits({ ...limits, max_projects_per_account: Number(e.target.value) })} className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Retenção de logs (dias)</Label>
                <Input type="number" value={limits.log_retention_days} onChange={e => setLimits({ ...limits, log_retention_days: Number(e.target.value) })} className="text-xs" />
              </div>
            </div>
            <Button onClick={saveLimits} size="sm" className="gradient-bg border-0 text-primary-foreground hover:opacity-90 text-xs mt-4">
              Salvar limites globais
            </Button>
          </div>
        </div>
      )}

      {activeTab === "platform" && (
        <div className="max-w-4xl w-full mx-auto space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />Configurações da Plataforma
            </h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Imagem de fundo da tela de login</Label>
                <p className="text-[10px] text-muted-foreground">Insira a URL da imagem que aparecerá no lado direito da tela de login.</p>
                <Input
                  value={loginBgUrl}
                  onChange={(e) => setLoginBgUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="text-xs"
                />
              </div>
              <Button size="sm" className="gradient-bg border-0 text-primary-foreground hover:opacity-90 text-xs" onClick={async () => {
                const { error } = await (supabase as any)
                  .from("platform_settings")
                  .upsert({ id: "global", login_bg_url: loginBgUrl, updated_at: new Date().toISOString() }, { onConflict: "id" });
                if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
                toast({ title: "Imagem de fundo atualizada!" });
              }}>Salvar imagem de fundo</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
