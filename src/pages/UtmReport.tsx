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

type GroupByKey = "utm_campaign" | "utm_medium" | "utm_content" | "utm_source" | "product_name";
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
  const [groupBy, setGroupBy] = useState<GroupByKey>("utm_campaign");
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { activeAccountId } = useAccount();

  const since = dateRange.from.toISOString();
  const until = dateRange.to.toISOString();

  // Use clicks table instead of views
  const { data: clicks = [] } = useQuery({
    queryKey: ["utm-clicks", since, until, activeAccountId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("clicks")
        .select("id, utm_source, utm_medium, utm_campaign, utm_content, click_id")
        .gte("created_at", since)
        .lte("created_at", until);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["utm-conversions", since, until, activeAccountId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("id, amount, click_id, status")
        .eq("status", "approved")
        .gte("created_at", since)
        .lte("created_at", until);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  const { rows, sorted } = useMemo(() => {
    const convByClick = new Map<string, number>();
    const convCountByClick = new Map<string, number>();
    conversions.forEach((c: any) => {
      if (c.click_id) {
        convByClick.set(c.click_id, (convByClick.get(c.click_id) || 0) + Number(c.amount));
        convCountByClick.set(c.click_id, (convCountByClick.get(c.click_id) || 0) + 1);
      }
    });

    const groups = new Map<string, { views: number; sales: number; revenue: number }>();
    const usedClicks = new Set<string>();
    clicks.forEach((v: any) => {
      const key = v[groupBy] || "(not set)";
      const entry = groups.get(key) || { views: 0, sales: 0, revenue: 0 };
      entry.views++;
      if (v.click_id && convCountByClick.has(v.click_id) && !usedClicks.has(v.click_id)) {
        entry.sales += convCountByClick.get(v.click_id) || 0;
        entry.revenue += convByClick.get(v.click_id) || 0;
        usedClicks.add(v.click_id);
      }
      groups.set(key, entry);
    });

    const r: UtmRow[] = Array.from(groups.entries()).map(([key, val]) => ({
      key,
      views: val.views,
      sales: val.sales,
      revenue: val.revenue,
      rate: val.views > 0 ? (val.sales / val.views) * 100 : 0,
      ticket: val.sales > 0 ? val.revenue / val.sales : 0,
    }));

    const s = [...r].sort((a, b) => {
      const aVal = sortKey === groupBy ? a.key : (a as any)[sortKey];
      const bVal = sortKey === groupBy ? b.key : (b as any)[sortKey];
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return { rows: r, sorted: s };
  }, [clicks, conversions, groupBy, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const { data: productConversions = [] } = useQuery({
    queryKey: ["utm-product-conversions", since, until, activeAccountId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("id, amount, click_id, status, product_name")
        .eq("status", "approved")
        .gte("created_at", since)
        .lte("created_at", until);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId && groupBy === "product_name",
  });

  const productRows = useMemo(() => {
    if (groupBy !== "product_name") return [];
    const groups = new Map<string, { views: number; sales: number; revenue: number }>();
    const viewsByClick = new Map<string, number>();
    clicks.forEach((v: any) => {
      if (v.click_id) viewsByClick.set(v.click_id, (viewsByClick.get(v.click_id) || 0) + 1);
    });
    productConversions.forEach((c: any) => {
      const name = c.product_name || "(sem produto)";
      const entry = groups.get(name) || { views: 0, sales: 0, revenue: 0 };
      entry.sales++;
      entry.revenue += Number(c.amount);
      if (c.click_id && viewsByClick.has(c.click_id)) {
        entry.views += viewsByClick.get(c.click_id) || 0;
      }
      groups.set(name, entry);
    });
    return Array.from(groups.entries()).map(([key, val]) => ({
      key,
      views: val.views,
      sales: val.sales,
      revenue: val.revenue,
      rate: val.views > 0 ? (val.sales / val.views) * 100 : 0,
      ticket: val.sales > 0 ? val.revenue / val.sales : 0,
    }));
  }, [groupBy, clicks, productConversions]);

  const displayRows = groupBy === "product_name" ? productRows : sorted;

  const groupOptions: { value: GroupByKey; label: string }[] = [
    { value: "utm_campaign", label: "Campaign" },
    { value: "utm_medium", label: "Medium" },
    { value: "utm_content", label: "Content" },
    { value: "utm_source", label: "Source" },
    { value: "product_name", label: "Produto" },
  ];

  return (
    <DashboardLayout
      title="Relatório UTM"
      subtitle="Performance agrupada por parâmetros UTM"
      actions={
        <div className="flex items-center gap-2">
          <ProductTour {...TOURS.utmReport} />
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      }
    >
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
                <SortHeader label={groupBy === "product_name" ? "PRODUTO" : groupBy.replace("utm_", "").toUpperCase()} sortKey={groupBy} current={sortKey} dir={sortDir} onClick={toggleSort} />
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
