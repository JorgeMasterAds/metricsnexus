import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAIAgents } from "@/hooks/useAIAgents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Bot, Trash2, Edit2, Play, Zap, MessageSquare, Webhook, MousePointerClick, ArrowRight, Brain, Send, Tag, MoveRight, StickyNote, Info, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TRIGGER_TYPES = [
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare, desc: "Ao receber mensagem" },
  { value: "webhook", label: "Webhook/Venda", icon: Webhook, desc: "Ao receber evento" },
  { value: "form", label: "Formulário", icon: MousePointerClick, desc: "Ao enviar formulário" },
  { value: "manual", label: "Manual", icon: Play, desc: "Execução manual" },
];

const ACTION_TYPES = [
  { value: "send_whatsapp", label: "Enviar WhatsApp", icon: Send },
  { value: "update_lead_status", label: "Atualizar Lead no CRM", icon: MoveRight },
  { value: "add_tag", label: "Adicionar Tag", icon: Tag },
  { value: "add_note", label: "Registrar Anotação", icon: StickyNote },
];

const SUGGESTED_PROMPTS = [
  {
    label: "Assistente Comercial",
    prompt: "Você é um assistente comercial inteligente responsável por responder leads via WhatsApp de forma clara, objetiva e persuasiva, mantendo tom profissional, coletando informações relevantes e direcionando para fechamento quando apropriado.",
  },
  {
    label: "Suporte ao Cliente",
    prompt: "Você é um assistente de suporte ao cliente, responsável por resolver dúvidas e problemas de forma empática, clara e eficiente. Sempre busque resolver na primeira interação.",
  },
  {
    label: "Qualificação de Lead",
    prompt: "Você é um assistente de qualificação de leads. Faça perguntas relevantes para entender necessidades, orçamento e prazo do potencial cliente, classificando o nível de interesse.",
  },
];

function FlowDiagram({ agent }: { agent: any }) {
  const trigger = TRIGGER_TYPES.find((t) => t.value === agent.trigger_type);
  const TriggerIcon = trigger?.icon || Zap;

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      {/* Trigger node */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
        <TriggerIcon className="h-4 w-4" />
        <span className="text-xs font-medium">{trigger?.label || "Trigger"}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      {/* AI node */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
        <Brain className="h-4 w-4" />
        <span className="text-xs font-medium">Agente IA</span>
      </div>
      {(agent.actions || []).map((action: any, i: number) => {
        const at = ACTION_TYPES.find((a) => a.value === action.type);
        const ActionIcon = at?.icon || Zap;
        return (
          <div key={i} className="contents">
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ActionIcon className="h-4 w-4" />
              <span className="text-xs font-medium">{at?.label || action.type}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentEditor({ agent, onClose, apiKeys }: { agent?: any; onClose: () => void; apiKeys: any[] }) {
  const { createAgent, updateAgent } = useAIAgents();
  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [triggerType, setTriggerType] = useState(agent?.trigger_type || "whatsapp");
  const [prompt, setPrompt] = useState(agent?.ai_config?.prompt || SUGGESTED_PROMPTS[0].prompt);
  const [model, setModel] = useState(agent?.ai_config?.model || "");
  const [apiKeyId, setApiKeyId] = useState(agent?.ai_config?.api_key_id || "");
  const [tone, setTone] = useState(agent?.ai_config?.tone || "profissional");
  const [useEmojis, setUseEmojis] = useState(agent?.ai_config?.use_emojis ?? true);
  const [maxResponses, setMaxResponses] = useState(agent?.ai_config?.max_responses || 50);
  const [actions, setActions] = useState<any[]>(agent?.actions || []);
  const [step, setStep] = useState(0); // 0=trigger, 1=ai, 2=actions

  const handleSave = () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      trigger_type: triggerType,
      trigger_config: {},
      ai_config: { prompt, model, api_key_id: apiKeyId, tone, use_emojis: useEmojis, max_responses: maxResponses },
      actions,
    };
    if (agent?.id) {
      updateAgent.mutate({ id: agent.id, ...payload });
    } else {
      createAgent.mutate(payload);
    }
    onClose();
  };

  const addAction = (type: string) => {
    setActions([...actions, { type, config: {} }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {agent ? "Editar Agente" : "Novo Agente de IA"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agent name & description */}
          <div className="space-y-3">
            <div>
              <Label>Nome do Agente</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Assistente de Vendas" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que este agente faz?" />
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            {["Trigger", "Agente IA", "Ações"].map((label, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  step === i
                    ? i === 0 ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : i === 1 ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px]">{i + 1}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Step 0: Trigger */}
          {step === 0 && (
            <div className="space-y-3">
              <Label>Tipo de Trigger (gatilho)</Label>
              <div className="grid grid-cols-2 gap-2">
                {TRIGGER_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTriggerType(t.value)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                      triggerType === t.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <t.icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => setStep(1)} className="mt-2 gap-1">
                Próximo <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Step 1: AI Config */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>API Key / Provedor</Label>
                <Select value={apiKeyId} onValueChange={setApiKeyId}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma API key" /></SelectTrigger>
                  <SelectContent className="z-50 bg-popover border border-border shadow-lg">
                    {apiKeys.filter((k: any) => k.is_active).map((k: any) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.label} ({k.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {apiKeys.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">⚠️ Cadastre uma API key em Configurações → APIs primeiro.</p>
                )}
              </div>

              <div>
                <Label>Modelo (opcional)</Label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: gpt-4o, claude-3-sonnet, etc." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Prompt Principal</Label>
                  <Select onValueChange={(v) => setPrompt(SUGGESTED_PROMPTS[parseInt(v)].prompt)}>
                    <SelectTrigger className="w-auto h-7 text-xs gap-1"><SelectValue placeholder="Usar sugestão" /></SelectTrigger>
                    <SelectContent className="z-50 bg-popover border border-border shadow-lg">
                      {SUGGESTED_PROMPTS.map((s, i) => (
                        <SelectItem key={i} value={String(i)}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} placeholder="Defina o comportamento do agente..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tom de Voz</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-50 bg-popover border border-border shadow-lg">
                      <SelectItem value="profissional">Profissional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="amigavel">Amigável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Limite de respostas/min</Label>
                  <Input type="number" value={maxResponses} onChange={(e) => setMaxResponses(Number(e.target.value))} min={1} max={100} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={useEmojis} onCheckedChange={setUseEmojis} />
                <Label>Usar emojis nas respostas</Label>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStep(0)}>Voltar</Button>
                <Button size="sm" onClick={() => setStep(2)} className="gap-1">
                  Próximo <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Actions */}
          {step === 2 && (
            <div className="space-y-4">
              <Label>Ações após resposta da IA</Label>
              {actions.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma ação adicionada. Adicione ações que serão executadas após a IA processar.</p>
              )}
              {actions.map((action, i) => {
                const at = ACTION_TYPES.find((a) => a.value === action.type);
                const ActionIcon = at?.icon || Zap;
                return (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
                    <ActionIcon className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm flex-1">{at?.label || action.type}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAction(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              <div className="grid grid-cols-2 gap-2">
                {ACTION_TYPES.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => addAction(a.value)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-border hover:border-primary/30 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <a.icon className="h-4 w-4" />
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button size="sm" onClick={handleSave} className="gap-1">
                  {agent ? "Salvar" : "Criar Agente"}
                </Button>
              </div>
            </div>
          )}

          {/* Tutorial box */}
          <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-primary" />
              Como funciona?
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>1. <strong>Trigger</strong> — Define o gatilho que inicia o agente (mensagem, venda, formulário)</p>
              <p>2. <strong>Agente IA</strong> — Processa a informação usando o prompt e modelo configurados</p>
              <p>3. <strong>Ação</strong> — Executa tarefas como enviar mensagem, atualizar CRM, adicionar tags</p>
              <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-[11px]">
                ⚠️ <strong>Evite:</strong> spam em massa, mensagens repetitivas, uso agressivo. Risco de bloqueio no WhatsApp.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AIAgents() {
  const { agents, apiKeys, isLoading, deleteAgent, updateAgent } = useAIAgents();
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <DashboardLayout
      title="Agente de IA"
      subtitle="Crie fluxos automatizados com inteligência artificial"
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Novo Agente
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
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Criar primeiro agente
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent: any) => (
            <div key={agent.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
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
                <div className="flex items-center gap-2">
                  <Badge variant={agent.is_active ? "default" : "secondary"} className="text-[10px]">
                    {agent.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  <Switch
                    checked={agent.is_active}
                    onCheckedChange={(checked) => updateAgent.mutate({ id: agent.id, is_active: checked })}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingAgent(agent)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAgent.mutate(agent.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <FlowDiagram agent={agent} />
            </div>
          ))}
        </div>
      )}

      {(showCreate || editingAgent) && (
        <AgentEditor
          agent={editingAgent}
          apiKeys={apiKeys}
          onClose={() => { setShowCreate(false); setEditingAgent(null); }}
        />
      )}
    </DashboardLayout>
  );
}
