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
import { useAccount } from "@/hooks/useAccount";
import { MAX_SMART_LINKS } from "@/hooks/useSubscription";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeAccount, accounts } = useAccount();
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
      const { data } = await (supabase as any).from("profiles").select("*").maybeSingle();
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
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "organization" | "integrations">("personal");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
    if (user) {
      setEmail(user.email || "");
    }
    if (activeAccount) {
      setWebhookSecret(activeAccount.webhook_secret || "");
    }
  }, [profile, user, activeAccount]);

  // Account stats
  const { data: accountStats } = useQuery({
    queryKey: ["account-stats", activeAccount?.id],
    queryFn: async () => {
      const [slCount, viewsData, convsData] = await Promise.all([
        (supabase as any).from("smartlinks").select("id", { count: "exact", head: true }).eq("account_id", activeAccount!.id),
        (supabase as any).from("daily_metrics").select("views").eq("account_id", activeAccount!.id),
        (supabase as any).from("daily_metrics").select("conversions, revenue").eq("account_id", activeAccount!.id),
      ]);
      const totalViews = (viewsData.data || []).reduce((s: number, m: any) => s + Number(m.views), 0);
      const totalConversions = (convsData.data || []).reduce((s: number, m: any) => s + Number(m.conversions), 0);
      const totalRevenue = (convsData.data || []).reduce((s: number, m: any) => s + Number(m.revenue), 0);
      return {
        smartLinks: slCount.count || 0,
        views: totalViews,
        conversions: totalConversions,
        revenue: totalRevenue,
      };
    },
    enabled: !!activeAccount?.id,
    staleTime: 60000,
  });

  const { data: totalSmartLinksCount = 0 } = useQuery({
    queryKey: ["smartlinks-total-count-settings", activeAccount?.id],
    queryFn: async () => {
      const { count } = await (supabase as any).from("smartlinks").select("id", { count: "exact", head: true }).eq("account_id", activeAccount!.id);
      return count || 0;
    },
    enabled: !!activeAccount?.id,
  });

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
      const { error } = await (supabase as any).from("profiles").update({
        full_name: fullName,
      }).eq("id", user?.id);
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
                    <Label>E-mail</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

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
              <Button onClick={changePassword} disabled={saving || !newPassword} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">
                Alterar senha
              </Button>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">Verificação de dois fatores (2FA)</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Em breve.</p>
                </div>
              </div>
              <Switch checked={false} onCheckedChange={() => toast({ title: "Em breve" })} />
            </div>
          </div>

          <Button onClick={saveProfile} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90 w-full">
            {saving ? "Salvando..." : "Salvar dados pessoais"}
          </Button>

          <div className="rounded-xl bg-card border border-destructive/30 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-1 text-destructive">Zona de Perigo</h2>
            <p className="text-xs text-muted-foreground mb-4">Ações irreversíveis da sua conta</p>
            {!showDeleteConfirm ? (
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Apagar conta</Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-destructive">Para confirmar, digite <strong>APAGAR MINHA CONTA</strong> abaixo:</p>
                <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="APAGAR MINHA CONTA" className="border-destructive/50" />
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={deleteAccount} disabled={deleteConfirm !== "APAGAR MINHA CONTA"}>Confirmar exclusão</Button>
                  <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(""); }}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "organization" && (
        <div className="space-y-6">
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
            <h2 className="text-sm font-semibold mb-4">Conta Ativa</h2>
            <p className="text-lg font-semibold">{activeAccount?.name}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {activeAccount?.id}</p>
          </div>

          <div className="rounded-xl bg-card border border-border/50 card-shadow p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Smart Links na conta</h3>
              <p className="text-xs text-muted-foreground">Limite de {MAX_SMART_LINKS} Smart Links</p>
            </div>
            <span className="text-lg font-mono font-semibold">
              <span className={totalSmartLinksCount >= MAX_SMART_LINKS ? "text-destructive" : "text-foreground"}>
                {totalSmartLinksCount}
              </span>
              <span className="text-muted-foreground">/{MAX_SMART_LINKS}</span>
            </span>
          </div>

          {accountStats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-card border border-border/50 card-shadow p-4 text-center">
                <div className="text-[10px] text-muted-foreground mb-1">Views</div>
                <div className="text-lg font-mono font-semibold">{accountStats.views.toLocaleString("pt-BR")}</div>
              </div>
              <div className="rounded-xl bg-card border border-border/50 card-shadow p-4 text-center">
                <div className="text-[10px] text-muted-foreground mb-1">Conversões</div>
                <div className="text-lg font-mono font-semibold">{accountStats.conversions.toLocaleString("pt-BR")}</div>
              </div>
              <div className="rounded-xl bg-card border border-border/50 card-shadow p-4 text-center">
                <div className="text-[10px] text-muted-foreground mb-1">Receita</div>
                <div className="text-lg font-mono font-semibold">R$ {accountStats.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="max-w-2xl space-y-6">
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
              </div>
              <div className="space-y-1.5">
                <Label>Webhook Secret</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={webhookSecret} className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => copy(webhookSecret)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie o header <code className="bg-muted px-1 rounded">x-webhook-secret</code> com este valor.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
