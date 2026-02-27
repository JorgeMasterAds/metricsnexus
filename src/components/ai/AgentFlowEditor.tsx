import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  ChevronLeft, Save, Play, Brain, Send, Tag, MoveRight, StickyNote,
  MessageSquare, Webhook, MousePointerClick, Zap, Plus, X, Trash2,
  Settings2, Sparkles, Package, ShieldAlert, ExternalLink, BookOpen, Target,
  GitBranch, Filter, Bot, ArrowRight, ScrollText, Shield, Radio, Edit2, Check,
  Clock, AlertTriangle, UserX, Volume2, Ban, FileText, Link2,
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";

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
  send_message: { label: "Enviar Mensagem", icon: Send, color: "#10b981", category: "action", description: "Envia mensagem pelo canal configurado" },
  send_text: { label: "Enviar Texto", icon: MessageSquare, color: "#10b981", category: "action", description: "Envia mensagem de texto" },
  router: { label: "Roteador", icon: GitBranch, color: "#f59e0b", category: "logic", description: "Redireciona o fluxo baseado em condições" },
  update_lead: { label: "Atualizar Lead", icon: MoveRight, color: "#10b981", category: "action", description: "Move lead no CRM ou atualiza dados" },
  add_tag: { label: "Adicionar Tag", icon: Tag, color: "#10b981", category: "action", description: "Adiciona tag ao lead" },
  add_note: { label: "Registrar Nota", icon: StickyNote, color: "#10b981", category: "action", description: "Adiciona anotação ao lead" },
  filter: { label: "Filtro", icon: Filter, color: "#f59e0b", category: "logic", description: "Filtra baseado em dados do lead" },
  delay: { label: "Aguardar", icon: Clock, color: "#f59e0b", category: "logic", description: "Aguarda um tempo antes de continuar" },
};

const NODE_CATEGORIES = [
  { key: "trigger", label: "Triggers / Gatilhos", items: ["trigger_whatsapp", "trigger_webhook", "trigger_form", "trigger_manual"] },
  { key: "ai", label: "Inteligência Artificial", items: ["ai_agent"] },
  { key: "action", label: "Ações", items: ["send_message", "send_text", "update_lead", "add_tag", "add_note"] },
  { key: "logic", label: "Lógica / Decisão", items: ["router", "filter", "delay"] },
];

const MODEL_GROUPS = [
  { provider: "OpenAI", models: [{ value: "gpt-4o", label: "GPT-4o" }, { value: "gpt-4o-mini", label: "GPT-4o Mini" }] },
  { provider: "Google Gemini", models: [{ value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }, { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }, { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" }] },
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
  onDotMouseDown,
}: {
  node: FlowNode;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onDotMouseDown: (e: React.MouseEvent) => void;
}) {
  const def = NODE_TYPES[node.type];
  if (!def) return null;
  const Icon = def.icon;

  return (
    <g>
      {/* Input dot (left center) - except for start */}
      {node.type !== "start" && (
        <circle
          cx={node.x}
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
        cx={node.x + NODE_W}
        cy={node.y + NODE_H / 2}
        r={DOT_R}
        fill={def.color}
        stroke="white"
        strokeWidth="2"
        className="cursor-crosshair"
        onMouseDown={(e) => {
          e.stopPropagation();
          onDotMouseDown(e);
        }}
      />
    </g>
  );
}

// ─── Connection Line ────────────────────────────────────────
function ConnectionLine({ fromNode, toNode }: { fromNode: FlowNode; toNode: FlowNode }) {
  const fromDef = NODE_TYPES[fromNode.type];
  const x1 = fromNode.x + NODE_W;
  const y1 = fromNode.y + NODE_H / 2;
  const x2 = toNode.x;
  const y2 = toNode.y + NODE_H / 2;

  const midX = (x1 + x2) / 2;
  const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  return (
    <>
      <path d={path} fill="none" stroke={fromDef?.color || "#666"} strokeWidth="2" opacity="0.4" />
      <polygon
        points={`${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4} ${x2},${y2}`}
        fill={fromDef?.color || "#666"}
        opacity="0.6"
      />
    </>
  );
}

// ─── Dragging Line (temporary) ──────────────────────────────
function DraggingLine({ fromNode, mouseX, mouseY }: { fromNode: FlowNode; mouseX: number; mouseY: number }) {
  const x1 = fromNode.x + NODE_W;
  const y1 = fromNode.y + NODE_H / 2;
  const midX = (x1 + mouseX) / 2;
  const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${mouseY}, ${mouseX} ${mouseY}`;
  return <path d={path} fill="none" stroke="#a855f7" strokeWidth="2" opacity="0.5" strokeDasharray="6 4" />;
}

// ─── Start Node Config ──────────────────────────────────────
function StartConfigPanel({ config, onUpdate, onClose }: { config: Record<string, any>; onUpdate: (c: Record<string, any>) => void; onClose: () => void }) {
  const triggers = [
    { key: "whatsapp_message", label: "Mensagem no WhatsApp", desc: "Quando o lead envia uma mensagem" },
    { key: "webhook_event", label: "Evento de Webhook", desc: "Venda, abandono de carrinho, etc." },
    { key: "form_submit", label: "Formulário enviado", desc: "Quando um formulário é preenchido" },
    { key: "manual", label: "Execução manual", desc: "Disparar manualmente" },
    { key: "schedule", label: "Agendamento", desc: "Em horários programados" },
    { key: "tag_added", label: "Tag adicionada", desc: "Quando uma tag é atribuída ao lead" },
  ];
  return (
    <div className="w-80 bg-card border-l border-border h-full overflow-y-auto animate-in slide-in-from-right">
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
        <span className="text-sm font-semibold">Gatilhos de início</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="p-4 space-y-2">
        <p className="text-xs text-muted-foreground mb-3">Selecione o que vai acionar este fluxo:</p>
        {triggers.map((t) => (
          <button key={t.key} onClick={() => onUpdate({ ...config, trigger: t.key })}
            className={cn("flex items-center gap-3 w-full p-3 rounded-lg border transition-colors text-left",
              config.trigger === t.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30")}>
            <div className="flex-1">
              <p className="text-xs font-medium">{t.label}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </div>
            {config.trigger === t.key && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>
    </div>
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

  if (node.type === "start") {
    return <StartConfigPanel config={config} onUpdate={onUpdate} onClose={onClose} />;
  }

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
        {(node.type === "send_text" || node.type === "send_message") && (
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
        {node.type === "delay" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tempo</Label>
              <Input className="mt-1 text-xs" type="number" value={config.delay_value || ""} onChange={(e) => onUpdate({ ...config, delay_value: e.target.value })} placeholder="5" />
            </div>
            <div>
              <Label className="text-xs">Unidade</Label>
              <Select value={config.delay_unit || "minutes"} onValueChange={(v) => onUpdate({ ...config, delay_unit: v })}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Segundos</SelectItem>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
  const { updateAgent } = useAIAgents();
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("fluxo");
  const [editingName, setEditingName] = useState(false);
  const [agentName, setAgentName] = useState(agent.name);

  // Spacebar panning
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollX: number; scrollY: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !editingName && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsPanning(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") { setIsPanning(false); setPanStart(null); }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [editingName]);

  // Rules state
  const [rules, setRules] = useState<Record<string, any>>(agent.ai_config?.rules || {});
  const [policy, setPolicy] = useState<Record<string, any>>(agent.ai_config?.policy || {});
  const [channels, setChannels] = useState<Record<string, boolean>>(agent.ai_config?.channels || { whatsapp: true });

  // Products
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-agent", activeAccountId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("products").select("*").eq("account_id", activeAccountId).order("name");
      return data || [];
    },
    enabled: !!activeAccountId,
  });
  const [linkedProducts, setLinkedProducts] = useState<string[]>(agent.ai_config?.linked_products || []);

  // Parse existing flow data from agent
  const initialNodes = useMemo((): FlowNode[] => {
    const saved = agent.ai_config?.flow_nodes;
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;

    const nodes: FlowNode[] = [
      { id: "start", type: "start", x: 60, y: 200, config: {} },
    ];

    nodes.push({
      id: "ai",
      type: "ai_agent",
      x: 340,
      y: 200,
      config: {
        prompt: agent.ai_config?.prompt || "",
        read_model: agent.ai_config?.read_model || agent.ai_config?.model || "",
        response_model: agent.ai_config?.response_model || agent.ai_config?.model || "",
        api_key_id: agent.ai_config?.api_key_id || "",
        tone: agent.ai_config?.tone || "profissional",
        use_emojis: agent.ai_config?.use_emojis ?? true,
      },
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

  // Line dragging state
  const [lineDrag, setLineDrag] = useState<{ fromId: string; mouseX: number; mouseY: number } | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Drag handling
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
      if (dx > 4 || dy > 4) setDragState(prev => prev ? { ...prev, moved: true } : null);

      setNodes((prev) =>
        prev.map((n) => n.id === dragState.nodeId ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n)
      );
    };

    const handleMouseUp = () => setDragState(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [dragState]);

  // Line drag handling
  useEffect(() => {
    if (!lineDrag) return;
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setLineDrag(prev => prev ? { ...prev, mouseX: e.clientX - rect.left + canvas.scrollLeft, mouseY: e.clientY - rect.top + canvas.scrollTop } : null);
    };
    const handleMouseUp = () => {
      if (lineDrag) {
        setConnectingFromId(lineDrag.fromId);
        setShowNodePicker(true);
      }
      setLineDrag(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [lineDrag]);

  // Panning with spacebar
  useEffect(() => {
    if (!isPanning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = "grab";

    const handleMouseDown = (e: MouseEvent) => {
      canvas.style.cursor = "grabbing";
      setPanStart({ x: e.clientX, y: e.clientY, scrollX: canvas.scrollLeft, scrollY: canvas.scrollTop });
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!panStart) return;
      canvas.scrollLeft = panStart.scrollX - (e.clientX - panStart.x);
      canvas.scrollTop = panStart.scrollY - (e.clientY - panStart.y);
    };
    const handleMouseUp = () => { setPanStart(null); canvas.style.cursor = isPanning ? "grab" : ""; };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.style.cursor = "";
    };
  }, [isPanning, panStart]);

  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (isPanning) return;
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
  }, [nodes, isPanning]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (dragState?.moved) return;
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
  }, [dragState]);

  const handleDotMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setLineDrag({
      fromId: nodeId,
      mouseX: e.clientX - rect.left + canvas.scrollLeft,
      mouseY: e.clientY - rect.top + canvas.scrollTop,
    });
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
    const aiNode = nodes.find((n) => n.type === "ai_agent");
    const actionNodes = nodes.filter((n) =>
      ["send_message", "send_text", "update_lead", "add_tag", "add_note"].includes(n.type)
    );
    const startNode = nodes.find((n) => n.type === "start");
    const triggerType = startNode?.config?.trigger || "manual";

    const payload: Record<string, any> = {
      id: agent.id,
      name: agentName,
      trigger_type: triggerType,
      trigger_config: startNode?.config || {},
      is_active: isActive,
      ai_config: {
        ...(aiNode?.config || {}),
        model: aiNode?.config?.response_model || aiNode?.config?.read_model || "",
        flow_nodes: nodes,
        flow_connections: connections,
        rules,
        policy,
        channels,
        linked_products: linkedProducts,
      },
      actions: actionNodes.map((n) => ({ type: n.type, config: n.config })),
    };

    updateAgent.mutate(payload as any);
    onClose();
  }, [nodes, connections, isActive, agent.id, agentName, rules, policy, channels, linkedProducts]);

  const canvasW = Math.max(2000, ...nodes.map((n) => n.x + NODE_W + 200));
  const canvasH = Math.max(800, ...nodes.map((n) => n.y + NODE_H + 200));
  const existingTypes = nodes.map((n) => n.type);

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
            {editingName ? (
              <div className="flex items-center gap-1">
                <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="h-7 w-40 text-sm" autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }} />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingName(false)}><Check className="h-3 w-3" /></Button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="font-semibold text-sm hover:text-primary transition-colors flex items-center gap-1.5">
                {agentName} <Edit2 className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* Tab navigation - temporarily disabled */}
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
              className={cn("flex-1 overflow-auto relative", isPanning && "select-none")}
              style={{ background: "radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
              onClick={() => { if (!isPanning) setSelectedNodeId(null); }}
            >
              <svg width={canvasW} height={canvasH} className="absolute inset-0">
                {/* Connections */}
                {connections.map((conn, i) => {
                  const fromNode = nodes.find((n) => n.id === conn.from);
                  const toNode = nodes.find((n) => n.id === conn.to);
                  if (!fromNode || !toNode) return null;
                  return <ConnectionLine key={i} fromNode={fromNode} toNode={toNode} />;
                })}

                {/* Dragging line */}
                {lineDrag && (() => {
                  const fromNode = nodes.find((n) => n.id === lineDrag.fromId);
                  if (!fromNode) return null;
                  return <DraggingLine fromNode={fromNode} mouseX={lineDrag.mouseX} mouseY={lineDrag.mouseY} />;
                })()}

                {/* Nodes */}
                {nodes.map((node) => (
                  <FlowNodeComponent
                    key={node.id}
                    node={node}
                    selected={selectedNodeId === node.id}
                    onSelect={() => handleNodeClick(node.id)}
                    onDragStart={(e) => handleNodeDragStart(node.id, e)}
                    onDotMouseDown={(e) => handleDotMouseDown(node.id, e)}
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

              {/* Spacebar hint */}
              {isPanning && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/90 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
                  Segure espaço + arraste para mover o canvas
                </div>
              )}
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
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Regras do agente</h2>
                <p className="text-sm text-muted-foreground">Configure comportamento, limites e regras.</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Mensagem de boas-vindas</Label>
                    <Textarea className="mt-1 text-xs" rows={3} placeholder="Olá! Como posso ajudar?"
                      value={rules.welcome_message || ""} onChange={(e) => setRules({ ...rules, welcome_message: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Mensagem de ausência (fora do horário)</Label>
                    <Textarea className="mt-1 text-xs" rows={2} placeholder="Nosso horário de atendimento é..."
                      value={rules.away_message || ""} onChange={(e) => setRules({ ...rules, away_message: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Horário de início</Label>
                      <Input className="mt-1 text-xs" type="time" value={rules.schedule_start || "08:00"} onChange={(e) => setRules({ ...rules, schedule_start: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Horário de fim</Label>
                      <Input className="mt-1 text-xs" type="time" value={rules.schedule_end || "18:00"} onChange={(e) => setRules({ ...rules, schedule_end: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-xs font-medium">Funcionar 24h</p>
                      <p className="text-[10px] text-muted-foreground">Ignorar horário de funcionamento</p>
                    </div>
                    <Switch checked={rules.always_on ?? false} onCheckedChange={(v) => setRules({ ...rules, always_on: v })} />
                  </div>
                  <div>
                    <Label className="text-xs">Máximo de mensagens por conversa</Label>
                    <Input className="mt-1 text-xs" type="number" placeholder="50"
                      value={rules.max_messages || ""} onChange={(e) => setRules({ ...rules, max_messages: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Tempo limite de inatividade (minutos)</Label>
                    <Input className="mt-1 text-xs" type="number" placeholder="30"
                      value={rules.idle_timeout || ""} onChange={(e) => setRules({ ...rules, idle_timeout: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Limite de execuções por minuto</Label>
                    <Input className="mt-1 text-xs" type="number" placeholder="10"
                      value={rules.rate_limit || ""} onChange={(e) => setRules({ ...rules, rate_limit: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Mensagem ao atingir limite de mensagens</Label>
                    <Textarea className="mt-1 text-xs" rows={2} placeholder="Você atingiu o limite de mensagens..."
                      value={rules.limit_message || ""} onChange={(e) => setRules({ ...rules, limit_message: e.target.value })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-xs font-medium">Transferir para humano</p>
                      <p className="text-[10px] text-muted-foreground">Permitir transferência quando solicitado</p>
                    </div>
                    <Switch checked={rules.allow_human_transfer ?? true} onCheckedChange={(v) => setRules({ ...rules, allow_human_transfer: v })} />
                  </div>
                </div>
              </div>
            )}
            {activeTab === "politica" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Política de uso</h2>
                <p className="text-sm text-muted-foreground">Defina políticas e restrições para o agente.</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Tópicos proibidos</Label>
                    <Textarea className="mt-1 text-xs" rows={3} placeholder="Liste tópicos que o agente não deve abordar..."
                      value={policy.forbidden_topics || ""} onChange={(e) => setPolicy({ ...policy, forbidden_topics: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Instrução de encerramento</Label>
                    <Textarea className="mt-1 text-xs" rows={2} placeholder="Quando encerrar e redirecionar para humano..."
                      value={policy.escalation_instructions || ""} onChange={(e) => setPolicy({ ...policy, escalation_instructions: e.target.value })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-xs font-medium">Nunca compartilhar preços</p>
                      <p className="text-[10px] text-muted-foreground">O agente não deve informar valores diretamente</p>
                    </div>
                    <Switch checked={policy.hide_prices ?? false} onCheckedChange={(v) => setPolicy({ ...policy, hide_prices: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-xs font-medium">Não mencionar concorrentes</p>
                      <p className="text-[10px] text-muted-foreground">Evitar falar de produtos ou serviços concorrentes</p>
                    </div>
                    <Switch checked={policy.no_competitors ?? false} onCheckedChange={(v) => setPolicy({ ...policy, no_competitors: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-xs font-medium">Coletar dados antes de responder</p>
                      <p className="text-[10px] text-muted-foreground">Exigir nome e contato antes de prosseguir</p>
                    </div>
                    <Switch checked={policy.require_data ?? false} onCheckedChange={(v) => setPolicy({ ...policy, require_data: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-xs font-medium">Respostas somente sobre produtos</p>
                      <p className="text-[10px] text-muted-foreground">Limitar respostas ao escopo dos produtos vinculados</p>
                    </div>
                    <Switch checked={policy.only_products ?? false} onCheckedChange={(v) => setPolicy({ ...policy, only_products: v })} />
                  </div>
                  <div>
                    <Label className="text-xs">Idiomas permitidos</Label>
                    <Input className="mt-1 text-xs" placeholder="Português, Inglês"
                      value={policy.allowed_languages || ""} onChange={(e) => setPolicy({ ...policy, allowed_languages: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Instruções adicionais</Label>
                    <Textarea className="mt-1 text-xs" rows={4} placeholder="Outras instruções de política..."
                      value={policy.extra_instructions || ""} onChange={(e) => setPolicy({ ...policy, extra_instructions: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
            {activeTab === "canais" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Canais de comunicação</h2>
                <p className="text-sm text-muted-foreground">Selecione onde o agente vai atuar.</p>
                <div className="space-y-2">
                  {[
                    { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, desc: "Atendimento via WhatsApp Business", available: true },
                    { key: "chatbot", label: "Chatbot (em breve)", icon: Bot, desc: "Widget de chat no seu site", available: false },
                    { key: "instagram", label: "Direct Instagram (em breve)", icon: MessageSquare, desc: "Mensagens diretas do Instagram", available: false },
                  ].map((ch) => (
                    <div key={ch.key} className={cn("flex items-center justify-between p-3 rounded-lg border border-border", !ch.available && "opacity-50")}>
                      <div className="flex items-center gap-3">
                        <ch.icon className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{ch.label}</p>
                          <p className="text-xs text-muted-foreground">{ch.desc}</p>
                        </div>
                      </div>
                      {ch.available ? (
                        <Switch checked={channels[ch.key] ?? false} onCheckedChange={(v) => setChannels({ ...channels, [ch.key]: v })} />
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Em breve</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "produtos" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Produtos vinculados</h2>
                <p className="text-sm text-muted-foreground">Vincule produtos para o agente ter conhecimento sobre eles.</p>
                {products.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Produtos são criados automaticamente via webhooks de vendas ou manualmente em Configurações.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {products.map((p: any) => {
                      const linked = linkedProducts.includes(p.id);
                      return (
                        <div key={p.id} className={cn("flex items-center justify-between p-3 rounded-lg border transition-colors",
                          linked ? "border-primary/40 bg-primary/5" : "border-border")}>
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              {p.cost > 0 && <p className="text-[10px] text-muted-foreground">Custo: R$ {Number(p.cost).toFixed(2)}</p>}
                            </div>
                          </div>
                          <Switch checked={linked} onCheckedChange={(v) => {
                            setLinkedProducts(prev => v ? [...prev, p.id] : prev.filter(id => id !== p.id));
                          }} />
                        </div>
                      );
                    })}
                  </div>
                )}
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
