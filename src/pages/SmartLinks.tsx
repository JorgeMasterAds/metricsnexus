import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import SmartLinkModal from "@/components/SmartLinkModal";

export default function SmartLinks() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: smartLinks = [], isLoading } = useQuery({
    queryKey: ["smart-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("smart_links")
        .select("*, variants(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch views + conversions for each smart link
  const { data: views = [] } = useQuery({
    queryKey: ["sl-views"],
    queryFn: async () => {
      const { data } = await supabase.from("views").select("smart_link_id, variant_id");
      return data || [];
    },
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["sl-conversions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversions")
        .select("smart_link_id, variant_id, amount, is_order_bump")
        .eq("status", "approved");
      return data || [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("smart_links").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart-links"] }),
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("smart_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-links"] });
      toast({ title: "Smart Link excluído" });
    },
  });

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const redirectBase = `https://${projectId}.supabase.co/functions/v1/redirect?slug=`;

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(redirectBase + slug);
    toast({ title: "Link copiado!" });
  };

  return (
    <DashboardLayout
      title="Smart Links"
      subtitle="Crie e gerencie seus links de distribuição"
      actions={
        <Button
          size="sm"
          className="gradient-bg border-0 text-primary-foreground hover:opacity-90"
          onClick={() => { setEditingLink(null); setShowModal(true); }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo Smart Link
        </Button>
      }
    >
      {showModal && (
        <SmartLinkModal
          link={editingLink}
          onClose={() => { setShowModal(false); setEditingLink(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["smart-links"] }); }}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : smartLinks.length === 0 ? (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">Nenhum Smart Link criado ainda.</p>
          <Button className="gradient-bg border-0 text-primary-foreground" onClick={() => { setEditingLink(null); setShowModal(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Criar primeiro Smart Link
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {smartLinks.map((link: any) => {
            const isExpanded = expandedId === link.id;
            const linkViews = views.filter((v: any) => v.smart_link_id === link.id).length;
            const linkConv = conversions.filter((c: any) => c.smart_link_id === link.id);
            const linkRevenue = linkConv.reduce((s: number, c: any) => s + Number(c.amount), 0);
            const convRate = linkViews > 0 ? ((linkConv.length / linkViews) * 100).toFixed(2) : "0.00";

            return (
              <div key={link.id} className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
                {/* Header */}
                <div className="flex items-center px-5 py-4 gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : link.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", link.is_active ? "bg-success" : "bg-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{link.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        /{link.slug} · {link.variants?.length || 0} variantes · {linkViews} views · {convRate}% conv
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono hidden sm:block">
                      R$ {linkRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyLink(link.slug)}
                      className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      title="Copiar link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={redirectBase + link.slug}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      title="Abrir link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => toggleActive.mutate({ id: link.id, is_active: !link.is_active })}
                      className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      title={link.is_active ? "Pausar" : "Ativar"}
                    >
                      {link.is_active ? <ToggleRight className="h-3.5 w-3.5 text-success" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => { setEditingLink(link); setShowModal(true); }}
                      className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Excluir este Smart Link?")) deleteLink.mutate(link.id);
                      }}
                      className="p-1.5 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded variants */}
                {isExpanded && (
                  <div className="border-t border-border/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/20 bg-muted/30">
                            <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Variante</th>
                            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Peso</th>
                            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Views</th>
                            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Vendas</th>
                            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Taxa</th>
                            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Receita</th>
                            <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(link.variants || []).map((v: any) => {
                            const vViews = views.filter((vw: any) => vw.variant_id === v.id).length;
                            const vConv = conversions.filter((c: any) => c.variant_id === v.id);
                            const vRevenue = vConv.reduce((s: number, c: any) => s + Number(c.amount), 0);
                            const vRate = vViews > 0 ? ((vConv.length / vViews) * 100).toFixed(2) : "0.00";
                            return (
                              <tr key={v.id} className="border-b border-border/10 hover:bg-accent/10 transition-colors">
                                <td className="px-5 py-3">
                                  <div className="font-medium text-xs">{v.name}</div>
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">{v.url}</div>
                                </td>
                                <td className="text-right px-4 py-3 font-mono text-xs">{v.weight}%</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">{vViews}</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">{vConv.length}</td>
                                <td className="text-right px-4 py-3 font-mono text-xs text-success">{vRate}%</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">R$ {vRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                <td className="text-right px-4 py-3">
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full", v.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
                                    {v.is_active ? "Ativa" : "Inativa"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
