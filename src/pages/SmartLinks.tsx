import { useState } from "react";
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
import { exportToCsv } from "@/lib/csv";
import { useSubscription, PLAN_LIMITS } from "@/hooks/useSubscription";

export default function SmartLinks() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [slugValue, setSlugValue] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { subscribed, planType } = useSubscription();

  const since = dateRange.from.toISOString();
  const until = dateRange.to.toISOString();

  const maxLinks = PLAN_LIMITS[planType || "bronze"] || 5;
  const canCreate = !subscribed ? false : true;

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

  const atLimit = smartLinks.length >= maxLinks;

  const { data: views = [] } = useQuery({
    queryKey: ["sl-views", since, until],
    queryFn: async () => {
      const { data } = await supabase.from("views").select("smart_link_id, variant_id").gte("created_at", since).lte("created_at", until);
      return data || [];
    },
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["sl-conversions", since, until],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversions")
        .select("smart_link_id, variant_id, amount, is_order_bump, status")
        .eq("status", "approved")
        .gte("created_at", since)
        .lte("created_at", until);
      return data || [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-domain"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("custom_domain").maybeSingle();
      return data;
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

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const customDomain = profile?.custom_domain;
  const getRedirectUrl = (slug: string) => {
    if (customDomain) return `https://${customDomain}/${slug}`;
    return `https://${projectId}.supabase.co/functions/v1/redirect?slug=${slug}`;
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(getRedirectUrl(slug));
    toast({ title: "Link copiado!" });
  };

  const handleNewClick = () => {
    if (!subscribed) {
      toast({ title: "Assine um plano", description: "Vá em Configurações para escolher seu plano.", variant: "destructive" });
      return;
    }
    if (atLimit) {
      toast({ title: "Limite atingido", description: `Você atingiu o limite do seu plano (${maxLinks} Smart Links). Faça upgrade para criar mais.`, variant: "destructive" });
      return;
    }
    setEditingLink(null);
    setShowModal(true);
  };

  return (
    <DashboardLayout
      title="Smart Links"
      subtitle={`${smartLinks.length}/${maxLinks} Smart Links usados`}
      actions={
        <div className="flex items-center gap-2">
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
          onClose={() => { setShowModal(false); setEditingLink(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["smart-links"] }); }}
        />
      )}

      {/* Plan limit banner */}
      {subscribed && atLimit && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 mb-4 text-xs text-warning flex items-center justify-between">
          <span>Você atingiu o limite do seu plano ({maxLinks} Smart Links).</span>
          <a href="/settings" className="underline font-medium">Fazer upgrade</a>
        </div>
      )}

      {!subscribed && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-4 text-xs text-destructive flex items-center justify-between">
          <span>Assine um plano para criar Smart Links.</span>
          <a href="/settings" className="underline font-medium">Ver planos</a>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : smartLinks.length === 0 ? (
        <div className="rounded-xl bg-card border border-border/50 card-shadow p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">Nenhum Smart Link criado ainda.</p>
          <Button className="gradient-bg border-0 text-primary-foreground" onClick={handleNewClick}>
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
            const ticket = linkConv.length > 0 ? (linkRevenue / linkConv.length).toFixed(2) : "0.00";

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
                        {" · "}{link.variants?.length || 0} variantes · {linkViews} views · {convRate}% · Ticket R$ {ticket}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono hidden sm:block">
                      R$ {linkRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                            const vViews = views.filter((vw: any) => vw.variant_id === v.id).length;
                            const vConv = conversions.filter((c: any) => c.variant_id === v.id);
                            const vRevenue = vConv.reduce((s: number, c: any) => s + Number(c.amount), 0);
                            const vRate = vViews > 0 ? ((vConv.length / vViews) * 100).toFixed(2) : "0.00";
                            return (
                              <tr key={v.id} className="border-b border-border/10 hover:bg-accent/10 transition-colors">
                                <td className="px-5 py-3 font-medium text-xs">{v.name}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">{v.url}</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">{v.weight}%</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">{vViews}</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">{vConv.length}</td>
                                <td className="text-right px-4 py-3 font-mono text-xs text-success">{vRate}%</td>
                                <td className="text-right px-4 py-3 font-mono text-xs">R$ {vRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
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
