import { useState } from "react";
import { Activity, Shield, Sparkles, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject } from "@/hooks/useProject";
import { useToast } from "@/hooks/use-toast";

export default function CreateProjectScreen() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { createProject } = useProject();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Digite um nome para o projeto", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await createProject(name.trim());
      toast({ title: "Projeto criado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao criar projeto", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity className="h-7 w-7 text-primary" />
          <span className="font-bold text-xl tracking-tight">
            Nexus <span className="gradient-text">Metrics</span>
          </span>
        </div>

        <div className="rounded-xl bg-card border border-border/50 card-shadow p-8 space-y-6">
          {/* Welcome message */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium mb-2">
              <Sparkles className="h-3 w-3" />
              Versão Beta
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Bem-vindo ao Nexus Metrics! 🎉</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estamos felizes em ter você aqui. Esta é uma <strong>versão beta</strong> da plataforma — estamos evoluindo constantemente com base no feedback de usuários como você.
            </p>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/50 border border-border/30">
              <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">Dados seguros</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">Seus dados são armazenados em banco de dados criptografado com isolamento total por conta.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/50 border border-border/30">
              <Rocket className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium">Em evolução</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">Novas funcionalidades são adicionadas frequentemente. Acompanhe na aba Novidades.</p>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border/50" />

          {/* Project creation */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold mb-1">Crie seu primeiro projeto</h2>
              <p className="text-xs text-muted-foreground">
                Para começar, é necessário criar um projeto. Cada projeto possui seus próprios Smart Links, relatórios, webhooks e configurações independentes.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Nome do projeto</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Meu Produto Principal"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="w-full gradient-bg border-0 text-primary-foreground hover:opacity-90"
            >
              {loading ? "Criando..." : "Criar Projeto e Começar"}
            </Button>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          Ao continuar, você concorda com os termos de uso da plataforma.
        </p>
      </div>
    </div>
  );
}
