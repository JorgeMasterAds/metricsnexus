import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Senhas diferentes", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha atualizada!", description: "Redirecionando..." });
      setTimeout(() => navigate("/dashboard"), 1500);
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          <p>Verificando link de recuperação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">
            Nexus <span className="gradient-text">Metrics</span>
          </span>
        </div>
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
          <h1 className="text-lg font-semibold mb-1">Nova senha</h1>
          <p className="text-sm text-muted-foreground mb-6">Defina sua nova senha de acesso</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar senha</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full gradient-bg border-0 text-primary-foreground hover:opacity-90" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
