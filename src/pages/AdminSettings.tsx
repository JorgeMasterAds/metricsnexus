import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Copy, Globe, Settings, Users, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "stripe";
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => { setActiveTab(tabParam); }, [tabParam]);

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

  const { data: superAdmins = [] } = useQuery({
    queryKey: ["super-admins-list"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("super_admins").select("id, user_id, created_at");
      return data || [];
    },
    enabled: !!isSuperAdmin,
  });

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
    { key: "platform", label: "Plataforma", icon: Globe },
  ];

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

          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Planos Cadastrados</h2>
            <div className="space-y-2">
              {plans.map((plan: any) => (
                <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="text-sm font-medium capitalize">{plan.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {plan.max_projects} projetos · {plan.max_smartlinks} smartlinks · {plan.max_webhooks} webhooks · {plan.max_users} usuários
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">R$ {plan.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{plan.stripe_price_id ? "✓ Stripe" : "Sem Stripe"}</p>
                  </div>
                </div>
              ))}
            </div>
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
              <Users className="h-4 w-4 text-primary" />Super Administradores
            </h2>
            <div className="space-y-2">
              {superAdmins.map((sa: any) => (
                <div key={sa.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div>
                    <p className="text-xs font-mono">{sa.user_id}</p>
                    <p className="text-[10px] text-muted-foreground">Desde {new Date(sa.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Super Admin</Badge>
                </div>
              ))}
              {superAdmins.length === 0 && <p className="text-xs text-muted-foreground">Nenhum super admin encontrado.</p>}
            </div>
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
                <Input placeholder="https://exemplo.com/imagem.jpg" className="text-xs" />
              </div>
              <Button size="sm" className="gradient-bg border-0 text-primary-foreground hover:opacity-90 text-xs">
                Salvar configurações
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
