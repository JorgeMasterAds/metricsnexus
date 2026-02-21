import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Copy } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const qc = useQueryClient();

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
  const [hotmartSecret, setHotmartSecret] = useState("");
  const [caktoSecret, setCaktoSecret] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setHotmartSecret(profile.hotmart_webhook_secret || "");
      setCaktoSecret(profile.cakto_webhook_secret || "");
      setCustomDomain(profile.custom_domain || "");
    }
    if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

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
        hotmart_webhook_secret: hotmartSecret,
        cakto_webhook_secret: caktoSecret,
        custom_domain: customDomain || null,
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

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/webhook`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  return (
    <DashboardLayout title="Configurações" subtitle="Gerencie sua conta e integrações">
      <div className="max-w-2xl space-y-6">
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
                    <div>Apontando para: <strong>{projectId}.supabase.co</strong></div>
                  </div>
                </li>
                <li>Aguarde propagação (até 48h).</li>
                <li>Certifique-se de que responde via HTTPS.</li>
              </ol>
              <p className="text-warning text-xs">⚠️ O domínio deve responder via HTTPS para funcionar corretamente.</p>
            </div>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
          <h2 className="text-sm font-semibold mb-1">URL do Webhook</h2>
          <p className="text-xs text-muted-foreground mb-4">Utilize esta URL na sua plataforma de vendas.</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={() => copy(webhookUrl)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Opcionalmente, envie o header <code className="bg-muted px-1 rounded">x-webhook-secret</code> para validação extra.
          </p>
        </div>

        {/* Integration secrets */}
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
          <h2 className="text-sm font-semibold mb-1">Secrets de Integração</h2>
          <p className="text-xs text-muted-foreground mb-4">Configure secrets para validação dos webhooks (opcional)</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Webhook Secret (Hotmart / Cakto)</Label>
              <Input value={hotmartSecret} onChange={(e) => setHotmartSecret(e.target.value)} placeholder="Secret do webhook" />
            </div>
            <div className="space-y-1.5">
              <Label>Secret alternativo</Label>
              <Input value={caktoSecret} onChange={(e) => setCaktoSecret(e.target.value)} placeholder="Secret alternativo" />
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
    </DashboardLayout>
  );
}
