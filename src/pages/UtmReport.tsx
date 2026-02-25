import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csv";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

type GroupByKey = "utm_campaign" | "utm_medium" | "utm_content" | "utm_source" | "product_name" | "payment_method";
type SortKey = GroupByKey | "views" | "sales" | "revenue" | "rate" | "ticket";

interface UtmRow {
  key: string;
  views: number;
  sales: number;
  revenue: number;
  rate: number;
  ticket: number;
}

export default function UtmReport() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [groupBy, setGroupBy] = useState<GroupByKey>("utm_source");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();

  // Filters
  const [fSource, setFSource] = useState("");
  const [fMedium, setFMedium] = useState("");
  const [fCampaign, setFCampaign] = useState("");

  const since = dateRange.from.toISOString();
  const until = dateRange.to.toISOString();

  // Clicks for views count
  const { data: clicks = [] } = useQuery({
    queryKey: ["utm-clicks", since, until, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("clicks")
        .select("id, utm_source, utm_medium, utm_campaign, utm_content, click_id")
        .gte("created_at", since)
        .lte("created_at", until);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  // Conversions with UTM, payment, fees
  const { data: conversions = [] } = useQuery({
    queryKey: ["utm-conversions-full", since, until, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("id, amount, fees, net_amount, click_id, status, product_name, utm_source, utm_medium, utm_campaign, utm_content, utm_term, payment_method, created_at")
        .eq("status", "approved")
        .gte("created_at", since)
        .lte("created_at", until);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  // Filter conversions
  const filteredConversions = useMemo(() => {
    return conversions.filter((c: any) => {
      if (fSource && !(c.utm_source || '').toLowerCase().includes(fSource.toLowerCase())) return false;
      if (fMedium && !(c.utm_medium || '').toLowerCase().includes(fMedium.toLowerCase())) return false;
      if (fCampaign && !(c.utm_campaign || '').toLowerCase().includes(fCampaign.toLowerCase())) return false;
      return true;
    });
  }, [conversions, fSource, fMedium, fCampaign]);

  // Build table rows
  const { displayRows, chartSourceData, chartDailyData, chartPaymentData } = useMemo(() => {
    // Build click-based attribution map
    const convByClick = new Map<string, any[]>();
    filteredConversions.forEach((c: any) => {
      if (c.click_id) {
        const arr = convByClick.get(c.click_id) || [];
        arr.push(c);
        convByClick.set(c.click_id, arr);
      }
    });

    // Group by selected dimension
    const groups = new Map<string, { views: number; sales: number; revenue: number }>();

    // 1) Click-based: attribute views + conversion to UTM from click
    const usedConvIds = new Set<string>();
    clicks.forEach((v: any) => {
      // Apply UTM filters to clicks too
      if (fSource && !(v.utm_source || '').toLowerCase().includes(fSource.toLowerCase())) return;
      if (fMedium && !(v.utm_medium || '').toLowerCase().includes(fMedium.toLowerCase())) return;
      if (fCampaign && !(v.utm_campaign || '').toLowerCase().includes(fCampaign.toLowerCase())) return;

      let key: string;
      if (groupBy === 'product_name' || groupBy === 'payment_method') {
        // For product/payment grouping, we handle below
        return;
      }
      key = v[groupBy] || "(not set)";
      const entry = groups.get(key) || { views: 0, sales: 0, revenue: 0 };
      entry.views++;

      if (v.click_id && convByClick.has(v.click_id)) {
        for (const conv of convByClick.get(v.click_id)!) {
          if (!usedConvIds.has(conv.id)) {
            entry.sales++;
            entry.revenue += Number(conv.amount);
            usedConvIds.add(conv.id);
          }
        }
      }
      groups.set(key, entry);
    });

    // 2) Direct UTM conversions (no click_id, has UTM in conversion itself)
    if (groupBy !== 'product_name' && groupBy !== 'payment_method') {
      filteredConversions.forEach((c: any) => {
        if (usedConvIds.has(c.id)) return;
        const key = c[groupBy] || "(not set)";
        const entry = groups.get(key) || { views: 0, sales: 0, revenue: 0 };
        entry.sales++;
        entry.revenue += Number(c.amount);
        groups.set(key, entry);
        usedConvIds.add(c.id);
      });
    }

    // Product/payment grouping: group conversions directly
    if (groupBy === 'product_name' || groupBy === 'payment_method') {
      filteredConversions.forEach((c: any) => {
        const key = (groupBy === 'product_name' ? c.product_name : c.payment_method) || "(not set)";
        const entry = groups.get(key) || { views: 0, sales: 0, revenue: 0 };
        entry.sales++;
        entry.revenue += Number(c.amount);
        // Count views from clicks that match
        if (c.click_id) {
          const clickViews = clicks.filter((cl: any) => cl.click_id === c.click_id).length;
          entry.views += clickViews;
        }
        groups.set(key, entry);
      });
    }

    const rows: UtmRow[] = Array.from(groups.entries()).map(([key, val]) => ({
      key,
      views: val.views,
      sales: val.sales,
      revenue: val.revenue,
      rate: val.views > 0 ? (val.sales / val.views) * 100 : 0,
      ticket: val.sales > 0 ? val.revenue / val.sales : 0,
    }));

    rows.sort((a, b) => {
      const aVal = sortKey === groupBy ? a.key : (a as any)[sortKey];
      const bVal = sortKey === groupBy ? b.key : (b as any)[sortKey];
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    // Chart: revenue by utm_source
    const sourceMap = new Map<string, number>();
    filteredConversions.forEach((c: any) => {
      const src = c.utm_source || "(not set)";
      sourceMap.set(src, (sourceMap.get(src) || 0) + Number(c.amount));
    });
    const chartSourceData = Array.from(sourceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Chart: daily conversions
    const dayMap = new Map<string, { vendas: number; receita: number }>();
    filteredConversions.forEach((c: any) => {
      const d = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entry = dayMap.get(d) || { vendas: 0, receita: 0 };
      entry.vendas++;
      entry.receita += Number(c.amount);
      dayMap.set(d, entry);
    });
    const chartDailyData = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }));

    // Chart: payment method
    const pmMap = new Map<string, { vendas: number; receita: number }>();
    filteredConversions.forEach((c: any) => {
      const pm = c.payment_method || "(não informado)";
      const entry = pmMap.get(pm) || { vendas: 0, receita: 0 };
      entry.vendas++;
      entry.receita += Number(c.amount);
      pmMap.set(pm, entry);
    });
    const chartPaymentData = Array.from(pmMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.receita - a.receita);

    return { displayRows: rows, chartSourceData, chartDailyData, chartPaymentData };
  }, [clicks, filteredConversions, groupBy, sortKey, sortDir, fSource, fMedium, fCampaign]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const groupOptions: { value: GroupByKey; label: string }[] = [
    { value: "utm_source", label: "Source" },
    { value: "utm_campaign", label: "Campaign" },
    { value: "utm_medium", label: "Medium" },
    { value: "utm_content", label: "Content" },
    { value: "product_name", label: "Produto" },
    { value: "payment_method", label: "Pagamento" },
  ];

  // Summary metrics
  const totalSales = filteredConversions.length;
  const totalRevenue = filteredConversions.reduce((s: number, c: any) => s + Number(c.amount), 0);
  const totalFees = filteredConversions.reduce((s: number, c: any) => s + Number(c.fees || 0), 0);
  const totalNet = totalRevenue - totalFees;

  return (
    <DashboardLayout
      title="Relatório UTM"
      subtitle="Performance agrupada por parâmetros UTM e conversões"
      actions={
        <div className="flex items-center gap-2">
          <ProductTour {...TOURS.utmReport} />
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
          <div className="text-xs text-muted-foreground">Vendas</div>
          <div className="text-xl font-bold mt-1">{totalSales}</div>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
          <div className="text-xs text-muted-foreground">Receita Bruta</div>
          <div className="text-xl font-bold mt-1">R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
          <div className="text-xs text-muted-foreground">Taxas</div>
          <div className="text-xl font-bold mt-1 text-destructive">R$ {totalFees.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
          <div className="text-xs text-muted-foreground">Receita Líquida</div>
          <div className="text-xl font-bold mt-1 text-success">R$ {totalNet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow mb-6">
        <div className="text-xs font-medium text-muted-foreground mb-3">Filtros UTM</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">utm_source</Label>
            <Input value={fSource} onChange={(e) => setFSource(e.target.value)} placeholder="Ex: google" className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">utm_medium</Label>
            <Input value={fMedium} onChange={(e) => setFMedium(e.target.value)} placeholder="Ex: cpc" className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">utm_campaign</Label>
            <Input value={fCampaign} onChange={(e) => setFCampaign(e.target.value)} placeholder="Ex: black-friday" className="h-8 text-xs mt-1" />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue by source */}
        <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow">
          <h3 className="text-sm font-semibold mb-4">Receita por Origem (utm_source)</h3>
          {chartSourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartSourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 7%)", border: "1px solid hsl(240, 4%, 16%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="value" name="Receita" fill="hsl(1, 100%, 57%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">Sem dados</div>}
        </div>

        {/* Daily conversions */}
        <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow">
          <h3 className="text-sm font-semibold mb-4">Conversões por Dia</h3>
          {chartDailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartDailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 7%)", border: "1px solid hsl(240, 4%, 16%)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="vendas" name="Vendas" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">Sem dados</div>}
        </div>

        {/* Payment method */}
        <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow">
          <h3 className="text-sm font-semibold mb-4">Meios de Pagamento</h3>
          {chartPaymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartPaymentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 7%)", border: "1px solid hsl(240, 4%, 16%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="receita" name="Receita" fill="hsl(200, 80%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">Sem dados</div>}
        </div>
      </div>

      {/* Table */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-muted-foreground">Agrupar por:</span>
        {groupOptions.map((g) => (
          <button
            key={g.value}
            onClick={() => setGroupBy(g.value)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              groupBy === g.value ? "gradient-bg text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {g.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => exportToCsv(displayRows.map(r => ({
            [groupBy]: r.key,
            views: r.views,
            vendas: r.sales,
            receita: r.revenue.toFixed(2),
            taxa: r.rate.toFixed(2) + "%",
            ticket_medio: r.ticket.toFixed(2),
          })), `utm-report-${groupBy}`)}
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <SortHeader label={groupBy.replace("utm_", "").toUpperCase()} sortKey={groupBy} current={sortKey} dir={sortDir} onClick={toggleSort} />
                <SortHeader label="Views" sortKey="views" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="Vendas" sortKey="sales" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="Receita" sortKey="revenue" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="Taxa" sortKey="rate" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <SortHeader label="Ticket Médio" sortKey="ticket" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">Nenhum dado no período</td>
                </tr>
              ) : displayRows.map((r, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                  <td className="px-5 py-3 font-medium text-xs">{r.key}</td>
                  <td className="text-right px-5 py-3 font-mono text-xs">{r.views.toLocaleString("pt-BR")}</td>
                  <td className="text-right px-5 py-3 font-mono text-xs">{r.sales.toLocaleString("pt-BR")}</td>
                  <td className="text-right px-5 py-3 font-mono text-xs">R$ {r.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="text-right px-5 py-3 font-mono text-xs text-success">{r.rate.toFixed(2)}%</td>
                  <td className="text-right px-5 py-3 font-mono text-xs">R$ {r.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SortHeader({ label, sortKey, current, dir, onClick, align = "left" }: {
  label: string; sortKey: SortKey; current: SortKey; dir: "asc" | "desc"; onClick: (k: SortKey) => void; align?: "left" | "right";
}) {
  const active = current === sortKey;
  return (
    <th
      className={`px-5 py-3 text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onClick(sortKey)}
    >
      {label} {active && (dir === "asc" ? "↑" : "↓")}
    </th>
  );
}
