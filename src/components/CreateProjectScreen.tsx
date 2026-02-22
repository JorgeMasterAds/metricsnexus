import { useState } from "react";
import { Activity } from "lucide-react";
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
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">
            Nexus <span className="gradient-text">Metrics</span>
          </span>
        </div>

        <div className="rounded-xl bg-card border border-border/50 card-shadow p-6">
          <h2 className="text-sm font-semibold mb-1">Criar seu primeiro projeto</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Você precisa de um projeto para começar a usar o Nexus Metrics. Cada projeto possui seus próprios Smart Links, relatórios e configurações.
          </p>

          <div className="space-y-4">
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
              {loading ? "Criando..." : "Criar Projeto"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
