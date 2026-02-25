import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Activity, Eye, EyeOff } from "lucide-react";

type Mode = "login" | "register" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "A senha deve ter no mínimo 8 caracteres";
    if (!/[a-zA-Z]/.test(pw)) return "A senha deve conter pelo menos 1 letra";
    if (!/[0-9]/.test(pw)) return "A senha deve conter pelo menos 1 número";
    if (pw.toLowerCase() === email.toLowerCase()) return "A senha não pode ser igual ao email";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        const pwError = validatePassword(password);
        if (pwError) {
          toast({ title: "Senha fraca", description: pwError, variant: "destructive" });
          setLoading(false);
          return;
        }
      }

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "register") {
        const { data: limitData, error: limitError } = await supabase.functions.invoke("check-user-limit");
        if (limitError) throw limitError;
        if (!limitData?.canRegister) {
          toast({ title: "Limite de usuários atingido", description: `O sistema suporta no máximo ${limitData?.maxUsers || 10} usuários.`, variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar o cadastro." });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
        setMode("login");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Login form */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center p-8 lg:p-12">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">
            Nexus <span className="gradient-text">Metrics</span>
          </span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-1">
            {mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Recuperar senha"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === "login"
              ? "Acesse sua conta Nexus Metrics"
              : mode === "register"
              ? "Comece a rastrear seus resultados"
              : "Enviaremos um link de redefinição"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full gradient-bg border-0 text-primary-foreground hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Enviar link"}
            </Button>
          </form>

          <div className="mt-6 text-sm space-y-2">
            {mode === "login" && (
              <>
                <button
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground hover:text-foreground transition-colors block w-full text-left"
                >
                  Esqueceu a senha?
                </button>
                <span className="text-muted-foreground">
                  Não tem conta?{" "}
                  <button onClick={() => setMode("register")} className="text-primary hover:underline">
                    Criar conta
                  </button>
                </span>
              </>
            )}
            {(mode === "register" || mode === "forgot") && (
              <button onClick={() => setMode("login")} className="text-muted-foreground hover:text-foreground transition-colors">
                ← Voltar ao login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Background image */}
      <div className="hidden lg:block flex-1 relative bg-card border-l border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4 px-12">
            <div className="h-24 w-24 rounded-2xl gradient-bg mx-auto flex items-center justify-center">
              <Activity className="h-12 w-12 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Nexus Metrics</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              Rastreie, analise e otimize seus resultados com inteligência e precisão.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
