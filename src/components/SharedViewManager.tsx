import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Trash2, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SharedViewManager() {
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("Link de visualização");
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresHours, setExpiresHours] = useState(24);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ["shared-view-tokens", activeProjectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shared_view_tokens")
        .select("*")
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId,
  });

  const createToken = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const expiresAt = isPermanent ? null : new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();

      const { error } = await (supabase as any)
        .from("shared_view_tokens")
        .insert({
          account_id: activeAccountId,
          project_id: activeProjectId,
          label,
          is_permanent: isPermanent,
          expires_at: expiresAt,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-view-tokens"] });
      toast.success("Link criado com sucesso!");
    },
    onError: () => toast.error("Erro ao criar link"),
  });

  const deleteToken = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("shared_view_tokens")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-view-tokens"] });
      toast.success("Link removido");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any)
        .from("shared_view_tokens")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shared-view-tokens"] }),
  });

  const getPublicUrl = (token: string) => {
    return `${window.location.origin}/view/${token}`;
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getPublicUrl(token));
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Link2 className="h-4 w-4" />
        Links de Visualização Pública
      </h3>
      <p className="text-xs text-muted-foreground">
        Compartilhe relatórios (Relatório e UTM) com pessoas externas sem necessidade de login.
      </p>

      <div className="flex flex-col gap-3 p-3 border rounded-lg bg-muted/30">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Nome do link</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={isPermanent} onCheckedChange={setIsPermanent} />
              <Label className="text-xs">Permanente</Label>
            </div>
            {!isPermanent && (
              <div>
                <Label className="text-xs">Expira em (horas)</Label>
                <Input
                  type="number"
                  min={1}
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(Number(e.target.value))}
                  className="h-8 text-xs w-20"
                />
              </div>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => createToken.mutate()} disabled={createToken.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Criar Link
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : tokens.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum link criado ainda.</p>
      ) : (
        <div className="space-y-2">
          {tokens.map((t: any) => {
            const isExpired = !t.is_permanent && t.expires_at && new Date(t.expires_at) < new Date();
            return (
              <div key={t.id} className="flex items-center gap-2 p-2 border rounded-lg text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.label}</p>
                  <p className="text-muted-foreground truncate">{getPublicUrl(t.token)}</p>
                  <p className="text-muted-foreground">
                    {t.is_permanent ? "Permanente" : isExpired ? "⚠️ Expirado" : `Expira: ${format(new Date(t.expires_at), "dd/MM/yyyy HH:mm")}`}
                  </p>
                </div>
                <Switch
                  checked={t.is_active}
                  onCheckedChange={(checked) => toggleActive.mutate({ id: t.id, active: checked })}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(t.token)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteToken.mutate(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
