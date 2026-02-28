import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trophy, Trash2, ExternalLink, BarChart3, Copy, Eye } from "lucide-react";
import { useSurveys } from "@/hooks/useSurveys";
import { toast } from "@/hooks/use-toast";
import SurveyEditor from "@/components/surveys/SurveyEditor";
import SurveyResponses from "@/components/surveys/SurveyResponses";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Surveys() {
  const { surveys, isLoading, createSurvey, deleteSurvey } = useSurveys();
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [viewingResponsesId, setViewingResponsesId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async (type: "survey" | "quiz") => {
    const title = type === "survey" ? "Nova Pesquisa" : "Novo Quiz";
    const result = await createSurvey.mutateAsync({ title, type });
    setEditingSurveyId(result.id);
  };

  const getPublicUrl = (slug: string) => {
    return `${window.location.origin}/s/${slug}`;
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(getPublicUrl(slug));
    toast({ title: "Link copiado!" });
  };

  if (editingSurveyId) {
    return <SurveyEditor surveyId={editingSurveyId} onBack={() => setEditingSurveyId(null)} />;
  }

  if (viewingResponsesId) {
    return <SurveyResponses surveyId={viewingResponsesId} onBack={() => setViewingResponsesId(null)} />;
  }

  return (
    <DashboardLayout
      title="Pesquisas & Quiz"
      subtitle="Crie pesquisas e quizzes para conhecer melhor seus leads"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleCreate("survey")} disabled={createSurvey.isPending}>
            <FileText className="h-4 w-4 mr-1" /> Nova Pesquisa
          </Button>
          <Button size="sm" onClick={() => handleCreate("quiz")} disabled={createSurvey.isPending}>
            <Trophy className="h-4 w-4 mr-1" /> Novo Quiz
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <h3 className="text-lg font-medium">Nenhuma pesquisa ainda</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Crie pesquisas para conhecer o perfil dos seus leads, ou quizzes com pontuação para qualificar automaticamente.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => handleCreate("survey")}>
              <FileText className="h-4 w-4 mr-1" /> Criar Pesquisa
            </Button>
            <Button onClick={() => handleCreate("quiz")}>
              <Trophy className="h-4 w-4 mr-1" /> Criar Quiz
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((s) => (
            <div
              key={s.id}
              className="rounded-xl bg-card border border-border/50 p-5 card-shadow hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => setEditingSurveyId(s.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {s.type === "quiz" ? (
                    <Trophy className="h-4 w-4 text-amber-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {s.type === "quiz" ? "Quiz" : "Pesquisa"}
                  </Badge>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyLink(s.slug)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewingResponsesId(s.id)}>
                    <BarChart3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <h3 className="font-semibold text-sm mb-1 truncate">{s.title}</h3>
              <p className="text-xs text-muted-foreground truncate mb-3">{s.description || "Sem descrição"}</p>
              <div className="flex items-center justify-between">
                <Badge variant={s.is_published ? "default" : "secondary"} className="text-[10px]">
                  {s.is_published ? "Publicado" : "Rascunho"}
                </Badge>
                {s.scoring_enabled && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                    Pontuação
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pesquisa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todas as respostas serão perdidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteId) deleteSurvey.mutate(deleteId);
                setDeleteId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
