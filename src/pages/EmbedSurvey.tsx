import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { QuestionInput } from "@/components/surveys/SurveyPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import type { Survey, SurveyQuestion } from "@/hooks/useSurveys";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://fnpmuffrqrlofjvqytof.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucG11ZmZycXJsb2ZqdnF5dG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTAzNjQsImV4cCI6MjA4NzUyNjM2NH0.3veZ6OjXgYagq3YyrXrYPjZ18XAqwaj-09ZfYWV6o0A";

/**
 * Embeddable survey page designed for iframe usage.
 * Supports query params: ?bg=transparent&hideHeader=1
 */
export default function EmbedSurvey() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const bgTransparent = searchParams.get("bg") === "transparent";
  const hideHeader = searchParams.get("hideHeader") === "1";

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [respondentPhone, setRespondentPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadSurvey();
  }, [slug]);

  // Notify parent window of height changes for auto-resize
  useEffect(() => {
    const sendHeight = () => {
      window.parent.postMessage(
        { type: "nexus-survey-resize", height: document.body.scrollHeight },
        "*"
      );
    };
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    sendHeight();
    return () => observer.disconnect();
  }, [currentIdx, submitted, loading]);

  const loadSurvey = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/survey-public?slug=${slug}`, {
        headers: { apikey: SUPABASE_KEY },
      });
      if (!res.ok) throw new Error("Pesquisa não encontrada");
      const data = await res.json();
      setSurvey(data.survey);
      setQuestions(data.questions);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!survey) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/survey-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({
          survey_id: survey.id,
          respondent_name: respondentName,
          respondent_email: respondentEmail,
          respondent_phone: respondentPhone,
          answers,
        }),
      });
      if (!res.ok) throw new Error("Erro ao enviar");
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
      // Notify parent of completion
      window.parent.postMessage({ type: "nexus-survey-complete", data }, "*");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const bgClass = bgTransparent ? "bg-transparent" : "bg-background";

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${bgClass}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className={`flex items-center justify-center p-8 ${bgClass}`}>
        <p className="text-muted-foreground text-sm">{error || "Pesquisa não encontrada"}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`flex items-center justify-center p-8 ${bgClass}`}>
        <div className="max-w-md text-center space-y-3">
          <div className="text-4xl">🎉</div>
          <h2 className="text-xl font-bold">{survey.thank_you_message || "Obrigado por responder!"}</h2>
          {survey.show_results && result?.qualification && (
            <div className="mt-3 p-3 rounded-xl bg-card border border-border/50">
              <p className="text-sm text-muted-foreground">Sua classificação:</p>
              <p className="text-lg font-bold" style={{ color: survey.theme_color }}>{result.qualification}</p>
              <p className="text-xs text-muted-foreground">{result.total_score}/{result.max_possible_score} pontos</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Welcome screen
  if (currentIdx === -1) {
    return (
      <div className={`flex items-center justify-center p-6 ${bgClass}`}>
        <div className="max-w-md w-full space-y-5 text-center">
          {!hideHeader && (
            <>
              <h2 className="text-xl font-bold">{survey.title}</h2>
              {survey.description && <p className="text-sm text-muted-foreground">{survey.description}</p>}
            </>
          )}
          <div className="space-y-2.5 text-left">
            <Input value={respondentName} onChange={(e) => setRespondentName(e.target.value)} placeholder="Seu nome (opcional)" className="text-sm" />
            <Input value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)} placeholder="Seu e-mail (opcional)" className="text-sm" />
            <Input value={respondentPhone} onChange={(e) => setRespondentPhone(e.target.value)} placeholder="Seu telefone (opcional)" className="text-sm" />
          </div>
          <Button className="w-full" style={{ backgroundColor: survey.theme_color }} onClick={() => setCurrentIdx(0)}>
            Começar <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === questions.length - 1;

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${bgClass}`}>
      {/* Progress */}
      <div className="w-full max-w-lg mb-6">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, backgroundColor: survey.theme_color }}
          />
        </div>
      </div>

      <div className="max-w-lg w-full">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{currentIdx + 1} / {questions.length}</span>
          {q.is_required && <span className="text-xs text-destructive">*</span>}
        </div>
        <h3 className="text-lg font-semibold mb-1.5">{q.title || "Pergunta"}</h3>
        {q.description && <p className="text-xs text-muted-foreground mb-3">{q.description}</p>}
        <div className="mt-3">
          <QuestionInput question={q} value={answers[q.id]} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))} themeColor={survey.theme_color} />
        </div>
      </div>

      <div className="w-full max-w-lg flex items-center justify-between mt-6 pt-3 border-t border-border/30">
        <Button variant="ghost" size="sm" disabled={isFirst} onClick={() => setCurrentIdx((i) => i - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        {isLast ? (
          <Button size="sm" onClick={handleSubmit} disabled={submitting} style={{ backgroundColor: survey.theme_color }}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Enviar
          </Button>
        ) : (
          <Button size="sm" onClick={() => setCurrentIdx((i) => i + 1)} style={{ backgroundColor: survey.theme_color }}>
            Próxima <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
