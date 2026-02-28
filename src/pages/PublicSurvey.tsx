import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QuestionInput } from "@/components/surveys/SurveyPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import type { Survey, SurveyQuestion } from "@/hooks/useSurveys";

export default function PublicSurvey() {
  const { slug } = useParams<{ slug: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(-1); // -1 = welcome screen
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadSurvey();
  }, [slug]);

  const loadSurvey = async () => {
    try {
      // Use edge function to load public survey data
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://fnpmuffrqrlofjvqytof.supabase.co"}/functions/v1/survey-public?slug=${slug}`,
        { headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucG11ZmZycXJsb2ZqdnF5dG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTAzNjQsImV4cCI6MjA4NzUyNjM2NH0.3veZ6OjXgYagq3YyrXrYPjZ18XAqwaj-09ZfYWV6o0A" } }
      );
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
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://fnpmuffrqrlofjvqytof.supabase.co"}/functions/v1/survey-public`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucG11ZmZycXJsb2ZqdnF5dG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTAzNjQsImV4cCI6MjA4NzUyNjM2NH0.3veZ6OjXgYagq3YyrXrYPjZ18XAqwaj-09ZfYWV6o0A",
          },
          body: JSON.stringify({
            survey_id: survey.id,
            respondent_name: respondentName,
            respondent_email: respondentEmail,
            answers,
          }),
        }
      );
      if (!res.ok) throw new Error("Erro ao enviar");
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{error || "Pesquisa não encontrada"}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">{survey.thank_you_message || "Obrigado por responder!"}</h1>
          {survey.show_results && result?.qualification && (
            <div className="mt-4 p-4 rounded-xl bg-card border border-border/50">
              <p className="text-sm text-muted-foreground">Sua classificação:</p>
              <p className="text-lg font-bold" style={{ color: survey.theme_color }}>{result.qualification}</p>
              <p className="text-sm text-muted-foreground">{result.total_score}/{result.max_possible_score} pontos</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Welcome screen
  if (currentIdx === -1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          {survey.description && <p className="text-muted-foreground">{survey.description}</p>}
          <div className="space-y-3 text-left">
            <Input
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              placeholder="Seu nome (opcional)"
            />
            <Input
              value={respondentEmail}
              onChange={(e) => setRespondentEmail(e.target.value)}
              placeholder="Seu e-mail (opcional)"
            />
          </div>
          <Button
            className="w-full"
            style={{ backgroundColor: survey.theme_color }}
            onClick={() => setCurrentIdx(0)}
          >
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Progress */}
      <div className="w-full max-w-lg mb-8">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((currentIdx + 1) / questions.length) * 100}%`,
              backgroundColor: survey.theme_color,
            }}
          />
        </div>
      </div>

      <div className="max-w-lg w-full min-h-[300px] flex flex-col justify-center">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{currentIdx + 1} / {questions.length}</span>
          {q.is_required && <span className="text-xs text-destructive">*</span>}
        </div>
        <h2 className="text-xl font-semibold mb-2">{q.title || "Pergunta"}</h2>
        {q.description && <p className="text-sm text-muted-foreground mb-4">{q.description}</p>}

        <div className="mt-4">
          <QuestionInput
            question={q}
            value={answers[q.id]}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
            themeColor={survey.theme_color}
          />
        </div>
      </div>

      <div className="w-full max-w-lg flex items-center justify-between mt-8 pt-4 border-t border-border/30">
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
            disabled={submitting}
            style={{ backgroundColor: survey.theme_color }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
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
