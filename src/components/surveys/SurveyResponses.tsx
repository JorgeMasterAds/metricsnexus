import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, User, Clock, Trophy } from "lucide-react";
import { useSurveyDetail } from "@/hooks/useSurveys";
import { format } from "date-fns";

interface Props {
  surveyId: string;
  onBack?: () => void;
  inline?: boolean;
}

export default function SurveyResponses({ surveyId, onBack, inline }: Props) {
  const { survey, questions, responses } = useSurveyDetail(surveyId);

  const getQualificationColor = (q: string | null) => {
    if (!q) return "secondary";
    if (q === "Qualificado") return "default";
    if (q === "Parcialmente Qualificado") return "outline";
    return "destructive";
  };

  const content = (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total de respostas</span>
          </div>
          <p className="text-2xl font-bold">{responses.length}</p>
        </div>
        {survey?.scoring_enabled && (
          <>
            <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Qualificados</span>
              </div>
              <p className="text-2xl font-bold">
                {responses.filter((r: any) => r.qualification === "Qualificado").length}
              </p>
            </div>
            <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Score médio</span>
              </div>
              <p className="text-2xl font-bold">
                {responses.length > 0
                  ? Math.round(
                      responses.reduce((acc: number, r: any) => acc + (r.total_score || 0), 0) / responses.length
                    )
                  : 0}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Individual responses */}
      {responses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma resposta ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((r: any) => (
            <div key={r.id} className="rounded-xl bg-card border border-border/50 p-5 card-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{r.respondent_name || r.respondent_email || "Anônimo"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {r.qualification && (
                    <Badge variant={getQualificationColor(r.qualification) as any} className="text-[10px]">
                      {r.qualification}
                    </Badge>
                  )}
                  {r.total_score > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {r.total_score}/{r.max_possible_score} pts
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(r.created_at), "dd/MM/yy HH:mm")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {(r.survey_answers || []).map((a: any) => {
                  const question = questions.find((q) => q.id === a.question_id);
                  return (
                    <div key={a.id} className="flex gap-2 text-xs">
                      <span className="font-medium text-muted-foreground min-w-[120px] truncate">
                        {question?.title || "—"}:
                      </span>
                      <span>
                        {a.answer_value ||
                          (Array.isArray(a.answer_options) && a.answer_options.length > 0
                            ? a.answer_options.join(", ")
                            : "—")}
                      </span>
                      {a.score > 0 && (
                        <Badge variant="outline" className="text-[9px] ml-auto">
                          +{a.score}pts
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <DashboardLayout
      title={`Respostas: ${survey?.title || ""}`}
      subtitle="Visualize todas as respostas recebidas"
      actions={
        onBack && (
          <Button size="sm" variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        )
      }
    >
      {content}
    </DashboardLayout>
  );
}
