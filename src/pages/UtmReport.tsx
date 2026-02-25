/* v2 - force full remount */
import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { FileBarChart, ChevronLeft, ChevronRight, DollarSign, HelpCircle, Pencil, Check, TrendingUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExportMenu from "@/components/ExportMenu";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { useInvestment } from "@/hooks/useInvestment";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type GroupKey = "utm_source" | "utm_campaign" | "utm_medium" | "utm_content" | "utm_term" | "product_name" | "payment_method" | "date";
type SortKey = GroupKey | "sales" | "revenue";

const GROUP_OPTIONS: { value: GroupKey; label: string }[] = [
  { value: "date", label: "Data" },
  { value: "utm_source", label: "Source" },
  { value: "utm_campaign", label: "Campaign" },
  { value: "utm_medium", label: "Medium" },
  { value: "utm_content", label: "Content" },
  { value: "utm_term", label: "Term" },
  { value: "product_name", label: "Produto" },
  { value: "payment_method", label: "Pagamento" },
];

export default function UtmReport() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [activeGroups, setActiveGroups] = useState<GroupKey[]>(["date", "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term", "product_name", "payment_method"]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();

  const [fSource, setFSource] = useState("all");
  const [fMedium, setFMedium] = useState("all");
  const [fCampaign, setFCampaign] = useState("all");
  const [fContent, setFContent] = useState("all");
  const [fTerm, setFTerm] = useState("all");
  const [fProduct, setFProduct] = useState("all");
  const [fPayment, setFPayment] = useState("all");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("nexus_excluded_conversions");
      return stored ? new Set(JSON.parse(stored)) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const excludeConversions = useCallback((ids: string[]) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      localStorage.setItem("nexus_excluded_conversions", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const since = dateRange.from.toISOString();
  const until = dateRange.to.toISOString();
  const periodKey = `${since}__${until}`;
  const { investmentInput, handleInvestmentChange, investmentValue } = useInvestment(periodKey);

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

  const distinctValues = useMemo(() => {
    const extract = (key: string) => {
      const set = new Set<string>();
      conversions.forEach((c: any) => { if (c[key]) set.add(c[key]); });
      clicks.forEach((c: any) => { if (c[key]) set.add(c[key]); });
      return Array.from(set).sort();
    };
    return {
      sources: extract("utm_source"),
      mediums: extract("utm_medium"),
      campaigns: extract("utm_campaign"),
      contents: extract("utm_content"),
      terms: extract("utm_term"),
      products: Array.from(new Set(conversions.map((c: any) => c.product_name).filter(Boolean))).sort() as string[],
      payments: Array.from(new Set(conversions.map((c: any) => c.payment_method).filter(Boolean))).sort() as string[],
    };
  }, [clicks, conversions]);

  const { displayRows, totalSales, totalRevenue } = useMemo(() => {
    const testPattern = /teste|test/i;
    const isTestValue = (val: any) => typeof val === "string" && testPattern.test(val);

    const withDate = conversions
      .filter((c: any) => !excludedIds.has(c.id))
      .map((c: any) => ({
        ...c,
        date: new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
      }));

    const filtered = withDate.filter((c: any) => {
      if (fSource !== "all" && (c.utm_source || '') !== fSource) return false;
      if (fMedium !== "all" && (c.utm_medium || '') !== fMedium) return false;
      if (fCampaign !== "all" && (c.utm_campaign || '') !== fCampaign) return false;
      if (fContent !== "all" && (c.utm_content || '') !== fContent) return false;
      if (fTerm !== "all" && (c.utm_term || '') !== fTerm) return false;
      if (fProduct !== "all" && (c.product_name || '') !== fProduct) return false;
      if (fPayment !== "all" && (c.payment_method || '') !== fPayment) return false;
      return true;
    });

    const filteredClicks = clicks.map((v: any) => ({
      ...v,
      date: new Date(v.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    })).filter((v: any) => {
      if (fSource !== "all" && (v.utm_source || '') !== fSource) return false;
      if (fMedium !== "all" && (v.utm_medium || '') !== fMedium) return false;
      if (fCampaign !== "all" && (v.utm_campaign || '') !== fCampaign) return false;
      if (fContent !== "all" && (v.utm_content || '') !== fContent) return false;
      if (fTerm !== "all" && (v.utm_term || '') !== fTerm) return false;
      return true;
    });

    const makeKey = (item: any) => activeGroups.map(g => item[g] || "(não informado)").join("||");

    const groups = new Map<string, any>();

    filtered.forEach((c: any) => {
      const key = makeKey(c);
      const entry = groups.get(key) || {
        views: 0, sales: 0, revenue: 0, _conversionIds: [] as string[], _isTest: false,
        ...Object.fromEntries(activeGroups.map(g => [g, c[g] || "(não informado)"])),
      };
      entry.sales++;
      entry.revenue += Number(c.amount);
      entry._conversionIds.push(c.id);
      // Check if any field contains test-related text
      if (isTestValue(c.utm_source) || isTestValue(c.utm_campaign) || isTestValue(c.utm_medium) || isTestValue(c.utm_content) || isTestValue(c.utm_term) || isTestValue(c.product_name) || isTestValue(c.transaction_id)) {
        entry._isTest = true;
      }
      groups.set(key, entry);
    });

    filteredClicks.forEach((v: any) => {
      const key = makeKey(v);
      const entry = groups.get(key);
      if (entry) entry.views++;
    });

    const rows = Array.from(groups.values());

    rows.sort((a: any, b: any) => {
      const aV = a[sortKey];
      const bV = b[sortKey];
      if (typeof aV === "string") return sortDir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV);
      return sortDir === "asc" ? aV - bV : bV - aV;
    });

    const tSales = filtered.length;
    const tRevenue = filtered.reduce((s: number, c: any) => s + Number(c.amount), 0);
    return {
      displayRows: rows,
      totalSales: tSales,
      totalRevenue: tRevenue,
    };
  }, [clicks, conversions, sortKey, sortDir, fSource, fMedium, fCampaign, fContent, fTerm, fProduct, fPayment, activeGroups, excludedIds]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleGroup = (g: GroupKey) => {
    setActiveGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
      {/* Filters */}
      <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileBarChart className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <DropdownFilter label="utm_source" value={fSource} onChange={setFSource} options={distinctValues.sources} />
          <DropdownFilter label="utm_medium" value={fMedium} onChange={setFMedium} options={distinctValues.mediums} />
          <DropdownFilter label="utm_campaign" value={fCampaign} onChange={setFCampaign} options={distinctValues.campaigns} />
          <DropdownFilter label="utm_content" value={fContent} onChange={setFContent} options={distinctValues.contents} />
          <DropdownFilter label="utm_term" value={fTerm} onChange={setFTerm} options={distinctValues.terms} />
          <DropdownFilter label="Produto" value={fProduct} onChange={setFProduct} options={distinctValues.products} />
          <DropdownFilter label="Pagamento" value={fPayment} onChange={setFPayment} options={distinctValues.payments} />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Vendas</span>
            <div className="h-7 w-7 rounded-lg gradient-bg-soft flex items-center justify-center">
              <FileBarChart className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <div className="text-lg font-bold">{totalSales}</div>
        </div>
        {/* Investment card */}
        <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Investimento</span>
            <div className="h-7 w-7 rounded-lg gradient-bg-soft flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <input
            value={investmentInput}
            onChange={handleInvestmentChange}
            placeholder="R$ 0,00"
            className="text-lg font-bold bg-transparent outline-none w-full px-1 py-0 rounded border border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/40 transition-colors h-[28px]"
          />
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Faturamento</span>
            <div className="h-7 w-7 rounded-lg gradient-bg-soft flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <div className="text-lg font-bold">{fmt(totalRevenue)}</div>
        </div>
        {/* ROAS card */}
        {(() => {
          const roas = investmentValue > 0 ? totalRevenue / investmentValue : 0;
          const roasColor = roas >= 3 ? "hsl(142, 71%, 45%)" : roas >= 1 ? "hsl(48, 96%, 53%)" : "hsl(0, 84%, 60%)";
          return (
            <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">ROAS</span>
                <div className="h-7 w-7 rounded-lg gradient-bg-soft flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <div className="text-lg font-bold font-mono" style={{ color: investmentValue > 0 ? roasColor : undefined }}>
                {investmentValue > 0 ? roas.toFixed(2) + "x" : "—"}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Grouping — moved below KPIs */}
      <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agrupamento</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {GROUP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleGroup(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                activeGroups.includes(opt.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">{displayRows.length} agrupamento(s)</span>
        <ExportMenu
          data={displayRows.map((r: any) => {
            const row: any = {};
            activeGroups.forEach(g => { row[g] = r[g]; });
            row.vendas = r.sales; row.receita = r.revenue.toFixed(2);
            return row;
          })}
          filename="utm-report"
          title="Relatório UTM — Nexus Metrics"
          kpis={[
            { label: "Vendas", value: String(totalSales) },
            { label: "Faturamento", value: fmt(totalRevenue) },
          ]}
        />
      </div>

      {/* Table with pagination */}
      {(() => {
        const totalPages = Math.max(1, Math.ceil(displayRows.length / perPage));
        const currentPage = Math.min(page, totalPages);
        const startIdx = (currentPage - 1) * perPage;
        const paginatedRows = displayRows.slice(startIdx, startIdx + perPage);
        return (
          <>
             <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <thead><tr className="border-b border-border/30 bg-muted/20">
                    {activeGroups.map(g => {
                      const label = GROUP_OPTIONS.find(o => o.value === g)?.label || g;
                      return <SortHeader key={g} label={label} sortKey={g} current={sortKey} dir={sortDir} onClick={toggleSort} />;
                    })}
                    <SortHeader label="Vendas" sortKey="sales" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                    <SortHeader label="Receita" sortKey="revenue" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                    <th className="px-2 py-3 w-10"></th>
                  </tr></thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr><td colSpan={activeGroups.length + 3} className="px-5 py-12 text-center text-muted-foreground text-sm">Nenhum dado no período</td></tr>
                    ) : (
                      <>
                        {paginatedRows.map((r: any, i: number) => {
                          // Check if this row shares the same first group value as previous
                          const prevRow = i > 0 ? paginatedRows[i - 1] : null;
                          const firstGroupSame = prevRow && activeGroups.length > 0 && r[activeGroups[0]] === prevRow[activeGroups[0]];
                          return (
                            <tr key={i} className={`border-b border-border/20 hover:bg-accent/20 transition-colors ${firstGroupSame ? "border-border/10" : "border-t border-border/30"}`}>
                              {activeGroups.map((g, gi) => {
                                // Group identical first-column values visually
                                const showValue = gi === 0 && firstGroupSame ? "" : r[g];
                                return (
                                  <td key={g} className={`px-4 py-3 text-xs truncate max-w-[160px] ${gi === 0 ? "font-medium" : "text-muted-foreground"} ${gi === 0 && firstGroupSame ? "opacity-0" : ""}`} title={r[g]}>{showValue}</td>
                                );
                              })}
                              <td className="text-right px-4 py-3 font-mono text-xs tabular-nums">{r.sales.toLocaleString("pt-BR")}</td>
                              <td className="text-right px-4 py-3 font-mono text-xs tabular-nums font-medium">{fmt(r.revenue)}</td>
                              <td className="px-2 py-3 text-center">
                                {r._isTest && (
                                  <button
                                    onClick={() => excludeConversions(r._conversionIds)}
                                    className="text-destructive/60 hover:text-destructive transition-colors"
                                    title="Excluir evento de teste"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Totals row */}
                        <tr className="border-t-2 border-primary/30 bg-primary/5 font-semibold">
                          {activeGroups.map((g, gi) => (
                            <td key={g} className="px-4 py-3 text-xs uppercase tracking-wider">{gi === 0 ? "Total" : ""}</td>
                          ))}
                          <td className="text-right px-4 py-3 font-mono text-xs tabular-nums">{totalSales.toLocaleString("pt-BR")}</td>
                          <td className="text-right px-4 py-3 font-mono text-xs tabular-nums">{fmt(totalRevenue)}</td>
                          <td></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination controls below table */}
            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] text-muted-foreground">Por página:</Label>
                <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</span>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        );
      })()}
    </DashboardLayout>
  );
}

function DropdownFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Todos" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
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
