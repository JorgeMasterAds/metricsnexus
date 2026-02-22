import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Copy, ExternalLink, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import SmartLinkModal from "@/components/SmartLinkModal";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { exportToCsv } from "@/lib/csv";
import { MAX_SMART_LINKS } from "@/hooks/useSubscription";
import { useProject } from "@/hooks/useProject";

export default function SmartLinks() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [slugValue, setSlugValue] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeProject } = useProject();
  const projectId = activeProject?.id;

  const sinceDate = dateRange.from.toISOString().split("T")[0];
  const untilDate = dateRange.to.toISOString().split("T")[0];

  const { data: smartLinks = [], isLoading } = useQuery({
    queryKey: ["smart-links", projectId],
    queryFn: async () => {
      let q = supabase
        .from("smart_links")
        .select("*, variants(*)")
        .order("created_at", { ascending: false });
      if (projectId) q = (q as any).eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!projectId,
  });

  const { data: totalSmartLinksCount = 0 } = useQuery({
    queryKey: ["smart-links-total-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("smart_links")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const atLimit = totalSmartLinksCount >= MAX_SMART_LINKS;

  // Read metrics from daily_metrics instead of raw tables
  const { data: metrics = [] } = useQuery({
    queryKey: ["sl-daily-metrics", sinceDate, untilDate, projectId],
    queryFn: async () => {
      let q = supabase
        .from("daily_metrics")
        .select("smart_link_id, variant_id, views, conversions, revenue")
        .gte("date", sinceDate)
        .lte("date", untilDate);
      if (projectId) q = (q as any).eq("project_id", projectId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!projectId,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-domain"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("custom_domain").maybeSingle();
      return data;
    },
  });

  // Pre-compute metrics per smart_link and variant
  const metricsMap = useMemo(() => {
    const byLink = new Map<string, { views: number; sales: number; revenue: number }>();
    const byVariant = new Map<string, { views: number; sales: number; revenue: number }>();
    metrics.forEach((m: any) => {
      // By link
      if (m.smart_link_id) {
        const entry = byLink.get(m.smart_link_id) || { views: 0, sales: 0, revenue: 0 };
        entry.views += Number(m.views);
        entry.sales += Number(m.conversions);
        entry.revenue += Number(m.revenue);
        byLink.set(m.smart_link_id, entry);
      }
      // By variant
      if (m.variant_id) {
        const entry = byVariant.get(m.variant_id) || { views: 0, sales: 0, revenue: 0 };
        entry.views += Number(m.views);
        entry.sales += Number(m.conversions);
        entry.revenue += Number(m.revenue);
        byVariant.set(m.variant_id, entry);
      }
    });
    return { byLink, byVariant };
  }, [metrics]);

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
      qc.invalidateQueries({ queryKey: ["smart-links-total-count"] });
      toast({ title: "Smart Link excluído" });
    },
  });

  const updateSlug = useMutation({
    mutationFn: async ({ id, slug }: { id: string; slug: string }) => {
      const { error } = await supabase.from("smart_links").update({ slug }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["smart-links"] });
      setEditingSlug(null);
      toast({ title: "Slug atualizado!" });
    },
  });

  const toggleVariant = useMutation({
    mutationFn: async ({ id, is_active, smartLinkId }: { id: string; is_active: boolean; smartLinkId: string }) => {
      const { error } = await supabase.from("variants").update({ is_active }).eq("id", id);
      if (error) throw error;
      const { data: activeVariants } = await supabase
        .from("variants")
        .select("id")
        .eq("smart_link_id", smartLinkId)
        .eq("is_active", true);
      if (activeVariants && activeVariants.length > 0) {
        const w = Math.floor(100 / activeVariants.length);
        const remainder = 100 - w * activeVariants.length;
        for (let i = 0; i < activeVariants.length; i++) {
          await supabase.from("variants").update({ weight: w + (i === 0 ? remainder : 0) }).eq("id", activeVariants[i].id);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["smart-links"] }),
  });

  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const customDomain = profile?.custom_domain;
  const getRedirectUrl = (slug: string) => {
    if (customDomain) return `https://${customDomain}/${slug}`;
    return `https://${supabaseProjectId}.supabase.co/functions/v1/redirect?slug=${slug}`;
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(getRedirectUrl(slug));
    toast({ title: "Link copiado!" });
  };

  const handleNewClick = () => {
    if (atLimit) {
      toast({ title: "Limite atingido", description: `Você atingiu o limite de ${MAX_SMART_LINKS} Smart Links na sua conta.`, variant: "destructive" });
      return;
    }
    setEditingLink(null);
    setShowModal(true);
  };

  return (
    <DashboardLayout
      title="Smart Links"
      subtitle={`${totalSmartLinksCount}/${MAX_SMART_LINKS} Smart Links usados (total da conta)`}
      actions={
        <div className="flex items-center gap-2">
          <ProductTour {...TOURS.smartLinks} />
          <DateFilter value={dateRange} onChange={setDateRange} />
          <Button
            size="sm"
            className="gradient-bg border-0 text-primary-foreground hover:opacity-90"
            onClick={handleNewClick}
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
      }
    >
      {showModal && (
        <SmartLinkModal
          link={editingLink}
          projectId={projectId}
          onClose={() => { setShowModal(false); setEditingLink(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["smart-links"] }); qc.invalidateQueries({ queryKey: ["smart-links-total-count"] }); }}
        />
      )}

      {atLimit && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 mb-4 text-xs text-warning">
          Você atingiu o limite de {MAX_SMART_LINKS} Smart Links na sua conta.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : smartLinks.length === 0 ? (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">Nenhum Smart Link neste projeto.</p>
          <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleNewClick}>
            <Plus className="h-4 w-4 mr-1" /> Criar primeiro Smart Link
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {smartLinks.map((link: any) => {
            const isExpanded = expandedId === link.id;
            const linkData = metricsMap.byLink.get(link.id) || { views: 0, sales: 0, revenue: 0 };
            const convRate = linkData.views > 0 ? ((linkData.sales / linkData.views) * 100).toFixed(2) : "0.00";
            const ticket = linkData.sales > 0 ? (linkData.revenue / linkData.sales).toFixed(2) : "0.00";

            return (
              <div key={link.id} className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
                <div className="flex items-center px-5 py-4 gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : link.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", link.is_active ? "bg-success" : "bg-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{link.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {editingSlug === link.id ? (
                          <span className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            /
                            <Input
                              value={slugValue}
                              onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                              className="h-6 w-32 text-xs inline"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") updateSlug.mutate({ id: link.id, slug: slugValue });
                                if (e.key === "Escape") setEditingSlug(null);
                              }}
                            />
                            <button onClick={() => updateSlug.mutate({ id: link.id, slug: slugValue })} className="text-success text-xs">✓</button>
                          </span>
                        ) : (
                          <span
                            className="cursor-pointer hover:text-foreground"
                            onDoubleClick={(e) => { e.stopPropagation(); setEditingSlug(link.id); setSlugValue(link.slug); }}
                            title="Duplo clique para editar"
                          >
                            /{link.slug}
                          </span>
                        )}
                        {" · "}{link.variants?.length || 0} variantes · {linkData.views} views · {convRate}% · Ticket R$ {ticket}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono hidden sm:block">
                      R$ {linkData.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => copyLink(link.slug)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Copiar link">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <a href={getRedirectUrl(link.slug)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Abrir link">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button onClick={() => toggleActive.mutate({ id: link.id, is_active: !link.is_active })} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title={link.is_active ? "Pausar" : "Ativar"}>
                      {link.is_active ? <ToggleRight className="h-3.5 w-3.5 text-success" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => { setEditingLink(link); setShowModal(true); }} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => { if (confirm("Excluir este Smart Link?")) deleteLink.mutate(link.id); }} className="p-1.5 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive" title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="px-5 pb-3 -mt-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
                    <span className="font-mono truncate">{getRedirectUrl(link.slug)}</span>
                    <button onClick={() => copyLink(link.slug)} className="shrink-0 hover:text-foreground"><Copy className="h-3 w-3" /></button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/30">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/20 bg-muted/30">
                            <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Variante</th>
                            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">URL destino</th>
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
                            const vData = metricsMap.byVariant.get(v.id) || { views: 0, sales: 0, revenue: 0 };
                            const vRate = vData.views > 0 ? ((vData.sales / vData.views) * 100).toFixed(2) : "0.00";
                            return (
                              <tr key={v.id} className="border-b border-border/10 hover:bg-accent/10 transition-colors">
                                <td className="px-5 py-3 font-medium text-xs">{v.name}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">{v.url}</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">{v.weight}%</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">{vData.views}</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">{vData.sales}</td>
                                <td className="text-right px-4 py-3 font-mono text-xs text-success">{vRate}%</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">R$ {vData.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                <td className="text-right px-4 py-3">
                                  <button
                                    onClick={() => toggleVariant.mutate({ id: v.id, is_active: !v.is_active, smartLinkId: link.id })}
                                    className={cn("text-xs px-2 py-0.5 rounded-full cursor-pointer", v.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}
                                  >
                                    {v.is_active ? "Ativa" : "Inativa"}
                                  </button>
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
