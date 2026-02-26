import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAIAgents } from "@/hooks/useAIAgents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus, Bot, Trash2, Edit2, Play, Zap, MessageSquare, Webhook,
  MousePointerClick, Brain, Send, Tag, MoveRight, StickyNote,
  Info, ChevronLeft, ArrowRight, ExternalLink,
  Sparkles, ShieldAlert, BookOpen, Package, Target, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────
const TRIGGER_TYPES = [
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare, desc: "Ao receber mensagem via WhatsApp", color: "blue" },
  { value: "webhook", label: "Webhook / Venda", icon: Webhook, desc: "Ao receber evento de plataforma externa", color: "blue" },
  { value: "form", label: "Formulário", icon: MousePointerClick, desc: "Ao enviar formulário do sistema", color: "blue" },
  { value: "manual", label: "Manual", icon: Play, desc: "Execução sob demanda pelo painel", color: "blue" },
];

const ACTION_TYPES = [
  { value: "send_whatsapp", label: "Enviar WhatsApp", icon: Send },
  { value: "update_lead_status", label: "Mover Lead no CRM", icon: MoveRight },
  { value: "add_tag", label: "Adicionar Tag", icon: Tag },
  { value: "add_note", label: "Registrar Anotação", icon: StickyNote },
];

const MODEL_GROUPS = [
  {
    provider: "OpenAI",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
  },
  {
    provider: "Anthropic",
    models: [
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ],
  },
  {
    provider: "Groq",
    models: [
      { value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B" },
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
  },
];

const PROMPT_TEMPLATES = [
  {
    label: "Assistente Comercial",
    icon: Target,
    prompt: `Você é um assistente comercial inteligente responsável por atender leads via WhatsApp.

**Objetivo:** Conduzir a conversa de forma natural e persuasiva até o fechamento ou agendamento.

**Tom de voz:** Profissional, empático e objetivo. Nunca seja agressivo ou insistente.

**Estratégia de condução:**
1. Cumprimente e identifique o interesse do lead
2. Colete informações relevantes: nome, necessidade, orçamento estimado, prazo
3. Apresente a solução mais adequada com base nas informações coletadas
4. Trate objeções com empatia, oferecendo alternativas quando possível
5. Direcione para fechamento ou próximo passo concreto (reunião, proposta, link de pagamento)

**Restrições:**
- Nunca prometa o que não pode cumprir
- Não invente preços ou condições — use apenas as informações fornecidas no contexto
- Se não souber responder, diga que vai verificar e retornará
- Máximo de 3 mensagens consecutivas sem resposta do lead — pare de enviar`,
  },
  {
    label: "Suporte ao Cliente",
    icon: BookOpen,
    prompt: `Você é um assistente de suporte ao cliente, responsável por resolver dúvidas e problemas.

**Objetivo:** Resolver a solicitação na primeira interação sempre que possível.

**Tom de voz:** Empático, paciente e claro. Demonstre que entende a frustração do cliente.

**Fluxo de atendimento:**
1. Cumprimente e pergunte como pode ajudar
2. Identifique o problema com perguntas objetivas
3. Ofereça a solução mais direta disponível
4. Se não conseguir resolver, colete dados (nome, e-mail, descrição do problema) e encaminhe para a equipe responsável
5. Confirme se o problema foi resolvido antes de encerrar

**Restrições:**
- Nunca culpe o cliente pelo problema
- Não forneça informações técnicas excessivas — seja simples e direto
- Se o cliente estiver irritado, demonstre empatia antes de tentar resolver
- Sempre finalize perguntando se há algo mais em que possa ajudar`,
  },
  {
    label: "Qualificação de Lead",
    icon: Sparkles,
    prompt: `Você é um assistente de qualificação de leads usando a metodologia BANT.

**Objetivo:** Qualificar o lead identificando Budget (orçamento), Authority (autoridade), Need (necessidade) e Timeline (prazo).

**Fluxo de qualificação:**
1. Cumprimente e pergunte qual o interesse ou necessidade
2. Identifique a necessidade específica (Need)
3. Pergunte sobre o prazo desejado (Timeline)
4. Investigue quem toma a decisão (Authority)
5. Entenda o orçamento disponível (Budget) — de forma sutil

**Classificação de temperatura:**
- 🔥 Quente: Tem orçamento, é decisor, precisa urgente
- 🟡 Morno: Interesse real, mas falta algum critério BANT
- 🔵 Frio: Apenas curiosidade, sem urgência ou orçamento

**Direcionamento:**
- Quente → Encaminhar para time comercial imediatamente
- Morno → Nutrir com conteúdo e agendar follow-up
- Frio → Agradecer e adicionar à lista de nutrição

**Restrições:**
- Não force respostas — se o lead não quiser informar orçamento, respeite
- Máximo de 5 perguntas de qualificação por conversa`,
  },
];

// ─── n8n-style Flow Preview ─────────────────────────────────
function FlowPreview({
  triggerType,
  actions,
  onClickSection,
}: {
  triggerType: string;
  actions: any[];
  onClickSection: (section: string) => void;
}) {
  const trigger = TRIGGER_TYPES.find((t) => t.value === triggerType);
  const TriggerIcon = trigger?.icon || Zap;

  const nodes = [
    { id: "trigger", label: trigger?.label || "Trigger", Icon: TriggerIcon, color: "blue" },
    { id: "ai", label: "Agente IA", Icon: Brain, color: "purple" },
    ...actions.map((a: any, i: number) => {
      const at = ACTION_TYPES.find((x) => x.value === a.type);
      return { id: `action-${i}`, label: at?.label || a.type, Icon: at?.icon || Zap, color: "emerald" };
    }),
  ];

  const nodeW = 200;
  const nodeH = 56;
  const gap = 48;
  const dotRadius = 6;
  const startY = 32;
  const centerX = 140;

  const colorMap: Record<string, { bg: string; border: string; text: string; line: string; dot: string }> = {
    blue: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.4)", text: "#60a5fa", line: "#3b82f6", dot: "#3b82f6" },
    purple: { bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.4)", text: "#c084fc", line: "#a855f7", dot: "#a855f7" },
    emerald: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.4)", text: "#34d399", line: "#10b981", dot: "#10b981" },
  };

  const svgHeight = Math.max(300, nodes.length * (nodeH + gap) + 60);

  return (
    <div className="sticky top-24">
      <h3 className="text-xs font-semibold text-muted-foreground mb-4">
        Fluxo de automação
      </h3>
      <div className="rounded-xl border border-border bg-card/50 p-5">
        <svg width="280" height={svgHeight} className="w-full">
          {nodes.map((node, i) => {
            const y = startY + i * (nodeH + gap);
            const c = colorMap[node.color] || colorMap.blue;

            return (
              <g key={node.id}>
                {/* Connection line + dots (n8n style) */}
                {i > 0 && (() => {
                  const prevY = startY + (i - 1) * (nodeH + gap);
                  const prevC = colorMap[nodes[i - 1].color] || colorMap.blue;
                  return (
                    <>
                      {/* Output dot on previous node */}
                      <circle cx={centerX} cy={prevY + nodeH + dotRadius} r={dotRadius}
                        fill={prevC.dot} stroke={prevC.border} strokeWidth="2" className="cursor-pointer" />
                      {/* Connection line */}
                      <line
                        x1={centerX} y1={prevY + nodeH + dotRadius * 2}
                        x2={centerX} y2={y - dotRadius * 2}
                        stroke={prevC.line} strokeWidth="2" opacity="0.5"
                      />
                      {/* Input dot on current node */}
                      <circle cx={centerX} cy={y - dotRadius} r={dotRadius}
                        fill={c.dot} stroke={c.border} strokeWidth="2" className="cursor-pointer" />
                    </>
                  );
                })()}

                {/* Node box */}
                <rect
                  x={centerX - nodeW / 2} y={y} width={nodeW} height={nodeH}
                  rx="14" fill={c.bg} stroke={c.border} strokeWidth="1.5"
                  className="cursor-pointer transition-opacity"
                  onClick={() => onClickSection(node.id.startsWith("action") ? "actions" : node.id === "ai" ? "ai" : "trigger")}
                />

                {/* Node label */}
                <text x={centerX} y={y + nodeH / 2 + 5} textAnchor="middle" fill={c.text} fontSize="13" fontWeight="600">
                  {node.label}
                </text>
              </g>
            );
          })}

          {nodes.length === 0 && (
            <text x={centerX} y={100} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
              Configure o fluxo ao lado
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}

// ─── Model Select (grouped by provider) ─────────────────────
function ModelSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Selecione o modelo" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover border border-border shadow-lg">
          {MODEL_GROUPS.map((group) => (
            <SelectGroup key={group.provider}>
              <SelectLabel className="text-xs font-bold text-muted-foreground">{group.provider}</SelectLabel>
              {group.models.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Full-Page Agent Editor ─────────────────────────────────
function AgentEditorPage({
  agent,
  onClose,
  apiKeys,
}: {
  agent?: any;
  onClose: () => void;
  apiKeys: any[];
}) {
  const navigate = useNavigate();
  const { createAgent, updateAgent } = useAIAgents();

  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [triggerType, setTriggerType] = useState(agent?.trigger_type || "whatsapp");
  const [prompt, setPrompt] = useState(agent?.ai_config?.prompt || PROMPT_TEMPLATES[0].prompt);
  const [readModel, setReadModel] = useState(agent?.ai_config?.read_model || agent?.ai_config?.model || "");
  const [responseModel, setResponseModel] = useState(agent?.ai_config?.response_model || agent?.ai_config?.model || "");
  const [apiKeyId, setApiKeyId] = useState(agent?.ai_config?.api_key_id || "");
  const [tone, setTone] = useState(agent?.ai_config?.tone || "profissional");
  const [useEmojis, setUseEmojis] = useState(agent?.ai_config?.use_emojis ?? true);
  const [maxResponses, setMaxResponses] = useState(agent?.ai_config?.max_responses || 10);
  const [actions, setActions] = useState<any[]>(agent?.actions || []);

  const [productName, setProductName] = useState(agent?.ai_config?.product_name || "");
  const [valueProposition, setValueProposition] = useState(agent?.ai_config?.value_proposition || "");
  const [commonObjections, setCommonObjections] = useState(agent?.ai_config?.common_objections || "");
  const [differentials, setDifferentials] = useState(agent?.ai_config?.differentials || "");

  const sectionRefs = {
    trigger: useRef<HTMLDivElement>(null),
    ai: useRef<HTMLDivElement>(null),
    prompt: useRef<HTMLDivElement>(null),
    context: useRef<HTMLDivElement>(null),
    config: useRef<HTMLDivElement>(null),
    actions: useRef<HTMLDivElement>(null),
  };

  const scrollToSection = useCallback((section: string) => {
    const ref = sectionRefs[section as keyof typeof sectionRefs];
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      trigger_type: triggerType,
      trigger_config: {},
      ai_config: {
        prompt, model: responseModel || readModel, read_model: readModel,
        response_model: responseModel, api_key_id: apiKeyId, tone,
        use_emojis: useEmojis, max_responses: maxResponses,
        product_name: productName, value_proposition: valueProposition,
        common_objections: commonObjections, differentials,
      },
      actions,
    };
    if (agent?.id) { updateAgent.mutate({ id: agent.id, ...payload }); }
    else { createAgent.mutate(payload); }
    onClose();
  };

  const addAction = (type: string) => setActions([...actions, { type, config: {} }]);
  const removeAction = (index: number) => setActions(actions.filter((_, i) => i !== index));

  return (
    <DashboardLayout
      title={agent ? "Editar agente" : "Novo agente de IA"}
      subtitle="Configure o fluxo de automação passo a passo"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onClose} className="gap-1.5 text-xs">
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> {agent ? "Salvar" : "Criar agente"}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column — Configuration sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Basic Info */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> Informações básicas
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nome do agente</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Assistente de Vendas WhatsApp" />
              </div>
              <div>
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva brevemente o objetivo deste agente" />
              </div>
            </div>
          </section>

          {/* 2. Trigger */}
          <section ref={sectionRefs.trigger} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" /> Trigger (gatilho)
            </h2>
            <p className="text-xs text-muted-foreground">Escolha o evento que ativa este agente automaticamente.</p>
            <div className="grid grid-cols-2 gap-3">
              {TRIGGER_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTriggerType(t.value)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                    triggerType === t.value
                      ? "border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/20"
                      : "border-border hover:border-blue-500/20 hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    triggerType === t.value ? "bg-blue-500/15 text-blue-400" : "bg-muted text-muted-foreground"
                  )}>
                    <t.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 3. AI Model */}
          <section ref={sectionRefs.ai} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400" /> Modelo de IA
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">API Key / Provedor</Label>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-primary"
                    onClick={() => navigate("/settings?tab=apis")}>
                    <ExternalLink className="h-3 w-3" /> Criar nova API Key
                  </Button>
                </div>
                <Select value={apiKeyId} onValueChange={setApiKeyId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma API key configurada" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover border border-border shadow-lg">
                    {apiKeys.filter((k: any) => k.is_active).map((k: any) => (
                      <SelectItem key={k.id} value={k.id}>{k.label} ({k.provider})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {apiKeys.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Nenhuma API key cadastrada. Configure em Configurações → APIs.
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ModelSelect value={readModel} onChange={setReadModel} label="Modelo para leitura (interpretar mensagem)" />
                <ModelSelect value={responseModel} onChange={setResponseModel} label="Modelo para resposta (gerar resposta)" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Você pode usar modelos diferentes para leitura e resposta. Ex: GPT-4o Mini para interpretar e Claude 3.5 Sonnet para responder.
              </p>
            </div>
          </section>

          {/* 4. Prompt */}
          <section ref={sectionRefs.prompt} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" /> Prompt principal
            </h2>
            <div>
              <Label className="text-xs mb-2 block">Templates pré-configurados</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PROMPT_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => setPrompt(t.prompt)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 text-left transition-all">
                    <t.icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Prompt do agente</Label>
              <Textarea className="mt-1 font-mono text-xs" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                rows={12} placeholder="Defina o comportamento, objetivo e regras do agente..." />
            </div>
          </section>

          {/* 5. Product Context */}
          <section ref={sectionRefs.context} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-400" /> Contexto do produto
            </h2>
            <p className="text-xs text-muted-foreground">
              Essas informações serão incluídas automaticamente no contexto da IA para respostas mais precisas.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nome do produto / serviço</Label>
                <Input className="mt-1" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ex: Curso de Marketing Digital" />
              </div>
              <div>
                <Label className="text-xs">Proposta de valor</Label>
                <Input className="mt-1" value={valueProposition} onChange={(e) => setValueProposition(e.target.value)} placeholder="O que torna seu produto único?" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Objeções comuns e respostas</Label>
              <Textarea className="mt-1 text-xs" value={commonObjections} onChange={(e) => setCommonObjections(e.target.value)}
                rows={3} placeholder='Ex: "É caro" → Oferecemos parcelamento em 12x e garantia de 30 dias' />
            </div>
            <div>
              <Label className="text-xs">Diferenciais competitivos</Label>
              <Textarea className="mt-1 text-xs" value={differentials} onChange={(e) => setDifferentials(e.target.value)}
                rows={2} placeholder="Ex: Suporte 24h, comunidade exclusiva, certificado reconhecido" />
            </div>
          </section>

          {/* 6. Settings */}
          <section ref={sectionRefs.config} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" /> Configurações
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Tom de voz</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-50 bg-popover border border-border shadow-lg">
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="amigavel">Amigável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Limite de execuções/min</Label>
                <Input className="mt-1" type="number" value={maxResponses} onChange={(e) => setMaxResponses(Number(e.target.value))} min={1} max={100} />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch checked={useEmojis} onCheckedChange={setUseEmojis} />
                <Label className="text-xs">Usar emojis</Label>
              </div>
            </div>
          </section>

          {/* 7. Actions */}
          <section ref={sectionRefs.actions} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-400" /> Ações pós-IA
            </h2>
            <p className="text-xs text-muted-foreground">
              Defina o que acontece após o agente processar — enviar mensagem, atualizar CRM, etc.
            </p>
            {actions.length > 0 && (
              <div className="space-y-2">
                {actions.map((action, i) => {
                  const at = ACTION_TYPES.find((a) => a.value === action.type);
                  const ActionIcon = at?.icon || Zap;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                      <ActionIcon className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm flex-1">{at?.label || action.type}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeAction(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {ACTION_TYPES.map((a) => (
                <button key={a.value} onClick={() => addAction(a.value)}
                  className="flex items-center gap-2.5 p-3 rounded-lg border border-dashed border-border hover:border-emerald-500/30 hover:bg-emerald-500/5 text-sm text-muted-foreground hover:text-foreground transition-all">
                  <a.icon className="h-4 w-4" /> {a.label}
                </button>
              ))}
            </div>
          </section>

          {/* Tutorial */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Como funciona
            </h2>
            <div className="text-xs text-muted-foreground space-y-2">
              <p><strong>1. Trigger</strong> — O gatilho que inicia o agente (ex: mensagem no WhatsApp, nova venda via webhook, envio de formulário).</p>
              <p><strong>2. Agente IA</strong> — Processa a informação usando o prompt, modelo e contexto do produto configurados.</p>
              <p><strong>3. Ações</strong> — Executam tarefas automaticamente: enviar mensagem, mover lead no Kanban, adicionar tags, registrar anotações.</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1.5">
              <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> Boas práticas — Evite bloqueio
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                <li>Evite spam em massa, mensagens repetitivas e linguagem agressiva para não comprometer seu número</li>
                <li>Respeite limites de envio (máx ~200 msg/dia para contas novas no WhatsApp)</li>
                <li>Use um número exclusivo para automação, nunca seu número pessoal</li>
                <li>Configure limites de execução por minuto para evitar sobrecarga</li>
                <li>Teste o agente com poucos contatos antes de escalar</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Right column — Visual flow preview (sticky to viewport) */}
        <div className="hidden lg:block">
          <FlowPreview triggerType={triggerType} actions={actions} onClickSection={scrollToSection} />
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Agent List Page ────────────────────────────────────────
export default function AIAgents() {
  const { agents, apiKeys, isLoading, deleteAgent, updateAgent } = useAIAgents();
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (showCreate || editingAgent) {
    return (
      <AgentEditorPage
        agent={editingAgent}
        apiKeys={apiKeys}
        onClose={() => { setShowCreate(false); setEditingAgent(null); }}
      />
    );
  }

  return (
    <DashboardLayout
      title="Agente de IA"
      subtitle="Crie fluxos automatizados com inteligência artificial"
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
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
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Criar primeiro agente
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent: any) => {
            const trigger = TRIGGER_TYPES.find((t) => t.value === agent.trigger_type);
            const TriggerIcon = trigger?.icon || Zap;
            return (
              <div key={agent.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
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
                    <Switch checked={agent.is_active} onCheckedChange={(checked) => updateAgent.mutate({ id: agent.id, is_active: checked })} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingAgent(agent)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteAgent.mutate(agent.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {/* Mini flow diagram */}
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
                    <TriggerIcon className="h-3.5 w-3.5" /> {trigger?.label}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium">
                    <Brain className="h-3.5 w-3.5" /> IA
                  </div>
                  {(agent.actions || []).map((action: any, i: number) => {
                    const at = ACTION_TYPES.find((a) => a.value === action.type);
                    const ActionIcon = at?.icon || Zap;
                    return (
                      <div key={i} className="contents">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                          <ActionIcon className="h-3.5 w-3.5" /> {at?.label}
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
    </DashboardLayout>
  );
}
