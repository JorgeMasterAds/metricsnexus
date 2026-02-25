import { useState } from "react";
import { Bell, Check, X, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PendingInvite {
  id: string;
  project_id: string;
  role: string;
  invited_at: string;
  project_name: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: invites = [] } = useQuery({
    queryKey: ["pending-invites"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("project_users")
        .select("id, project_id, role, invited_at")
        .eq("user_id", user.id)
        .is("accepted_at", null)
        .not("invited_at", "is", null);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch project names
      const projectIds = data.map((d: any) => d.project_id);
      const { data: projects } = await (supabase as any)
        .from("projects")
        .select("id, name")
        .in("id", projectIds);

      const projectMap = new Map((projects || []).map((p: any) => [p.id, p.name]));

      return data.map((inv: any) => ({
        ...inv,
        project_name: projectMap.get(inv.project_id) || "Projeto",
      })) as PendingInvite[];
    },
    refetchInterval: 30000,
  });

  const acceptInvite = async (invite: PendingInvite) => {
    setProcessingId(invite.id);
    try {
      const { error } = await (supabase as any)
        .from("project_users")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (error) throw error;
      toast({ title: "Convite aceito!", description: `Você agora faz parte de "${invite.project_name}"` });
      qc.invalidateQueries({ queryKey: ["pending-invites"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project-members"] });
    } catch (err: any) {
      toast({ title: "Erro ao aceitar convite", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const rejectInvite = async (invite: PendingInvite) => {
    setProcessingId(invite.id);
    try {
      const { error } = await (supabase as any)
        .from("project_users")
        .delete()
        .eq("id", invite.id);
      if (error) throw error;
      toast({ title: "Convite recusado" });
      qc.invalidateQueries({ queryKey: ["pending-invites"] });
    } catch (err: any) {
      toast({ title: "Erro ao recusar convite", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const count = invites.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] gradient-bg border-0 text-primary-foreground">
              {count}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold">Notificações</h4>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {invites.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.id}
                className="px-4 py-3 border-b border-border last:border-0 space-y-2"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      Você foi convidado para o projeto{" "}
                      <span className="font-semibold">{invite.project_name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Papel: <span className="capitalize">{invite.role}</span>
                      {invite.invited_at && (
                        <> · {new Date(invite.invited_at).toLocaleDateString("pt-BR")}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-11">
                  <Button
                    size="sm"
                    className="h-7 text-xs gradient-bg border-0 text-primary-foreground hover:opacity-90 flex-1"
                    disabled={processingId === invite.id}
                    onClick={() => acceptInvite(invite)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-1"
                    disabled={processingId === invite.id}
                    onClick={() => rejectInvite(invite)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Recusar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
