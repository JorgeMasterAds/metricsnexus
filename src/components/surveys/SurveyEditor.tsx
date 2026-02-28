import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Copy, Eye, Settings2,
  Type, AlignLeft, ListChecks, CheckSquare, ChevronDown, Gauge, Star,
  Save, ExternalLink, BarChart3, Thermometer, Code2
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useSurveyDetail, useSurveys, SurveyQuestion } from "@/hooks/useSurveys";
import { toast } from "@/hooks/use-toast";
import SurveyPreview from "@/components/surveys/SurveyPreview";
import SurveyResponses from "@/components/surveys/SurveyResponses";

const QUESTION_TYPES = [
  { value: "short_text", label: "Resposta curta", icon: Type },
  { value: "long_text", label: "Parágrafo", icon: AlignLeft },
  { value: "multiple_choice", label: "Múltipla escolha", icon: ListChecks },
  { value: "checkbox", label: "Caixa de seleção", icon: CheckSquare },
  { value: "dropdown", label: "Lista suspensa", icon: ChevronDown },
  { value: "linear_scale", label: "Escala linear", icon: Gauge },
  { value: "rating", label: "Classificação", icon: Star },
] as const;

interface Props {
  surveyId: string;
  onBack: () => void;
}

export default function SurveyEditor({ surveyId, onBack }: Props) {
  const { survey, questions, isLoading, saveQuestion, deleteQuestion, reorderQuestions } = useSurveyDetail(surveyId);
  const { updateSurvey } = useSurveys();
  const [activeTab, setActiveTab] = useState("editor");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [localDesc, setLocalDesc] = useState("");

  useEffect(() => {
    if (survey) {
      setLocalTitle(survey.title);
      setLocalDesc(survey.description || "");
    }
  }, [survey]);

  const saveSurveyMeta = () => {
    if (!survey) return;
    updateSurvey.mutate({
      id: survey.id,
      title: localTitle,
      description: localDesc || null,
    });
    toast({ title: "Pesquisa salva" });
  };

  const togglePublish = () => {
    if (!survey) return;
    updateSurvey.mutate({ id: survey.id, is_published: !survey.is_published });
    toast({ title: survey.is_published ? "Despublicado" : "Publicado!" });
  };

  const toggleScoring = () => {
    if (!survey) return;
    updateSurvey.mutate({ id: survey.id, scoring_enabled: !survey.scoring_enabled });
  };

  const addQuestion = async (type: string) => {
    await saveQuestion.mutateAsync({
      type: type as any,
      title: "",
      position: questions.length,
      options: ["multiple_choice", "checkbox", "dropdown"].includes(type) ? [{ label: "Opção 1", value: "opcao_1", score: 0 }] : [],
      config: type === "linear_scale" ? { min: 1, max: 5, minLabel: "", maxLabel: "" } : type === "rating" ? { max: 5 } : {},
      scoring: {},
    });
  };

  const getPublicUrl = () => `${window.location.origin}/s/${survey?.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    toast({ title: "Link copiado!" });
  };

  if (isLoading || !survey) {
    return (
      <DashboardLayout title="Carregando..." subtitle="">
        <div className="text-center py-12 text-muted-foreground">Carregando editor...</div>
      </DashboardLayout>
    );
  }

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  return (
    <DashboardLayout
      title={survey.title}
      subtitle={survey.type === "quiz" ? "Editor de Quiz" : "Editor de Pesquisa"}
      actions={
        <div className="flex gap-2 items-center">
          <Button size="sm" variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button size="sm" variant="outline" onClick={copyLink}>
            <Copy className="h-4 w-4 mr-1" /> Copiar Link
          </Button>
          <Button size="sm" variant={survey.is_published ? "secondary" : "default"} onClick={togglePublish}>
            {survey.is_published ? "Despublicar" : "Publicar"}
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-3.5 w-3.5 mr-1" /> Preview
          </TabsTrigger>
          <TabsTrigger value="responses">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Respostas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Questions list - left */}
            <div className="lg:col-span-1 space-y-3">
              {/* Survey title */}
              <div className="rounded-xl bg-card border border-border/50 p-4 space-y-3">
                <Input
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={saveSurveyMeta}
                  placeholder="Título da pesquisa"
                  className="font-semibold text-base border-0 px-0 focus-visible:ring-0 bg-transparent"
                />
                <Textarea
                  value={localDesc}
                  onChange={(e) => setLocalDesc(e.target.value)}
                  onBlur={saveSurveyMeta}
                  placeholder="Descrição (opcional)"
                  className="text-xs border-0 px-0 focus-visible:ring-0 bg-transparent resize-none min-h-[40px]"
                />
              </div>

              {/* Questions */}
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id)}
                  className={`rounded-xl bg-card border p-3 cursor-pointer transition-all ${
                    selectedQuestionId === q.id ? "border-primary ring-1 ring-primary/20" : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                    <Badge variant="outline" className="text-[9px]">
                      {QUESTION_TYPES.find((t) => t.value === q.type)?.label || q.type}
                    </Badge>
                    {q.is_required && <Badge variant="secondary" className="text-[9px]">obrigatória</Badge>}
                  </div>
                  <p className="text-xs truncate">{q.title || "Pergunta sem título"}</p>
                </div>
              ))}

              {/* Add question */}
              <div className="rounded-xl border border-dashed border-border/50 p-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Adicionar pergunta</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUESTION_TYPES.map((qt) => (
                    <Button
                      key={qt.value}
                      variant="ghost"
                      size="sm"
                      className="justify-start h-8 text-xs"
                      onClick={() => addQuestion(qt.value)}
                      disabled={saveQuestion.isPending}
                    >
                      <qt.icon className="h-3.5 w-3.5 mr-1.5" />
                      {qt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Question editor - right */}
            <div className="lg:col-span-2">
              {selectedQuestion ? (
                <QuestionEditor
                  question={selectedQuestion}
                  scoringEnabled={survey.scoring_enabled}
                  onSave={(data) => saveQuestion.mutate({ ...data, id: selectedQuestion.id })}
                  onDelete={() => {
                    deleteQuestion.mutate(selectedQuestion.id);
                    setSelectedQuestionId(null);
                  }}
                />
              ) : (
                <div className="rounded-xl bg-card border border-border/50 p-12 text-center">
                  <Type className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Selecione uma pergunta para editar ou adicione uma nova</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="config">
          <div className="max-w-lg space-y-6">
            <div className="rounded-xl bg-card border border-border/50 p-6 space-y-4">
              <h3 className="text-sm font-semibold">Configurações Gerais</h3>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Pontuação (Scoring)</Label>
                  <p className="text-xs text-muted-foreground">Atribuir pontos a cada resposta para qualificação</p>
                </div>
                <Switch checked={survey.scoring_enabled} onCheckedChange={toggleScoring} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Exibir resultado ao respondente</Label>
                  <p className="text-xs text-muted-foreground">Mostrar score/qualificação após finalizar</p>
                </div>
                <Switch
                  checked={survey.show_results}
                  onCheckedChange={(v) => updateSurvey.mutate({ id: survey.id, show_results: v })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Mensagem de agradecimento</Label>
                <Textarea
                  value={survey.thank_you_message || ""}
                  onChange={(e) => updateSurvey.mutate({ id: survey.id, thank_you_message: e.target.value })}
                  placeholder="Obrigado por responder!"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Cor do tema</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={survey.theme_color}
                    onChange={(e) => updateSurvey.mutate({ id: survey.id, theme_color: e.target.value })}
                    className="h-8 w-8 rounded cursor-pointer border-0"
                  />
                  <span className="text-xs text-muted-foreground">{survey.theme_color}</span>
                </div>
              </div>
            </div>

            {survey.scoring_enabled && (
              <div className="rounded-xl bg-card border border-border/50 p-6 space-y-4">
                <h3 className="text-sm font-semibold">Faixas de Qualificação</h3>
                <p className="text-xs text-muted-foreground">
                  Configure nas opções de cada pergunta a pontuação de cada resposta.
                  O sistema irá somar os pontos e classificar automaticamente.
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• <strong>0-33%</strong> → Não Qualificado</p>
                  <p>• <strong>34-66%</strong> → Parcialmente Qualificado</p>
                  <p>• <strong>67-100%</strong> → Qualificado</p>
                </div>
              </div>
            )}

            {/* Embed Code */}
            <div className="rounded-xl bg-card border border-border/50 p-6 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Code2 className="h-4 w-4" /> Incorporar em outro site (Embed)
              </h3>
              <p className="text-xs text-muted-foreground">
                Cole o código abaixo em qualquer site para exibir esta pesquisa dentro de um iframe. Ideal para páginas de obrigado, landing pages, etc.
              </p>
              <EmbedCodeBlock slug={survey.slug} title={survey.title} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <SurveyPreview survey={survey} questions={questions} />
        </TabsContent>

        <TabsContent value="responses">
          <SurveyResponses surveyId={surveyId} onBack={() => setActiveTab("editor")} inline />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

// ── Question Editor ──
function QuestionEditor({
  question,
  scoringEnabled,
  onSave,
  onDelete,
}: {
  question: SurveyQuestion;
  scoringEnabled: boolean;
  onSave: (data: Partial<SurveyQuestion>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(question.title);
  const [desc, setDesc] = useState(question.description || "");
  const [required, setRequired] = useState(question.is_required);
  const [type, setType] = useState(question.type);
  const [options, setOptions] = useState<any[]>(question.options || []);
  const [config, setConfig] = useState<Record<string, any>>(question.config || {});

  useEffect(() => {
    setTitle(question.title);
    setDesc(question.description || "");
    setRequired(question.is_required);
    setType(question.type);
    setOptions(question.options || []);
    setConfig(question.config || {});
  }, [question.id]);

  const save = () => {
    onSave({ title, description: desc || null, is_required: required, type, options, config });
    toast({ title: "Pergunta salva" });
  };

  const hasOptions = ["multiple_choice", "checkbox", "dropdown"].includes(type);

  const addOption = () => {
    setOptions([...options, { label: `Opção ${options.length + 1}`, value: `opcao_${options.length + 1}`, score: 0 }]);
  };

  const updateOption = (idx: number, field: string, value: any) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], [field]: value };
    setOptions(updated);
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-xl bg-card border border-border/50 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((qt) => (
                <SelectItem key={qt.value} value={qt.value} className="text-xs">
                  {qt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch checked={required} onCheckedChange={setRequired} id="req" />
            <Label htmlFor="req" className="text-xs">Obrigatória</Label>
          </div>
        </div>

        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da pergunta"
          className="text-base font-medium"
        />
        <Input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Descrição (opcional)"
          className="text-sm"
        />
      </div>

      {/* Options for multiple choice, checkbox, dropdown */}
      {hasOptions && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Opções</Label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5">{String.fromCharCode(65 + idx)}</span>
              <Input
                value={opt.label}
                onChange={(e) => updateOption(idx, "label", e.target.value)}
                className="text-sm flex-1"
                placeholder={`Opção ${idx + 1}`}
              />
              {scoringEnabled && (
                <div className="flex items-center gap-1.5">
                  <TemperatureIndicator score={opt.score || 0} />
                  <Input
                    type="number"
                    value={opt.score || 0}
                    onChange={(e) => updateOption(idx, "score", parseInt(e.target.value) || 0)}
                    className="text-sm w-16"
                    placeholder="Pts"
                  />
                </div>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeOption(idx)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addOption} className="text-xs">
            <Plus className="h-3 w-3 mr-1" /> Adicionar opção
          </Button>
        </div>
      )}

      {/* Linear scale config */}
      {type === "linear_scale" && (
        <div className="space-y-3">
          <Label className="text-xs font-medium">Configuração da Escala</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Mínimo</Label>
              <Input
                type="number"
                value={config.min ?? 1}
                onChange={(e) => setConfig({ ...config, min: parseInt(e.target.value) || 1 })}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Máximo</Label>
              <Input
                type="number"
                value={config.max ?? 5}
                onChange={(e) => setConfig({ ...config, max: parseInt(e.target.value) || 5 })}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Label mínimo</Label>
              <Input
                value={config.minLabel ?? ""}
                onChange={(e) => setConfig({ ...config, minLabel: e.target.value })}
                className="text-sm"
                placeholder="Ex: Discordo totalmente"
              />
            </div>
            <div>
              <Label className="text-xs">Label máximo</Label>
              <Input
                value={config.maxLabel ?? ""}
                onChange={(e) => setConfig({ ...config, maxLabel: e.target.value })}
                className="text-sm"
                placeholder="Ex: Concordo totalmente"
              />
            </div>
          </div>
        </div>
      )}

      {/* Rating config */}
      {type === "rating" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Número de estrelas</Label>
          <Input
            type="number"
            value={config.max ?? 5}
            onChange={(e) => setConfig({ ...config, max: parseInt(e.target.value) || 5 })}
            className="text-sm w-20"
            min={1}
            max={10}
          />
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button size="sm" onClick={save}>
          <Save className="h-4 w-4 mr-1" /> Salvar Pergunta
        </Button>
      </div>
    </div>
  );
}

// ── Temperature Indicator ──
function TemperatureIndicator({ score }: { score: number }) {
  // Map score to a temperature color: 0 = cold (blue), 5 = warm (yellow), 10+ = hot (red)
  const getColor = (s: number) => {
    if (s <= 0) return "bg-blue-500";
    if (s <= 2) return "bg-sky-400";
    if (s <= 4) return "bg-emerald-400";
    if (s <= 6) return "bg-yellow-400";
    if (s <= 8) return "bg-orange-400";
    return "bg-red-500";
  };

  const getLabel = (s: number) => {
    if (s <= 0) return "Frio";
    if (s <= 3) return "Morno";
    if (s <= 6) return "Quente";
    return "Muito Quente";
  };

  const getTextColor = (s: number) => {
    if (s <= 0) return "text-blue-600";
    if (s <= 3) return "text-sky-600";
    if (s <= 6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex items-center gap-1" title={`${getLabel(score)} (${score} pts)`}>
      <Thermometer className={`h-3.5 w-3.5 ${getTextColor(score)}`} />
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-2.5 w-1 rounded-full transition-colors ${
              score > i * 2 ? getColor(score) : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Embed Code Block ──
function EmbedCodeBlock({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const embedUrl = `${window.location.origin}/embed/s/${slug}`;

  const iframeCode = `<!-- Nexus Metrics - ${title} -->
<iframe
  src="${embedUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border:none;border-radius:12px;max-width:700px;margin:0 auto;display:block;"
  allow="clipboard-write"
></iframe>
<script>
window.addEventListener("message",function(e){
  if(e.data&&e.data.type==="nexus-survey-resize"){
    var f=document.querySelector('iframe[src*="${slug}"]');
    if(f)f.style.height=e.data.height+"px";
  }
});
</script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <pre className="p-3 rounded-lg bg-muted/50 text-[11px] text-muted-foreground overflow-x-auto max-h-[200px] whitespace-pre-wrap font-mono">
          {iframeCode}
        </pre>
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 h-7 text-[10px]"
          onClick={copyCode}
        >
          {copied ? "Copiado ✓" : "Copiar código"}
        </Button>
      </div>
      <div className="text-[11px] text-muted-foreground space-y-1">
        <p>• O iframe redimensiona automaticamente conforme o conteúdo</p>
        <p>• Adicione <code className="text-primary">?bg=transparent</code> na URL para fundo transparente</p>
        <p>• Adicione <code className="text-primary">?hideHeader=1</code> para ocultar título/descrição</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="text-xs" onClick={() => window.open(embedUrl, "_blank")}>
          <ExternalLink className="h-3 w-3 mr-1" /> Abrir embed
        </Button>
      </div>
    </div>
  );
}