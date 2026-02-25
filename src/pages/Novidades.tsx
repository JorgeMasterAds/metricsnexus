import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export default function Novidades() {
  const { data: announcements = [] } = useQuery({
    queryKey: ["novidades-page"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_announcements")
        .select("id, title, body, published_at")
        .order("published_at", { ascending: false });
      return data || [];
    },
    staleTime: 60000,
  });

  return (
    <DashboardLayout title="Novidades" subtitle="Atualizações e melhorias da plataforma">
      <div className="max-w-3xl mx-auto space-y-6">
        {announcements.length === 0 ? (
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma novidade publicada ainda.</p>
          </div>
        ) : (
          announcements.map((a: any) => (
            <article key={a.id} className="rounded-xl bg-card border border-border/50 card-shadow p-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <time className="text-[10px] text-muted-foreground">
                  {new Date(a.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </time>
              </div>
              <h2 className="text-base font-semibold mb-2">{a.title}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.body}</p>
            </article>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
