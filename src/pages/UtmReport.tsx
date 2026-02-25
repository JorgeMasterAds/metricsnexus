import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { Download, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csv";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { SortableSection } from "@/components/SortableSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

type GroupByKey = "utm_campaign" | "utm_medium" | "utm_content" | "utm_source" | "product_name" | "payment_method";
type SortKey = GroupByKey | "views" | "sales" | "revenue" | "rate" | "ticket";

interface UtmRow { key: string; views: number; sales: number; revenue: number; rate: number; ticket: number; }

const UTM_SECTIONS = ["filters", "summary", "chart-source", "chart-daily", "chart-campaign", "chart-medium", "chart-payment", "table"];

export default function UtmReport() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [groupBy, setGroupBy] = useState<GroupByKey>("utm_source");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const { order, editMode, toggleEdit, handleReorder } = useDashboardLayout("utm_report", UTM_SECTIONS);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [fSource, setFSource] = useState("");
  const [fMedium, setFMedium] = useState("");
  const [fCampaign, setFCampaign] = useState("");
  const [fContent, setFContent] = useState("");
  const [fTerm, setFTerm] = useState("");

  const since = dateRange.from.toISOString();
  const until = dateRange.to.toISOString();

  const { data: clicks = [] } = useQuery({
    queryKey: ["utm-clicks", since, until, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any).from("clicks").select("id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, click_id").gte("created_at", since).lte("created_at", until);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["utm-conversions-full", since, until, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any).from("conversions").select("id, amount, fees, net_amount, click_id, status, product_name, utm_source, utm_medium, utm_campaign, utm_content, utm_term, payment_method, created_at").eq("status", "approved").gte("created_at", since).lte("created_at", until);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  const filteredConversions = useMemo(() => {
    return conversions.filter((c: any) => {
      if (fSource && !(c.utm_source || '').toLowerCase().includes(fSource.toLowerCase())) return false;
      if (fMedium && !(c.utm_medium || '').toLowerCase().includes(fMedium.toLowerCase())) return false;
      if (fCampaign && !(c.utm_campaign || '').toLowerCase().includes(fCampaign.toLowerCase())) return false;
      if (fContent && !(c.utm_content || '').toLowerCase().includes(fContent.toLowerCase())) return false;
      if (fTerm && !(c.utm_term || '').toLowerCase().includes(fTerm.toLowerCase())) return false;
      return true;
    });
  }, [conversions, fSource, fMedium, fCampaign, fContent, fTerm]);

  const { displayRows, chartSourceData, chartDailyData, chartPaymentData, chartCampaignData, chartMediumData } = useMemo(() => {
    const convByClick = new Map<string, any[]>();
    filteredConversions.forEach((c: any) => { if (c.click_id) { const arr = convByClick.get(c.click_id) || []; arr.push(c); convByClick.set(c.click_id, arr); } });

    const groups = new Map<string, { views: number; sales: number; revenue: number }>();
    const usedConvIds = new Set<string>();

    // Apply UTM filters to clicks
    const filteredClicks = clicks.filter((v: any) => {
      if (fSource && !(v.utm_source || '').toLowerCase().includes(fSource.toLowerCase())) return false;
      if (fMedium && !(v.utm_medium || '').toLowerCase().includes(fMedium.toLowerCase())) return false;
      if (fCampaign && !(v.utm_campaign || '').toLowerCase().includes(fCampaign.toLowerCase())) return false;
      if (fContent && !(v.utm_content || '').toLowerCase().includes(fContent.toLowerCase())) return false;
      if (fTerm && !(v.utm_term || '').toLowerCase().includes(fTerm.toLowerCase())) return false;
      return true;
    });

    if (groupBy !== 'product_name' && groupBy !== 'payment_method') {
      filteredClicks.forEach((v: any) => {
        const key = v[groupBy] || "(not set)";
        const entry = groups.get(key) || { views: 0, sales: 0, revenue: 0 };
        entry.views++;
        if (v.click_id && convByClick.has(v.click_id)) {
          for (const conv of convByClick.get(v.click_id)!) {
            if (!usedConvIds.has(conv.id)) { entry.sales++; entry.revenue += Number(conv.amount); usedConvIds.add(conv.id); }
          }
        }
        groups.set(key, entry);
      });
      filteredConversions.forEach((c: any) => {
        if (usedConvIds.has(c.id)) return;
        const key = c[groupBy] || "(not set)";
        const entry = groups.get(key) || { views: 0, sales: 0, revenue: 0 };
        entry.sales++; entry.revenue += Number(c.amount);
        groups.set(key, entry); usedConvIds.add(c.id);
      });
    } else {
      filteredConversions.forEach((c: any) => {
        const key = (groupBy === 'product_name' ? c.product_name : c.payment_method) || "(not set)";
        const entry = groups.get(key) || { views: 0, sales: 0, revenue: 0 };
        entry.sales++; entry.revenue += Number(c.amount);
        if (c.click_id) entry.views += filteredClicks.filter((cl: any) => cl.click_id === c.click_id).length;
        groups.set(key, entry);
      });
    }

    const rows: UtmRow[] = Array.from(groups.entries()).map(([key, val]) => ({ key, views: val.views, sales: val.sales, revenue: val.revenue, rate: val.views > 0 ? (val.sales / val.views) * 100 : 0, ticket: val.sales > 0 ? val.revenue / val.sales : 0 }));
    rows.sort((a, b) => { const aV = sortKey === groupBy ? a.key : (a as any)[sortKey]; const bV = sortKey === groupBy ? b.key : (b as any)[sortKey]; if (typeof aV === "string") return sortDir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV); return sortDir === "asc" ? aV - bV : bV - aV; });

    const makeChart = (key: string) => {
      const map = new Map<string, number>();
      filteredConversions.forEach((c: any) => { const k = c[key] || "(not set)"; map.set(k, (map.get(k) || 0) + Number(c.amount)); });
      return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    };

    const dayMap = new Map<string, { vendas: number; receita: number }>();
    filteredConversions.forEach((c: any) => { const d = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); const e = dayMap.get(d) || { vendas: 0, receita: 0 }; e.vendas++; e.receita += Number(c.amount); dayMap.set(d, e); });

    const pmMap = new Map<string, { vendas: number; receita: number }>();
    filteredConversions.forEach((c: any) => { const pm = c.payment_method || "(não informado)"; const e = pmMap.get(pm) || { vendas: 0, receita: 0 }; e.vendas++; e.receita += Number(c.amount); pmMap.set(pm, e); });

    return {
      displayRows: rows,
      chartSourceData: makeChart("utm_source"),
      chartCampaignData: makeChart("utm_campaign"),
      chartMediumData: makeChart("utm_medium"),
      chartDailyData: Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })),
      chartPaymentData: Array.from(pmMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.receita - a.receita),
    };
  }, [clicks, filteredConversions, groupBy, sortKey, sortDir, fSource, fMedium, fCampaign, fContent, fTerm]);

  const toggleSort = (key: SortKey) => { if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("desc"); } };
  const groupOptions: { value: GroupByKey; label: string }[] = [
    { value: "utm_source", label: "Source" }, { value: "utm_campaign", label: "Campaign" }, { value: "utm_medium", label: "Medium" },
    { value: "utm_content", label: "Content" }, { value: "product_name", label: "Produto" }, { value: "payment_method", label: "Pagamento" },
  ];

  const totalSales = filteredConversions.length;
  const totalRevenue = filteredConversions.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) { handleReorder(arrayMove(order, order.indexOf(active.id as string), order.indexOf(over.id as string))); }
  };

  const CHART_STYLE = { backgroundColor: "hsl(240, 5%, 7%)", border: "1px solid hsl(240, 4%, 16%)", borderRadius: 8, fontSize: 12 };

  const renderSection = (id: string) => {
    switch (id) {
      case "filters":
        return (
          <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow mb-6">
            <div className="text-xs font-medium text-muted-foreground mb-3">Filtros UTM</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div><Label className="text-xs">utm_source</Label><Input value={fSource} onChange={e => setFSource(e.target.value)} placeholder="Ex: google" className="h-8 text-xs mt-1" /></div>
              <div><Label className="text-xs">utm_medium</Label><Input value={fMedium} onChange={e => setFMedium(e.target.value)} placeholder="Ex: cpc" className="h-8 text-xs mt-1" /></div>
              <div><Label className="text-xs">utm_campaign</Label><Input value={fCampaign} onChange={e => setFCampaign(e.target.value)} placeholder="Ex: black-friday" className="h-8 text-xs mt-1" /></div>
              <div><Label className="text-xs">utm_content</Label><Input value={fContent} onChange={e => setFContent(e.target.value)} placeholder="Ex: banner" className="h-8 text-xs mt-1" /></div>
              <div><Label className="text-xs">utm_term</Label><Input value={fTerm} onChange={e => setFTerm(e.target.value)} placeholder="Ex: keyword" className="h-8 text-xs mt-1" /></div>
            </div>
          </div>
        );
      case "summary":
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow"><div className="text-xs text-muted-foreground">Vendas</div><div className="text-xl font-bold mt-1">{totalSales}</div></div>
            <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow"><div className="text-xs text-muted-foreground">Faturamento</div><div className="text-xl font-bold mt-1">{fmt(totalRevenue)}</div></div>
            <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow"><div className="text-xs text-muted-foreground">Ticket Médio</div><div className="text-xl font-bold mt-1">{totalSales > 0 ? fmt(totalRevenue / totalSales) : "R$ 0,00"}</div></div>
            <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow"><div className="text-xs text-muted-foreground">Views (clicks)</div><div className="text-xl font-bold mt-1">{clicks.length.toLocaleString("pt-BR")}</div></div>
          </div>
        );
      case "chart-source":
        return chartSourceData.length > 0 ? <MiniChart title="Receita por Origem (utm_source)" data={chartSourceData} color="hsl(var(--primary))" style={CHART_STYLE} fmt={fmt} /> : null;
      case "chart-daily":
        return chartDailyData.length > 0 ? (
          <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow mb-6">
            <h3 className="text-sm font-semibold mb-4">Conversões por Dia</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartDailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Area type="monotone" dataKey="vendas" name="Vendas" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null;
      case "chart-campaign":
        return chartCampaignData.length > 0 ? <MiniChart title="Receita por Campanha" data={chartCampaignData} color="hsl(280, 60%, 55%)" style={CHART_STYLE} fmt={fmt} /> : null;
      case "chart-medium":
        return chartMediumData.length > 0 ? <MiniChart title="Receita por Medium" data={chartMediumData} color="hsl(200, 80%, 55%)" style={CHART_STYLE} fmt={fmt} /> : null;
      case "chart-payment":
        return chartPaymentData.length > 0 ? (
          <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow mb-6">
            <h3 className="text-sm font-semibold mb-4">Meios de Pagamento</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartPaymentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => fmt(v)} />
                <Bar dataKey="receita" name="Receita" fill="hsl(200, 80%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null;
      case "table":
        return (
          <>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs text-muted-foreground">Agrupar por:</span>
              {groupOptions.map(g => (
                <button key={g.value} onClick={() => setGroupBy(g.value)} className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${groupBy === g.value ? "gradient-bg text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>{g.label}</button>
              ))}
              <div className="flex-1" />
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => exportToCsv(displayRows.map(r => ({ [groupBy]: r.key, views: r.views, vendas: r.sales, receita: r.revenue.toFixed(2), taxa: r.rate.toFixed(2) + "%", ticket_medio: r.ticket.toFixed(2) })), `utm-report-${groupBy}`)}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
            <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/30">
                    <SortHeader label={groupBy.replace("utm_", "").toUpperCase()} sortKey={groupBy} current={sortKey} dir={sortDir} onClick={toggleSort} />
                    <SortHeader label="Views" sortKey="views" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label="Vendas" sortKey="sales" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label="Receita" sortKey="revenue" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label="Taxa" sortKey="rate" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label="Ticket Médio" sortKey="ticket" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                  </tr></thead>
                  <tbody>
                    {displayRows.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">Nenhum dado no período</td></tr>
                    ) : displayRows.map((r, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-xs">{r.key}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{r.views.toLocaleString("pt-BR")}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{r.sales.toLocaleString("pt-BR")}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{fmt(r.revenue)}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs text-success">{r.rate.toFixed(2)}%</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{fmt(r.ticket)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      default: return null;
    }
  };

  return (
    <DashboardLayout
      title="Relatório UTM"
      subtitle="Performance agrupada por parâmetros UTM e conversões"
      actions={
        <div className="flex items-center gap-2">
          <ProductTour {...TOURS.utmReport} />
          <Button variant={editMode ? "default" : "outline"} size="sm" className="text-xs gap-1.5" onClick={toggleEdit}>
            {editMode ? <><Check className="h-3.5 w-3.5" /> Salvar Layout</> : <><Pencil className="h-3.5 w-3.5" /> Editar Layout</>}
          </Button>
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      }
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map(id => (
            <SortableSection key={id} id={id} editMode={editMode}>
              {renderSection(id)}
            </SortableSection>
          ))}
        </SortableContext>
      </DndContext>
    </DashboardLayout>
  );
}

function MiniChart({ title, data, color, style, fmt }: { title: string; data: { name: string; value: number }[]; color: string; style: any; fmt: (v: number) => string }) {
  return (
    <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow mb-6">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={style} formatter={(v: number) => fmt(v)} />
          <Bar dataKey="value" name="Receita" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SortHeader({ label, sortKey, current, dir, onClick, align = "left" }: { label: string; sortKey: SortKey; current: SortKey; dir: "asc" | "desc"; onClick: (k: SortKey) => void; align?: "left" | "right" }) {
  const active = current === sortKey;
  return (
    <th className={`px-5 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`} onClick={() => onClick(sortKey)}>
      {label} {active && (dir === "asc" ? "↑" : "↓")}
    </th>
  );
}
