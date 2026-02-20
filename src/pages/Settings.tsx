import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setHotmartSecret(profile.hotmart_webhook_secret || "");
      setCaktoSecret(profile.cakto_webhook_secret || "");
    }
    if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: fullName,
        hotmart_webhook_secret: hotmartSecret,
        cakto_webhook_secret: caktoSecret,
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

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/webhook`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
            <Button onClick={saveProfile} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">
              {saving ? "Salvando..." : "Salvar perfil"}
            </Button>
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

        {/* Webhook URL */}
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
          <h2 className="text-sm font-semibold mb-1">URL do Webhook</h2>
          <p className="text-xs text-muted-foreground mb-4">Use esta URL na Hotmart ou Cakto. Adicione <code className="bg-muted px-1 rounded">?platform=hotmart</code> ou <code className="bg-muted px-1 rounded">?platform=cakto</code></p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Hotmart</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={`${webhookUrl}?platform=hotmart`} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => copy(`${webhookUrl}?platform=hotmart`)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Cakto</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={`${webhookUrl}?platform=cakto`} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => copy(`${webhookUrl}?platform=cakto`)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Integration secrets */}
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
          <h2 className="text-sm font-semibold mb-1">Secrets de Integração</h2>
          <p className="text-xs text-muted-foreground mb-4">Configure secrets para validação dos webhooks (opcional)</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Hotmart Webhook Secret</Label>
              <Input value={hotmartSecret} onChange={(e) => setHotmartSecret(e.target.value)} placeholder="hottok da Hotmart" />
            </div>
            <div className="space-y-1.5">
              <Label>Cakto Webhook Secret</Label>
              <Input value={caktoSecret} onChange={(e) => setCaktoSecret(e.target.value)} placeholder="Secret da Cakto" />
            </div>
            <Button onClick={saveProfile} disabled={saving} className="gradient-bg border-0 text-primary-foreground hover:opacity-90">
              Salvar integrações
            </Button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-xl bg-card border border-destructive/30 card-shadow p-6">
          <h2 className="text-sm font-semibold mb-1 text-destructive">Zona de Perigo</h2>
          <p className="text-xs text-muted-foreground mb-4">Ações irreversíveis da sua conta</p>
          <Button variant="destructive" onClick={logout}>
            Sair da conta
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
