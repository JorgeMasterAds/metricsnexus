import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Novidades() {
  const { data: announcements = [] } = useQuery({
    queryKey: ["novidades-page"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_announcements")
        .select("id, title, body, published_at, created_by, cover_image_url, version")
        .order("published_at", { ascending: false });

      if (!data || data.length === 0) return [];

      const authorIds = [...new Set(data.map((a: any) => a.created_by).filter(Boolean))] as string[];
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", authorIds);
        if (profiles) {
          for (const p of profiles) {
            profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
          }
        }
      }

      return data.map((a: any) => ({
        ...a,
        author: profilesMap[a.created_by] || null,
      }));
    },
    staleTime: 60000,
  });

  return (
    <DashboardLayout title="Novidades" subtitle="Atualizações e melhorias da plataforma">
      <div className="w-full space-y-6">
        {announcements.length === 0 ? (
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma novidade publicada ainda.</p>
          </div>
        ) : (
          announcements.map((a: any) => (
            <article key={a.id} className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
              {a.cover_image_url && (
                <img src={a.cover_image_url} alt="" className="w-full h-48 object-cover" />
              )}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  {a.author ? (
                    <Avatar className="h-8 w-8">
                      {a.author.avatar_url ? (
                        <AvatarImage src={a.author.avatar_url} alt={a.author.full_name || "Autor"} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {(a.author.full_name || "A").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">A</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">{a.author?.full_name || "Equipe"}</span>
                    <time className="text-[10px] text-muted-foreground">
                      {new Date(a.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </time>
                  </div>
                  {a.version && <Badge variant="outline" className="text-[10px] ml-auto">{a.version}</Badge>}
                </div>
                <h2 className="text-base font-semibold mb-2">{a.title}</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.body}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
