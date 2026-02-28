import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Survey, SurveyQuestion } from "@/hooks/useSurveys";

interface Props {
  survey: Survey;
  questions: SurveyQuestion[];
  isPublic?: boolean;
  onSubmit?: (answers: Record<string, any>) => void;
}

export default function SurveyPreview({ survey, questions, isPublic, onSubmit }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const setAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(answers);
    }
    setSubmitted(true);
  };

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Adicione perguntas para ver o preview</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-semibold">{survey.thank_you_message || "Obrigado por responder!"}</h2>
      </div>
    );
  }

  const q = questions[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === questions.length - 1;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full mb-8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${((currentIdx + 1) / questions.length) * 100}%`,
            backgroundColor: survey.theme_color,
          }}
        />
      </div>

      <div className="min-h-[300px] flex flex-col justify-center">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {currentIdx + 1} / {questions.length}
          </span>
          {q.is_required && <span className="text-xs text-destructive">*</span>}
        </div>
        <h2 className="text-lg font-semibold mb-2">{q.title || "Pergunta sem título"}</h2>
        {q.description && <p className="text-sm text-muted-foreground mb-4">{q.description}</p>}

        <div className="mt-4">
          <QuestionInput
            question={q}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
            themeColor={survey.theme_color}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/30">
        <Button
          variant="ghost"
          size="sm"
          disabled={isFirst}
          onClick={() => setCurrentIdx((i) => i - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>

        {isLast ? (
          <Button
            size="sm"
            onClick={handleSubmit}
            style={{ backgroundColor: survey.theme_color }}
          >
            Enviar respostas
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => setCurrentIdx((i) => i + 1)}
            style={{ backgroundColor: survey.theme_color }}
          >
            Próxima <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function QuestionInput({
  question,
  value,
  onChange,
  themeColor,
}: {
  question: SurveyQuestion;
  value: any;
  onChange: (v: any) => void;
  themeColor: string;
}) {
  switch (question.type) {
    case "short_text":
      return (
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Sua resposta..."
          className="text-base"
        />
      );

    case "long_text":
      return (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Sua resposta..."
          className="text-base min-h-[120px]"
        />
      );

    case "multiple_choice":
      return (
        <RadioGroup value={value || ""} onValueChange={onChange} className="space-y-2">
          {(question.options || []).map((opt: any, i: number) => (
            <label
              key={i}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                value === opt.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
              )}
            >
              <RadioGroupItem value={opt.value || opt.label} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
      );

    case "checkbox": {
      const selected: string[] = value || [];
      return (
        <div className="space-y-2">
          {(question.options || []).map((opt: any, i: number) => {
            const checked = selected.includes(opt.value || opt.label);
            return (
              <label
                key={i}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  checked ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    const val = opt.value || opt.label;
                    onChange(c ? [...selected, val] : selected.filter((s) => s !== val));
                  }}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case "dropdown":
      return (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger className="text-base">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {(question.options || []).map((opt: any, i: number) => (
              <SelectItem key={i} value={opt.value || opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "linear_scale": {
      const min = question.config?.min ?? 1;
      const max = question.config?.max ?? 5;
      const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-1 justify-center flex-wrap">
            {range.map((n) => (
              <button
                key={n}
                onClick={() => onChange(n)}
                className={cn(
                  "h-10 w-10 rounded-lg border text-sm font-medium transition-all",
                  value === n ? "text-white" : "border-border/50 hover:border-primary/30"
                )}
                style={value === n ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>{question.config?.minLabel}</span>
            <span>{question.config?.maxLabel}</span>
          </div>
        </div>
      );
    }

    case "rating": {
      const max = question.config?.max ?? 5;
      return (
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn("h-8 w-8", n <= (value || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
              />
            </button>
          ))}
        </div>
      );
    }

    default:
      return <p className="text-sm text-muted-foreground">Tipo não suportado</p>;
  }
}
