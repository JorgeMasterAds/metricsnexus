import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  ChevronLeft, Save, Play, Brain, Send, Tag, MoveRight, StickyNote,
  MessageSquare, Webhook, MousePointerClick, Zap, Plus, X, Trash2,
  Settings2, Sparkles, Package, ShieldAlert, ExternalLink, BookOpen, Target,
  GitBranch, Filter, Bot, ArrowRight, ScrollText, Shield, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAIAgents } from "@/hooks/useAIAgents";

import { useNavigate } from "react-router-dom";

// ─── Types ──────────────────────────────────────────────────
interface FlowNode {
  id: string;
  type: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

interface FlowConnection {
  from: string;
  to: string;
}

// ─── Node Type Definitions ──────────────────────────────────
const NODE_TYPES: Record<string, {
  label: string;
  icon: any;
  color: string;
  category: string;
  description: string;
}> = {
  start: { label: "Início", icon: Play, color: "#6b7280", category: "trigger", description: "Ponto de partida do fluxo" },
  trigger_whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "#3b82f6", category: "trigger", description: "Ao receber mensagem via WhatsApp" },
  trigger_webhook: { label: "Webhook / Venda", icon: Webhook, color: "#3b82f6", category: "trigger", description: "Ao receber evento de plataforma externa" },
  trigger_form: { label: "Formulário", icon: MousePointerClick, color: "#3b82f6", category: "trigger", description: "Ao enviar formulário do sistema" },
  trigger_manual: { label: "Manual", icon: Play, color: "#3b82f6", category: "trigger", description: "Execução sob demanda" },
  ai_agent: { label: "Agente IA", icon: Brain, color: "#a855f7", category: "ai", description: "Processa com inteligência artificial" },
  send_whatsapp: { label: "Enviar WhatsApp", icon: Send, color: "#10b981", category: "action", description: "Envia mensagem via WhatsApp" },
  send_text: { label: "Enviar Texto", icon: MessageSquare, color: "#10b981", category: "action", description: "Envia mensagem de texto" },
  router: { label: "Roteador", icon: GitBranch, color: "#f59e0b", category: "logic", description: "Redireciona o fluxo baseado em condições" },
  update_lead: { label: "Atualizar Lead", icon: MoveRight, color: "#10b981", category: "action", description: "Move lead no CRM ou atualiza dados" },
  add_tag: { label: "Adicionar Tag", icon: Tag, color: "#10b981", category: "action", description: "Adiciona tag ao lead" },
  add_note: { label: "Registrar Nota", icon: StickyNote, color: "#10b981", category: "action", description: "Adiciona anotação ao lead" },
  filter: { label: "Filtro", icon: Filter, color: "#f59e0b", category: "logic", description: "Filtra baseado em dados do lead" },
};

const NODE_CATEGORIES = [
  { key: "trigger", label: "Triggers / Gatilhos", items: ["trigger_whatsapp", "trigger_webhook", "trigger_form", "trigger_manual"] },
  { key: "ai", label: "Inteligência Artificial", items: ["ai_agent"] },
  { key: "action", label: "Ações", items: ["send_whatsapp", "send_text", "update_lead", "add_tag", "add_note"] },
  { key: "logic", label: "Lógica / Decisão", items: ["router", "filter"] },
];

const MODEL_GROUPS = [
  { provider: "OpenAI", models: [{ value: "gpt-4o", label: "GPT-4o" }, { value: "gpt-4o-mini", label: "GPT-4o Mini" }] },
  { provider: "Anthropic", models: [{ value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" }, { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" }] },
  { provider: "Groq", models: [{ value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B" }, { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B" }] },
];

const PROMPT_TEMPLATES = [
  { label: "Assistente Comercial", icon: Target, prompt: "Você é um assistente comercial inteligente responsável por atender leads via WhatsApp.\n\nObjetivo: Conduzir a conversa de forma natural e persuasiva até o fechamento.\nTom: Profissional, empático e objetivo.\n\nEstratégia:\n1. Cumprimente e identifique o interesse\n2. Colete informações: nome, necessidade, orçamento, prazo\n3. Apresente a solução adequada\n4. Trate objeções com empatia\n5. Direcione para fechamento" },
  { label: "Suporte ao Cliente", icon: BookOpen, prompt: "Você é um assistente de suporte ao cliente.\n\nObjetivo: Resolver a solicitação na primeira interação.\nTom: Empático, paciente e claro.\n\nFluxo:\n1. Cumprimente e pergunte como pode ajudar\n2. Identifique o problema com perguntas objetivas\n3. Ofereça a solução mais direta\n4. Se não resolver, colete dados e encaminhe\n5. Confirme se o problema foi resolvido" },
  { label: "Qualificação de Lead", icon: Sparkles, prompt: "Você é um assistente de qualificação de leads usando BANT.\n\nObjetivo: Qualificar o lead identificando Budget, Authority, Need e Timeline.\n\nFluxo:\n1. Cumprimente e pergunte o interesse\n2. Identifique a necessidade (Need)\n3. Pergunte sobre prazo (Timeline)\n4. Investigue o decisor (Authority)\n5. Entenda o orçamento (Budget)" },
];

// ─── Node Component ─────────────────────────────────────────
const NODE_W = 180;
const NODE_H = 64;
const DOT_R = 7;

function FlowNodeComponent({
  node,
  selected,
  onSelect,
  onDragStart,
  onDotClick,
}: {
  node: FlowNode;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onDotClick: () => void;
}) {
  const def = NODE_TYPES[node.type];
  if (!def) return null;
  const Icon = def.icon;

  return (
    <g>
      {/* Input dot (left center) - except for start */}
      {node.type !== "start" && (
        <circle
          cx={node.x - DOT_R}
          cy={node.y + NODE_H / 2}
          r={DOT_R}
          fill={def.color}
          stroke={def.color}
          strokeWidth="2"
          opacity="0.7"
          className="cursor-pointer"
        />
      )}

      {/* Node body */}
      <rect
        x={node.x} y={node.y}
        width={NODE_W} height={NODE_H}
        rx="14"
        fill={selected ? `${def.color}18` : `${def.color}0a`}
        stroke={selected ? def.color : `${def.color}60`}
        strokeWidth={selected ? "2.5" : "1.5"}
        className="cursor-grab active:cursor-grabbing transition-all"
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      />

      {/* Icon circle */}
      <circle
        cx={node.x + 28} cy={node.y + NODE_H / 2}
        r="14"
        fill={`${def.color}20`}
        stroke={`${def.color}40`}
        strokeWidth="1"
        style={{ pointerEvents: "none" }}
      />

      {/* Icon placeholder (foreignObject for Lucide) */}
      <foreignObject
        x={node.x + 14} y={node.y + NODE_H / 2 - 14}
        width="28" height="28"
        style={{ pointerEvents: "none" }}
      >
        <div className="flex items-center justify-center w-full h-full">
          <Icon className="h-3.5 w-3.5" style={{ color: def.color }} />
        </div>
      </foreignObject>

      {/* Label */}
      <text
        x={node.x + 50} y={node.y + NODE_H / 2 + 1}
        fill="currentColor"
        fontSize="12"
        fontWeight="600"
        dominantBaseline="middle"
        className="fill-foreground"
        style={{ pointerEvents: "none" }}
      >
        {def.label}
      </text>

      {/* Output dot (right center) */}
      <circle
        cx={node.x + NODE_W + DOT_R}
        cy={node.y + NODE_H / 2}
        r={DOT_R}
        fill={def.color}
        stroke="white"
        strokeWidth="2"
        className="cursor-pointer hover:r-[9px] transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onDotClick();
        }}
      />
    </g>
  );
}

// ─── Connection Line ────────────────────────────────────────
function ConnectionLine({ fromNode, toNode }: { fromNode: FlowNode; toNode: FlowNode }) {
  const fromDef = NODE_TYPES[fromNode.type];
  // From right side of source to left side of target
  const x1 = fromNode.x + NODE_W + DOT_R * 2;
  const y1 = fromNode.y + NODE_H / 2;
  const x2 = toNode.x - DOT_R * 2;
  const y2 = toNode.y + NODE_H / 2;

  const midX = (x1 + x2) / 2;
  const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  return (
    <>
      <path d={path} fill="none" stroke={fromDef?.color || "#666"} strokeWidth="2" opacity="0.4" />
      {/* Arrow head */}
      <polygon
        points={`${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4} ${x2},${y2}`}
        fill={fromDef?.color || "#666"}
        opacity="0.6"
      />
    </>
  );
}

// ─── Node Config Panel ──────────────────────────────────────
function NodeConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
  apiKeys,
}: {
  node: FlowNode;
  onUpdate: (config: Record<string, any>) => void;
  onDelete: () => void;
  onClose: () => void;
  apiKeys: any[];
}) {
  const def = NODE_TYPES[node.type];
  if (!def) return null;
  const Icon = def.icon;
  const config = node.config || {};

  if (node.type === "ai_agent") {
    return (
      <div className="w-80 bg-card border-l border-border h-full overflow-y-auto animate-in slide-in-from-right">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${def.color}20` }}>
              <Icon className="h-4 w-4" style={{ color: def.color }} />
            </div>
            <span className="text-sm font-semibold">{def.label}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-4 space-y-5">
          {/* API Key */}
          <div>
            <Label className="text-xs">API Key / Provedor</Label>
            <Select value={config.api_key_id || ""} onValueChange={(v) => onUpdate({ ...config, api_key_id: v })}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {apiKeys.filter((k: any) => k.is_active).map((k: any) => (
                  <SelectItem key={k.id} value={k.id}>{k.label} ({k.provider})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Models */}
          <div>
            <Label className="text-xs">Modelo para leitura</Label>
            <Select value={config.read_model || ""} onValueChange={(v) => onUpdate({ ...config, read_model: v })}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {MODEL_GROUPS.map((g) => (
                  <SelectGroup key={g.provider}>
                    <SelectLabel className="text-[10px] font-bold">{g.provider}</SelectLabel>
                    {g.models.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Modelo para resposta</Label>
            <Select value={config.response_model || ""} onValueChange={(v) => onUpdate({ ...config, response_model: v })}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {MODEL_GROUPS.map((g) => (
                  <SelectGroup key={g.provider}>
                    <SelectLabel className="text-[10px] font-bold">{g.provider}</SelectLabel>
                    {g.models.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Templates */}
          <div>
            <Label className="text-xs mb-2 block">Templates de prompt</Label>
            <div className="space-y-1.5">
              {PROMPT_TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => onUpdate({ ...config, prompt: t.prompt })}
                  className="flex items-center gap-2 w-full p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 text-left transition-all">
                  <t.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-[11px] font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <Label className="text-xs">Prompt do agente</Label>
            <Textarea className="mt-1 font-mono text-[10px]" value={config.prompt || ""} onChange={(e) => onUpdate({ ...config, prompt: e.target.value })} rows={10} />
          </div>

          {/* Product context */}
          <div>
            <Label className="text-xs">Nome do produto</Label>
            <Input className="mt-1 text-xs" value={config.product_name || ""} onChange={(e) => onUpdate({ ...config, product_name: e.target.value })} placeholder="Ex: Curso de Marketing" />
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tom de voz</Label>
              <Select value={config.tone || "profissional"} onValueChange={(v) => onUpdate({ ...config, tone: v })}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="amigavel">Amigável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={config.use_emojis ?? true} onCheckedChange={(v) => onUpdate({ ...config, use_emojis: v })} />
              <Label className="text-xs">Emojis</Label>
            </div>
          </div>

          <Button variant="destructive" size="sm" className="w-full text-xs gap-1.5 mt-4" onClick={onDelete}>
            <Trash2 className="h-3 w-3" /> Remover bloco
          </Button>
        </div>
      </div>
    );
  }

  // Generic config panel for triggers and actions
  return (
    <div className="w-72 bg-card border-l border-border h-full overflow-y-auto animate-in slide-in-from-right">
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${def.color}20` }}>
            <Icon className="h-4 w-4" style={{ color: def.color }} />
          </div>
          <span className="text-sm font-semibold">{def.label}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs text-muted-foreground">{def.description}</p>

        {node.type === "router" && (
          <div>
            <Label className="text-xs">Condição</Label>
            <Textarea className="mt-1 text-xs" value={config.condition || ""} onChange={(e) => onUpdate({ ...config, condition: e.target.value })} rows={3} placeholder="Ex: Se lead.source = 'whatsapp'" />
          </div>
        )}
        {node.type === "filter" && (
          <div>
            <Label className="text-xs">Filtrar por</Label>
            <Input className="mt-1 text-xs" value={config.field || ""} onChange={(e) => onUpdate({ ...config, field: e.target.value })} placeholder="Ex: lead.phone" />
          </div>
        )}
        {node.type === "send_text" && (
          <div>
            <Label className="text-xs">Mensagem</Label>
            <Textarea className="mt-1 text-xs" value={config.message || ""} onChange={(e) => onUpdate({ ...config, message: e.target.value })} rows={4} placeholder="Texto da mensagem..." />
          </div>
        )}
        {node.type === "add_tag" && (
          <div>
            <Label className="text-xs">Nome da tag</Label>
            <Input className="mt-1 text-xs" value={config.tag_name || ""} onChange={(e) => onUpdate({ ...config, tag_name: e.target.value })} placeholder="Ex: quente" />
          </div>
        )}
        {node.type === "add_note" && (
          <div>
            <Label className="text-xs">Conteúdo da nota</Label>
            <Textarea className="mt-1 text-xs" value={config.note || ""} onChange={(e) => onUpdate({ ...config, note: e.target.value })} rows={3} placeholder="Texto da anotação..." />
          </div>
        )}

        {node.type !== "start" && (
          <Button variant="destructive" size="sm" className="w-full text-xs gap-1.5 mt-4" onClick={onDelete}>
            <Trash2 className="h-3 w-3" /> Remover bloco
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Node Picker Dialog ─────────────────────────────────────
function NodePickerDialog({
  open,
  onClose,
  onSelect,
  existingTypes,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
  existingTypes: string[];
}) {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    return NODE_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((t) => {
        if (t === "start") return false;
        if (cat.key === "trigger" && existingTypes.some((et) => et.startsWith("trigger_"))) return false;
        const def = NODE_TYPES[t];
        if (search && !def.label.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    })).filter((cat) => cat.items.length > 0);
  }, [search, existingTypes]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">Selecione um bloco</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Filtrar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs"
          autoFocus
        />
        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-4 py-2">
            {filteredCategories.map((cat) => (
              <div key={cat.key}>
                <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase mb-2">{cat.label}</p>
                <div className="space-y-1">
                  {cat.items.map((type) => {
                    const def = NODE_TYPES[type];
                    const Icon = def.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => { onSelect(type); onClose(); }}
                        className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                      >
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${def.color}15` }}>
                          <Icon className="h-4 w-4" style={{ color: def.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{def.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Flow Editor ───────────────────────────────────────
interface AgentFlowEditorProps {
  agent: any;
  apiKeys: any[];
  onClose: () => void;
}

export default function AgentFlowEditor({ agent, apiKeys, onClose }: AgentFlowEditorProps) {
  const { updateAgent, agents } = useAIAgents();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("fluxo");

  // Parse existing flow data from agent
  const initialNodes = useMemo((): FlowNode[] => {
    const saved = agent.ai_config?.flow_nodes;
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;

    // Build from legacy data - horizontal layout
    const nodes: FlowNode[] = [
      { id: "start", type: "start", x: 60, y: 200, config: {} },
    ];

    if (agent.trigger_type && agent.trigger_type !== "manual") {
      nodes.push({ id: "trigger", type: `trigger_${agent.trigger_type}`, x: 320, y: 200, config: agent.trigger_config || {} });
    }

    nodes.push({
      id: "ai",
      type: "ai_agent",
      x: nodes.length * 260 + 60,
      y: 200,
      config: {
        prompt: agent.ai_config?.prompt || "",
        read_model: agent.ai_config?.read_model || agent.ai_config?.model || "",
        response_model: agent.ai_config?.response_model || agent.ai_config?.model || "",
        api_key_id: agent.ai_config?.api_key_id || "",
        tone: agent.ai_config?.tone || "profissional",
        use_emojis: agent.ai_config?.use_emojis ?? true,
        product_name: agent.ai_config?.product_name || "",
      },
    });

    (agent.actions || []).forEach((action: any, i: number) => {
      nodes.push({
        id: `action-${i}`,
        type: action.type,
        x: nodes.length * 260 + 60,
        y: 200,
        config: action.config || {},
      });
    });

    return nodes;
  }, []);

  const initialConnections = useMemo((): FlowConnection[] => {
    const saved = agent.ai_config?.flow_connections;
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;

    const conns: FlowConnection[] = [];
    const nodes = initialNodes;
    for (let i = 0; i < nodes.length - 1; i++) {
      conns.push({ from: nodes[i].id, to: nodes[i + 1].id });
    }
    return conns;
  }, [initialNodes]);

  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [connections, setConnections] = useState<FlowConnection[]>(initialConnections);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ nodeId: string; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean } | null>(null);
  const [isActive, setIsActive] = useState(agent.is_active);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Drag handling - separate drag from click
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + canvas.scrollLeft - dragState.offsetX;
      const y = e.clientY - rect.top + canvas.scrollTop - dragState.offsetY;

      const dx = Math.abs(e.clientX - dragState.startX);
      const dy = Math.abs(e.clientY - dragState.startY);

      if (dx > 4 || dy > 4) {
        setDragState(prev => prev ? { ...prev, moved: true } : null);
      }

      setNodes((prev) =>
        prev.map((n) => n.id === dragState.nodeId ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n)
      );
    };

    const handleMouseUp = () => setDragState(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState]);

  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const rect = canvas.getBoundingClientRect();
    setDragState({
      nodeId,
      offsetX: e.clientX - rect.left + canvas.scrollLeft - node.x,
      offsetY: e.clientY - rect.top + canvas.scrollTop - node.y,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    });
  }, [nodes]);

  const handleNodeClick = useCallback((nodeId: string) => {
    // Only select if we didn't drag
    if (dragState?.moved) return;
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
  }, [dragState]);

  const handleDotClick = useCallback((nodeId: string) => {
    setConnectingFromId(nodeId);
    setShowNodePicker(true);
  }, []);

  const handleAddNode = useCallback((type: string) => {
    const fromNode = connectingFromId ? nodes.find((n) => n.id === connectingFromId) : null;
    const newId = `node-${Date.now()}`;
    const x = fromNode ? fromNode.x + NODE_W + 100 : (nodes.length * 260) + 60;
    const y = fromNode ? fromNode.y : 200;

    const newNode: FlowNode = { id: newId, type, x, y, config: {} };
    setNodes((prev) => [...prev, newNode]);

    if (connectingFromId) {
      setConnections((prev) => [...prev, { from: connectingFromId, to: newId }]);
    }
    setConnectingFromId(null);
    setSelectedNodeId(newId);
  }, [connectingFromId, nodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === "start") return;
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.from !== nodeId && c.to !== nodeId));
    setSelectedNodeId(null);
  }, []);

  const handleUpdateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes((prev) =>
      prev.map((n) => n.id === nodeId ? { ...n, config } : n)
    );
  }, []);

  const handleSave = useCallback(() => {
    const triggerNode = nodes.find((n) => n.type.startsWith("trigger_"));
    const aiNode = nodes.find((n) => n.type === "ai_agent");
    const actionNodes = nodes.filter((n) =>
      ["send_whatsapp", "send_text", "update_lead", "add_tag", "add_note"].includes(n.type)
    );

    const triggerType = triggerNode?.type.replace("trigger_", "") || "manual";

    const payload: Record<string, any> = {
      id: agent.id,
      trigger_type: triggerType,
      trigger_config: triggerNode?.config || {},
      is_active: isActive,
      ai_config: {
        ...(aiNode?.config || {}),
        model: aiNode?.config?.response_model || aiNode?.config?.read_model || "",
        flow_nodes: nodes,
        flow_connections: connections,
      },
      actions: actionNodes.map((n) => ({ type: n.type, config: n.config })),
    };

    updateAgent.mutate(payload as any);
    onClose();
  }, [nodes, connections, isActive, agent.id]);

  // Canvas dimensions
  const canvasW = Math.max(2000, ...nodes.map((n) => n.x + NODE_W + 200));
  const canvasH = Math.max(800, ...nodes.map((n) => n.y + NODE_H + 200));

  const existingTypes = nodes.map((n) => n.type);

  // Agent limit info
  const maxAgents = 3; // default

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-xs">
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{agent.name}</span>
          </div>
          <div className="h-5 w-px bg-border" />
          {/* Tab navigation */}
          <div className="flex items-center gap-1">
            {[
              { key: "fluxo", label: "Fluxo", icon: GitBranch },
              { key: "regras", label: "Regras", icon: ScrollText },
              { key: "politica", label: "Política de uso", icon: Shield },
              { key: "canais", label: "Canais", icon: Radio },
              { key: "produtos", label: "Produtos", icon: Package },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <span className="text-xs text-muted-foreground">{isActive ? "Ativo" : "Inativo"}</span>
          </div>
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "fluxo" ? (
          <>
            {/* Canvas */}
            <div
              ref={canvasRef}
              className="flex-1 overflow-auto relative"
              style={{ background: "radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
              onClick={() => setSelectedNodeId(null)}
            >
              <svg width={canvasW} height={canvasH} className="absolute inset-0">
                {/* Connections */}
                {connections.map((conn, i) => {
                  const fromNode = nodes.find((n) => n.id === conn.from);
                  const toNode = nodes.find((n) => n.id === conn.to);
                  if (!fromNode || !toNode) return null;
                  return <ConnectionLine key={i} fromNode={fromNode} toNode={toNode} />;
                })}

                {/* Nodes */}
                {nodes.map((node) => (
                  <FlowNodeComponent
                    key={node.id}
                    node={node}
                    selected={selectedNodeId === node.id}
                    onSelect={() => handleNodeClick(node.id)}
                    onDragStart={(e) => handleNodeDragStart(node.id, e)}
                    onDotClick={() => handleDotClick(node.id)}
                  />
                ))}
              </svg>

              {/* Floating add button */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs shadow-lg bg-card"
                  onClick={() => { setConnectingFromId(null); setShowNodePicker(true); }}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar bloco
                </Button>
              </div>
            </div>

            {/* Config panel */}
            {selectedNode && (
              <NodeConfigPanel
                node={selectedNode}
                onUpdate={(config) => handleUpdateNodeConfig(selectedNode.id, config)}
                onDelete={() => handleDeleteNode(selectedNode.id)}
                onClose={() => setSelectedNodeId(null)}
                apiKeys={apiKeys}
              />
            )}
          </>
        ) : (
          <div className="flex-1 overflow-auto p-8 max-w-2xl mx-auto">
            {activeTab === "regras" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Regras do agente</h2>
                <p className="text-sm text-muted-foreground">Configure regras de comportamento para o agente de IA.</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Mensagem de boas-vindas</Label>
                    <Textarea className="mt-1 text-xs" rows={3} placeholder="Olá! Como posso ajudar?" />
                  </div>
                  <div>
                    <Label className="text-xs">Horário de funcionamento</Label>
                    <Input className="mt-1 text-xs" placeholder="Ex: 08:00 - 18:00" />
                  </div>
                  <div>
                    <Label className="text-xs">Máximo de mensagens por conversa</Label>
                    <Input className="mt-1 text-xs" type="number" placeholder="50" />
                  </div>
                  <div>
                    <Label className="text-xs">Tempo limite de inatividade (minutos)</Label>
                    <Input className="mt-1 text-xs" type="number" placeholder="30" />
                  </div>
                </div>
              </div>
            )}
            {activeTab === "politica" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Política de uso</h2>
                <p className="text-sm text-muted-foreground">Defina políticas e restrições para o agente.</p>
                <div>
                  <Label className="text-xs">Tópicos proibidos</Label>
                  <Textarea className="mt-1 text-xs" rows={4} placeholder="Liste tópicos que o agente não deve abordar..." />
                </div>
                <div>
                  <Label className="text-xs">Instrução de encerramento</Label>
                  <Textarea className="mt-1 text-xs" rows={3} placeholder="Quando encerrar e redirecionar para humano..." />
                </div>
              </div>
            )}
            {activeTab === "canais" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Canais de comunicação</h2>
                <p className="text-sm text-muted-foreground">Selecione os canais onde o agente vai atuar.</p>
                <div className="space-y-2">
                  {[
                    { label: "WhatsApp", icon: MessageSquare, desc: "Atendimento via WhatsApp Business" },
                    { label: "Webhook", icon: Webhook, desc: "Recebimento de eventos externos" },
                    { label: "Formulário", icon: MousePointerClick, desc: "Formulários de captura de leads" },
                  ].map((ch) => (
                    <div key={ch.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <ch.icon className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{ch.label}</p>
                          <p className="text-xs text-muted-foreground">{ch.desc}</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "produtos" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Produtos vinculados</h2>
                <p className="text-sm text-muted-foreground">Vincule produtos para o agente ter conhecimento sobre eles.</p>
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum produto vinculado.</p>
                  <Button variant="outline" size="sm" className="mt-3 text-xs gap-1.5">
                    <Plus className="h-3 w-3" /> Vincular produto
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node picker */}
      <NodePickerDialog
        open={showNodePicker}
        onClose={() => { setShowNodePicker(false); setConnectingFromId(null); }}
        onSelect={handleAddNode}
        existingTypes={existingTypes}
      />
    </div>
  );
}
