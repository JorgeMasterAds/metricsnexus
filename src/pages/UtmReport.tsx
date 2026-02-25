import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { Download, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csv";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SortKey = "utm_source" | "utm_campaign" | "utm_medium" | "utm_content" | "utm_term" | "product_name" | "payment_method" | "views" | "sales" | "revenue" | "rate" | "ticket";

interface UtmRow {
  utm_source: string;
  utm_campaign: string;
  utm_medium: string;
  utm_content: string;
  utm_term: string;
  product_name: string;
  payment_method: string;
  views: number;
  sales: number;
  revenue: number;
  rate: number;
  ticket: number;
}

export default function UtmReport() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();

  const [fSource, setFSource] = useState("");
  const [fMedium, setFMedium] = useState("");
  const [fCampaign, setFCampaign] = useState("");
  const [fContent, setFContent] = useState("");
  const [fTerm, setFTerm] = useState("");
  const [fProduct, setFProduct] = useState("");
  const [fPayment, setFPayment] = useState("");

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

  const { displayRows, totalSales, totalRevenue } = useMemo(() => {
    // Filter conversions
    const filtered = conversions.filter((c: any) => {
      if (fSource && !(c.utm_source || '').toLowerCase().includes(fSource.toLowerCase())) return false;
      if (fMedium && !(c.utm_medium || '').toLowerCase().includes(fMedium.toLowerCase())) return false;
      if (fCampaign && !(c.utm_campaign || '').toLowerCase().includes(fCampaign.toLowerCase())) return false;
      if (fContent && !(c.utm_content || '').toLowerCase().includes(fContent.toLowerCase())) return false;
      if (fTerm && !(c.utm_term || '').toLowerCase().includes(fTerm.toLowerCase())) return false;
      if (fProduct && !(c.product_name || '').toLowerCase().includes(fProduct.toLowerCase())) return false;
      if (fPayment && !(c.payment_method || '').toLowerCase().includes(fPayment.toLowerCase())) return false;
      return true;
    });

    // Filter clicks
    const filteredClicks = clicks.filter((v: any) => {
      if (fSource && !(v.utm_source || '').toLowerCase().includes(fSource.toLowerCase())) return false;
      if (fMedium && !(v.utm_medium || '').toLowerCase().includes(fMedium.toLowerCase())) return false;
      if (fCampaign && !(v.utm_campaign || '').toLowerCase().includes(fCampaign.toLowerCase())) return false;
      if (fContent && !(v.utm_content || '').toLowerCase().includes(fContent.toLowerCase())) return false;
      if (fTerm && !(v.utm_term || '').toLowerCase().includes(fTerm.toLowerCase())) return false;
      return true;
    });

    // Build composite key per conversion for full-detail rows
    const convByClick = new Map<string, any[]>();
    filtered.forEach((c: any) => { if (c.click_id) { const arr = convByClick.get(c.click_id) || []; arr.push(c); convByClick.set(c.click_id, arr); } });

    // Group by composite key: source+campaign+medium+content+term+product+payment
    const groups = new Map<string, { views: number; sales: number; revenue: number; utm_source: string; utm_campaign: string; utm_medium: string; utm_content: string; utm_term: string; product_name: string; payment_method: string }>();

    const makeKey = (s: string, ca: string, m: string, co: string, t: string, p: string, pm: string) => `${s}||${ca}||${m}||${co}||${t}||${p}||${pm}`;

    filtered.forEach((c: any) => {
      const s = c.utm_source || "(não informado)";
      const ca = c.utm_campaign || "(não informado)";
      const m = c.utm_medium || "(não informado)";
      const co = c.utm_content || "(não informado)";
      const t = c.utm_term || "(não informado)";
      const p = c.product_name || "(não informado)";
      const pm = c.payment_method || "(não informado)";
      const key = makeKey(s, ca, m, co, t, p, pm);

      const entry = groups.get(key) || { views: 0, sales: 0, revenue: 0, utm_source: s, utm_campaign: ca, utm_medium: m, utm_content: co, utm_term: t, product_name: p, payment_method: pm };
      entry.sales++;
      entry.revenue += Number(c.amount);
      groups.set(key, entry);
    });

    // Count views from clicks matching same UTM
    filteredClicks.forEach((v: any) => {
      const s = v.utm_source || "(não informado)";
      const ca = v.utm_campaign || "(não informado)";
      const m = v.utm_medium || "(não informado)";
      const co = v.utm_content || "(não informado)";
      const t = v.utm_term || "(não informado)";
      // Attribute views to all groups with matching UTMs
      groups.forEach((entry) => {
        if (entry.utm_source === s && entry.utm_campaign === ca && entry.utm_medium === m) {
          entry.views++;
        }
      });
    });

    const rows: UtmRow[] = Array.from(groups.values()).map(val => ({
      ...val,
      rate: val.views > 0 ? (val.sales / val.views) * 100 : 0,
      ticket: val.sales > 0 ? val.revenue / val.sales : 0,
    }));

    rows.sort((a, b) => {
      const aV = (a as any)[sortKey];
      const bV = (b as any)[sortKey];
      if (typeof aV === "string") return sortDir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV);
      return sortDir === "asc" ? aV - bV : bV - aV;
    });

    return {
      displayRows: rows,
      totalSales: filtered.length,
      totalRevenue: filtered.reduce((s: number, c: any) => s + Number(c.amount), 0),
    };
  }, [clicks, conversions, sortKey, sortDir, fSource, fMedium, fCampaign, fContent, fTerm, fProduct, fPayment]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <DashboardLayout
      title="Relatório UTM"
      subtitle="Análise detalhada por parâmetros UTM, produto e pagamento"
      actions={
        <div className="flex items-center gap-2">
          <ProductTour {...TOURS.utmReport} />
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      }
    >
      {/* Filters - always visible */}
      <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileBarChart className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <FilterInput label="utm_source" value={fSource} onChange={setFSource} placeholder="google" />
          <FilterInput label="utm_medium" value={fMedium} onChange={setFMedium} placeholder="cpc" />
          <FilterInput label="utm_campaign" value={fCampaign} onChange={setFCampaign} placeholder="black-friday" />
          <FilterInput label="utm_content" value={fContent} onChange={setFContent} placeholder="banner" />
          <FilterInput label="utm_term" value={fTerm} onChange={setFTerm} placeholder="keyword" />
          <FilterInput label="Produto" value={fProduct} onChange={setFProduct} placeholder="Curso X" />
          <FilterInput label="Pagamento" value={fPayment} onChange={setFPayment} placeholder="PIX" />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
          <div className="text-xs text-muted-foreground">Vendas</div>
          <div className="text-xl font-bold mt-1">{totalSales}</div>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
          <div className="text-xs text-muted-foreground">Faturamento</div>
          <div className="text-xl font-bold mt-1">{fmt(totalRevenue)}</div>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
          <div className="text-xs text-muted-foreground">Ticket Médio</div>
          <div className="text-xl font-bold mt-1">{totalSales > 0 ? fmt(totalRevenue / totalSales) : "R$ 0,00"}</div>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
          <div className="text-xs text-muted-foreground">Views (clicks)</div>
          <div className="text-xl font-bold mt-1">{clicks.length.toLocaleString("pt-BR")}</div>
        </div>
      </div>

      {/* Export */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">{displayRows.length} agrupamento(s)</span>
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => exportToCsv(displayRows.map(r => ({
          utm_source: r.utm_source, utm_campaign: r.utm_campaign, utm_medium: r.utm_medium, utm_content: r.utm_content, utm_term: r.utm_term,
          produto: r.product_name, pagamento: r.payment_method,
          views: r.views, vendas: r.sales, receita: r.revenue.toFixed(2), taxa: r.rate.toFixed(2) + "%", ticket_medio: r.ticket.toFixed(2),
        })), "utm-report")}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border/30">
              <SortHeader label="Source" sortKey="utm_source" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Campaign" sortKey="utm_campaign" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Medium" sortKey="utm_medium" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Content" sortKey="utm_content" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Term" sortKey="utm_term" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Produto" sortKey="product_name" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Pagamento" sortKey="payment_method" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortHeader label="Views" sortKey="views" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              <SortHeader label="Vendas" sortKey="sales" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              <SortHeader label="Receita" sortKey="revenue" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              <SortHeader label="Taxa" sortKey="rate" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              <SortHeader label="Ticket" sortKey="ticket" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            </tr></thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr><td colSpan={12} className="px-5 py-12 text-center text-muted-foreground text-sm">Nenhum dado no período</td></tr>
              ) : displayRows.map((r, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium truncate max-w-[100px]" title={r.utm_source}>{r.utm_source}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[100px]" title={r.utm_campaign}>{r.utm_campaign}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[80px]" title={r.utm_medium}>{r.utm_medium}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[80px]" title={r.utm_content}>{r.utm_content}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[80px]" title={r.utm_term}>{r.utm_term}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[100px]" title={r.product_name}>{r.product_name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[80px]" title={r.payment_method}>{r.payment_method}</td>
                  <td className="text-right px-4 py-3 font-mono text-xs">{r.views.toLocaleString("pt-BR")}</td>
                  <td className="text-right px-4 py-3 font-mono text-xs">{r.sales.toLocaleString("pt-BR")}</td>
                  <td className="text-right px-4 py-3 font-mono text-xs">{fmt(r.revenue)}</td>
                  <td className="text-right px-4 py-3 font-mono text-xs text-success">{r.rate.toFixed(2)}%</td>
                  <td className="text-right px-4 py-3 font-mono text-xs">{fmt(r.ticket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function FilterInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-xs mt-1" />
    </div>
  );
}

function SortHeader({ label, sortKey, current, dir, onClick, align = "left" }: { label: string; sortKey: SortKey; current: SortKey; dir: "asc" | "desc"; onClick: (k: SortKey) => void; align?: "left" | "right" }) {
  const active = current === sortKey;
  return (
    <th
      className={`px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground transition-colors whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onClick(sortKey)}
    >
      {label} {active && (dir === "asc" ? "↑" : "↓")}
    </th>
  );
}
