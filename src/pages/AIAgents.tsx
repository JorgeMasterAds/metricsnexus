import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAIAgents } from "@/hooks/useAIAgents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Bot, Trash2, Edit2, Play, Zap, MessageSquare, Webhook,
  MousePointerClick, Brain, Send, Tag, MoveRight, StickyNote,
  ArrowRight, GitBranch, Filter,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import AgentFlowEditor from "@/components/ai/AgentFlowEditor";

const TRIGGER_TYPES = [
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "webhook", label: "Webhook", icon: Webhook },
  { value: "form", label: "Formulário", icon: MousePointerClick },
  { value: "manual", label: "Manual", icon: Play },
];

const ACTION_TYPES: Record<string, { label: string; icon: any }> = {
  send_whatsapp: { label: "Enviar WhatsApp", icon: Send },
  send_text: { label: "Enviar Texto", icon: MessageSquare },
  update_lead: { label: "Atualizar Lead", icon: MoveRight },
  add_tag: { label: "Adicionar Tag", icon: Tag },
  add_note: { label: "Registrar Nota", icon: StickyNote },
  router: { label: "Roteador", icon: GitBranch },
  filter: { label: "Filtro", icon: Filter },
};

export default function AIAgents() {
  const { agents, apiKeys, isLoading, deleteAgent, updateAgent, createAgent } = useAIAgents();
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [creating, setCreating] = useState(false);

  // If editing an agent, show flow editor full screen
  if (editingAgent) {
    return (
      <AgentFlowEditor
        agent={editingAgent}
        apiKeys={apiKeys}
        onClose={() => setEditingAgent(null)}
      />
    );
  }

  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || creating) return;
    setCreating(true);
    try {
      await createAgent.mutateAsync({
        name: newAgentName.trim(),
        trigger_type: "manual",
      });
      setShowCreateDialog(false);
      setNewAgentName("");
      // The agent will appear in the list and user can click to edit
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout
      title="Agente de IA"
      subtitle="Crie fluxos automatizados com inteligência artificial"
      actions={
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Novo agente
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Bot className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <h3 className="text-lg font-medium">Nenhum agente criado</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Crie seu primeiro agente de IA para automatizar respostas, qualificar leads e executar ações no CRM.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Criar primeiro agente
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent: any) => {
            const trigger = TRIGGER_TYPES.find((t) => t.value === agent.trigger_type);
            const TriggerIcon = trigger?.icon || Zap;
            return (
              <div
                key={agent.id}
                className="rounded-xl border border-border bg-card p-5 space-y-3 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setEditingAgent(agent)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      agent.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{agent.name}</h3>
                      {agent.description && <p className="text-xs text-muted-foreground">{agent.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Badge variant={agent.is_active ? "default" : "secondary"} className="text-[10px]">
                      {agent.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Switch checked={agent.is_active} onCheckedChange={(checked) => updateAgent.mutate({ id: agent.id, is_active: checked })} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingAgent(agent)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAgent.mutate(agent.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Mini flow */}
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
                    <TriggerIcon className="h-3.5 w-3.5" /> {trigger?.label || "Manual"}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium">
                    <Brain className="h-3.5 w-3.5" /> IA
                  </div>
                  {(agent.actions || []).map((action: any, i: number) => {
                    const at = ACTION_TYPES[action.type];
                    const ActionIcon = at?.icon || Zap;
                    return (
                      <div key={i} className="contents">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                          <ActionIcon className="h-3.5 w-3.5" /> {at?.label || action.type}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog - name only */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Novo agente de IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Nome do agente</Label>
              <Input
                className="mt-1"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Ex: Assistente de Vendas"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateAgent()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(false)} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateAgent} disabled={!newAgentName.trim() || creating} className="text-xs gap-1.5">
              <Plus className="h-3 w-3" /> {creating ? "Criando..." : "Criar agente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
