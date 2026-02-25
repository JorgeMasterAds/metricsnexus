import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Activity, Eye, EyeOff, RefreshCw } from "lucide-react";

type Mode = "login" | "register" | "forgot";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  return { question: `${a} + ${b} = ?`, answer: String(a + b) };
}

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const { toast } = useToast();

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  }, []);

  // Refresh captcha when switching to register
  useEffect(() => {
    if (mode === "register") refreshCaptcha();
  }, [mode, refreshCaptcha]);

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
        // Validate captcha
        if (captchaInput.trim() !== captcha.answer) {
          toast({ title: "Captcha incorreto", description: "Resolva a operação matemática corretamente.", variant: "destructive" });
          refreshCaptcha();
          setLoading(false);
          return;
        }

        // Validate password confirmation
        if (password !== confirmPassword) {
          toast({ title: "Senhas não conferem", description: "A senha e a confirmação devem ser iguais.", variant: "destructive" });
          setLoading(false);
          return;
        }

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
      if (mode === "register") refreshCaptcha();
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

            {mode === "register" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Math Captcha */}
                <div className="space-y-1.5">
                  <Label htmlFor="captcha">Verificação de segurança</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                      <span className="text-sm font-mono font-semibold text-foreground select-none">
                        {captcha.question}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="p-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Gerar novo desafio"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    id="captcha"
                    type="text"
                    inputMode="numeric"
                    placeholder="Sua resposta"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              </>
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
