import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Activity, BarChart3, FileBarChart, Eye, ShoppingCart, DollarSign, TrendingUp,
  Target, Package, Layers, Globe, Megaphone, Monitor, FileText, CreditCard,
  Percent, HelpCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import MetricCard from "@/components/MetricCard";
import ChartLoader from "@/components/ChartLoader";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell, Legend, LabelList,
} from "recharts";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(240, 6%, 10%)",
  border: "1px solid hsl(240, 4%, 22%)",
  borderRadius: 8,
  fontSize: 12,
  color: "#f5f5f5",
  padding: "10px 14px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
};
const TICK_STYLE = { fontSize: 11, fill: "hsl(240, 5%, 55%)" };
const PIE_COLORS = ["hsl(0, 90%, 60%)", "hsl(0, 55%, 28%)"];

const CHART_PALETTES = [
  ["hsl(0, 90%, 60%)", "hsl(0, 80%, 48%)", "hsl(0, 70%, 38%)", "hsl(0, 60%, 28%)", "hsl(0, 95%, 70%)", "hsl(355, 85%, 55%)", "hsl(5, 75%, 45%)", "hsl(350, 70%, 40%)"],
  ["hsl(355, 85%, 55%)", "hsl(0, 90%, 60%)", "hsl(5, 75%, 45%)", "hsl(0, 70%, 38%)", "hsl(350, 70%, 40%)", "hsl(0, 80%, 48%)", "hsl(0, 60%, 28%)", "hsl(0, 95%, 70%)"],
  ["hsl(0, 70%, 38%)", "hsl(0, 95%, 70%)", "hsl(0, 80%, 48%)", "hsl(355, 85%, 55%)", "hsl(0, 60%, 28%)", "hsl(0, 90%, 60%)", "hsl(350, 70%, 40%)", "hsl(5, 75%, 45%)"],
  ["hsl(5, 75%, 45%)", "hsl(350, 70%, 40%)", "hsl(0, 90%, 60%)", "hsl(0, 60%, 28%)", "hsl(0, 95%, 70%)", "hsl(0, 70%, 38%)", "hsl(355, 85%, 55%)", "hsl(0, 80%, 48%)"],
  ["hsl(0, 60%, 28%)", "hsl(0, 95%, 70%)", "hsl(355, 85%, 55%)", "hsl(0, 80%, 48%)", "hsl(5, 75%, 45%)", "hsl(0, 90%, 60%)", "hsl(0, 70%, 38%)", "hsl(350, 70%, 40%)"],
  ["hsl(350, 70%, 40%)", "hsl(0, 80%, 48%)", "hsl(0, 95%, 70%)", "hsl(5, 75%, 45%)", "hsl(0, 70%, 38%)", "hsl(0, 60%, 28%)", "hsl(0, 90%, 60%)", "hsl(355, 85%, 55%)"],
];

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CustomTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const seen = new Set<string>();
  const filtered = payload.filter((entry: any) => {
    if (seen.has(entry.dataKey)) return false;
    seen.add(entry.dataKey);
    return true;
  });
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ color: "#e0e0e0", marginBottom: 4, fontWeight: 500 }}>{label}</p>
      {filtered.map((entry: any, i: number) => {
        const isRevenue = entry.dataKey === "revenue" || entry.dataKey === "value" || (entry.name && (entry.name.toLowerCase().includes("receita") || entry.name.toLowerCase().includes("faturamento")));
        const formattedValue = typeof entry.value === "number"
          ? isRevenue ? fmt(entry.value) : entry.value.toLocaleString("pt-BR")
          : entry.value;
        return (
          <p key={i} style={{ color: "#ffffff", fontSize: 12 }}>
            <span style={{ color: entry.color || "#f5f5f5", marginRight: 6 }}>●</span>
            {entry.name}: {formattedValue}
          </p>
        );
      })}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ color: "#ffffff", fontWeight: 500 }}>{entry.name}</p>
      <p style={{ color: "#e0e0e0", fontSize: 12 }}>{entry.value} vendas</p>
    </div>
  );
}

function MiniBarChart({ title, data, paletteIdx }: { title: string; data: { name: string; value: number }[]; paletteIdx: number }) {
  const palette = CHART_PALETTES[paletteIdx % CHART_PALETTES.length];
  return (
    <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 10 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} />
          <Tooltip content={<CustomTooltipContent />} />
          <Bar dataKey="value" name="Receita" radius={[0, 4, 4, 0]}>
            {data.slice(0, 6).map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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

export default function PublicView() {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePage, setActivePage] = useState(searchParams.get("page") || "dashboard");
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const url = new URL(`${supabaseUrl}/functions/v1/public-view`);
    url.searchParams.set("token", token);
    url.searchParams.set("from", dateRange.from.toISOString());
    url.searchParams.set("to", dateRange.to.toISOString());

    fetch(url.toString())
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, [token, dateRange, supabaseUrl]);

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setSearchParams({ page });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Eye className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Acesso negado</h2>
          <p className="text-muted-foreground text-sm">
            {error === "Token expired" ? "Este link expirou." : "Link inválido ou desativado."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 lg:px-8 py-4 max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold">{data?.project_name || "Carregando..."}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" /> Visualização pública (somente leitura)
              </p>
            </div>
          </div>
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-4 pb-12">
        {loading || !data ? (
          <ChartLoader text="Carregando relatório público..." />
        ) : (
          <Tabs value={activePage} onValueChange={handlePageChange}>
            <TabsList>
              <TabsTrigger value="dashboard" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Relatório
              </TabsTrigger>
              <TabsTrigger value="utm" className="gap-1.5">
                <FileBarChart className="h-3.5 w-3.5" /> Relatório UTM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <DashboardPublicView data={data} dateRange={dateRange} />
            </TabsContent>
            <TabsContent value="utm" className="mt-6">
              <UtmPublicView data={data} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

/* ─── DASHBOARD TAB ─── */

function DashboardPublicView({ data, dateRange }: { data: any; dateRange: DateRange }) {
  const conversions = data.conversions || [];
  const clicks = data.clicks || [];
  const smartLinks = data.smartlinks || [];

  const computed = useMemo(() => {
    const tv = clicks.length;
    const ts = conversions.length;
    const tr = conversions.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const cr = tv > 0 ? (ts / tv) * 100 : 0;
    const at = ts > 0 ? tr / ts : 0;

    // Daily chart
    const days = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000)) + 1;
    const dayMap = new Map<string, { views: number; sales: number; revenue: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(dateRange.from.getTime() + i * 86400000);
      const ds = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      dayMap.set(ds, { views: 0, sales: 0, revenue: 0 });
    }
    clicks.forEach((c: any) => {
      const ds = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const e = dayMap.get(ds); if (e) e.views++;
    });
    conversions.forEach((c: any) => {
      const ds = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const e = dayMap.get(ds); if (e) { e.sales++; e.revenue += Number(c.amount); }
    });
    const chartData = Array.from(dayMap.entries()).map(([date, v]) => ({ date, views: v.views, sales: v.sales, revenue: v.revenue }));

    // Group by helpers
    const groupBy = (key: string) => {
      const map = new Map<string, number>();
      conversions.forEach((c: any) => {
        const k = c[key] || "(não informado)";
        map.set(k, (map.get(k) || 0) + Number(c.amount));
      });
      return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    };

    // Products
    const prodMap = new Map<string, { vendas: number; receita: number; isOrderBump: boolean }>();
    conversions.forEach((c: any) => {
      const name = c.product_name || "Produto desconhecido";
      const e = prodMap.get(name) || { vendas: 0, receita: 0, isOrderBump: c.is_order_bump };
      e.vendas++; e.receita += Number(c.amount);
      prodMap.set(name, e);
    });
    const productData = Array.from(prodMap.entries())
      .map(([name, v]) => ({ name, vendas: v.vendas, receita: v.receita, ticket: v.vendas > 0 ? v.receita / v.vendas : 0, percentual: tr > 0 ? (v.receita / tr) * 100 : 0, isOrderBump: v.isOrderBump }))
      .sort((a, b) => b.receita - a.receita);

    // Order bumps
    const mainProducts = conversions.filter((c: any) => !c.is_order_bump);
    const orderBumps = conversions.filter((c: any) => c.is_order_bump);
    const mainRevenue = mainProducts.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const obRevenue = orderBumps.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const totalPieValue = mainProducts.length + orderBumps.length;
    const pieData = [
      { name: "Produto Principal", value: mainProducts.length, percent: totalPieValue > 0 ? (mainProducts.length / totalPieValue * 100) : 0 },
      { name: "Order Bump", value: orderBumps.length, percent: totalPieValue > 0 ? (orderBumps.length / totalPieValue * 100) : 0 },
    ];

    // Payment
    const paymentMap = new Map<string, { vendas: number; receita: number }>();
    conversions.forEach((c: any) => {
      const pm = c.payment_method || "(não informado)";
      const e = paymentMap.get(pm) || { vendas: 0, receita: 0 };
      e.vendas++; e.receita += Number(c.amount);
      paymentMap.set(pm, e);
    });
    const paymentData = Array.from(paymentMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.receita - a.receita);

    // SmartLink stats
    const linkStats = smartLinks.map((link: any) => {
      const lv = clicks.filter((c: any) => c.smartlink_id === link.id).length;
      const lConvs = conversions.filter((c: any) => c.smartlink_id === link.id);
      const lc = lConvs.length;
      const lr = lConvs.reduce((s: number, c: any) => s + Number(c.amount), 0);
      return { ...link, views: lv, sales: lc, revenue: lr, rate: lv > 0 ? (lc / lv) * 100 : 0 };
    });

    return {
      totalViews: tv, totalSales: ts, totalRevenue: tr, convRate: cr, avgTicket: at,
      chartData, productData, pieData,
      mainProductsCount: mainProducts.length, orderBumpsCount: orderBumps.length,
      mainRevenue, obRevenue,
      sourceData: groupBy("utm_source"),
      campaignData: groupBy("utm_campaign"),
      mediumData: groupBy("utm_medium"),
      contentData: groupBy("utm_content"),
      productChartData: productData.map(p => ({ name: p.name, value: p.receita })).slice(0, 8),
      paymentData,
      linkStats,
    };
  }, [conversions, clicks, smartLinks, dateRange]);

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = computed.pieData[index]?.percent ?? 0;
    if (pct < 5) return null;
    return (
      <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
        {pct.toFixed(1)}%
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard label="Total Views" value={computed.totalViews.toLocaleString("pt-BR")} icon={Eye} />
        <MetricCard label="Vendas" value={computed.totalSales.toLocaleString("pt-BR")} icon={ShoppingCart} />
        <MetricCard label="Taxa Conv." value={`${computed.convRate.toFixed(2)}%`} icon={Percent} />
        <MetricCard label="Faturamento" value={fmt(computed.totalRevenue)} icon={DollarSign} />
        <MetricCard label="Ticket Médio" value={fmt(computed.avgTicket)} icon={TrendingUp} />
      </div>

      {/* Daily chart */}
      <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-5 card-shadow">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Vendas Diárias
        </h3>
        {computed.chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={computed.chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="pv-colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(0, 90%, 60%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(0, 90%, 60%)" stopOpacity={0} /></linearGradient>
                <linearGradient id="pv-colorConv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0} /></linearGradient>
                <linearGradient id="pv-colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(30, 90%, 60%)" stopOpacity={0.9} /><stop offset="100%" stopColor="hsl(30, 60%, 35%)" stopOpacity={0.4} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
              <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipContent />} />
              <Bar yAxisId="right" dataKey="revenue" name="Faturamento (R$)" fill="url(#pv-colorRevenue)" radius={[3, 3, 0, 0]} />
              <Area yAxisId="left" type="monotone" dataKey="views" name="Views" stroke="hsl(0, 85%, 55%)" fillOpacity={1} fill="url(#pv-colorViews)" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" dataKey="sales" name="Vendas" stroke="hsl(150, 60%, 45%)" fillOpacity={1} fill="url(#pv-colorConv)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum dado no período</p>
        )}
      </div>

      {/* SmartLinks table */}
      {computed.linkStats.length > 0 && (
        <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Smart Links</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Slug</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Views</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Vendas</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Receita</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Taxa</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr></thead>
              <tbody>
                {computed.linkStats.map((link: any) => {
                  const variants = link.smartlink_variants || [];
                  return (
                    <> 
                      <tr key={link.id} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-xs">{link.name}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground font-mono">/{link.slug}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{link.views.toLocaleString("pt-BR")}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{link.sales.toLocaleString("pt-BR")}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{fmt(link.revenue)}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs text-muted-foreground">{link.rate.toFixed(2)}%</td>
                        <td className="text-right px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${link.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${link.is_active ? "bg-primary" : "bg-muted-foreground"}`} />
                            {link.is_active ? "Ativo" : "Pausado"}
                          </span>
                        </td>
                      </tr>
                      {variants.map((v: any) => {
                        const vClicks = clicks.filter((c: any) => c.variant_id === v.id).length;
                        const vConvs = conversions.filter((c: any) => c.variant_id === v.id);
                        const vSales = vConvs.length;
                        const vRevenue = vConvs.reduce((s: number, c: any) => s + Number(c.amount), 0);
                        const vRate = vClicks > 0 ? ((vSales / vClicks) * 100).toFixed(2) : "0.00";
                        return (
                          <tr key={v.id} className="border-b border-border/10 bg-muted/10">
                            <td className="px-5 py-2 text-xs text-muted-foreground pl-10">↳ {v.name}</td>
                            <td className="px-5 py-2 text-xs text-muted-foreground font-mono truncate max-w-[140px]" title={v.url}>{v.url}</td>
                            <td className="text-right px-5 py-2 font-mono text-xs text-muted-foreground">{vClicks.toLocaleString("pt-BR")}</td>
                            <td className="text-right px-5 py-2 font-mono text-xs text-muted-foreground">{vSales.toLocaleString("pt-BR")}</td>
                            <td className="text-right px-5 py-2 font-mono text-xs text-muted-foreground">{fmt(vRevenue)}</td>
                            <td className="text-right px-5 py-2 font-mono text-xs text-muted-foreground">{vRate}%</td>
                            <td className="text-right px-5 py-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                                {v.is_active ? "Ativa" : "Inativa"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products table */}
      {computed.productData.length > 0 && (
        <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Resumo por Produto</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Produto</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Vendas</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Receita</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Ticket</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">% Faturamento</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
              </tr></thead>
              <tbody>
                {computed.productData.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-xs">{p.name}</td>
                    <td className="text-right px-5 py-3 font-mono text-xs">{p.vendas}</td>
                    <td className="text-right px-5 py-3 font-mono text-xs">{fmt(p.receita)}</td>
                    <td className="text-right px-5 py-3 font-mono text-xs">{fmt(p.ticket)}</td>
                    <td className="text-right px-5 py-3 font-mono text-xs text-muted-foreground">{p.percentual.toFixed(1)}%</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.isOrderBump ? "bg-accent text-accent-foreground" : "bg-primary/20 text-primary"}`}>
                        {p.isOrderBump ? "Order Bump" : "Principal"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Bumps pie */}
      {computed.pieData.some(d => d.value > 0) && (
        <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Produtos vs Order Bumps
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={computed.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={4} dataKey="value" nameKey="name" label={renderPieLabel} labelLine={false}>
                  {computed.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="hsl(240, 5%, 12%)" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} formatter={(value) => <span style={{ color: "hsl(0, 0%, 80%)" }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center space-y-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                <p className="text-[11px] text-muted-foreground">Vendas Principais</p>
                <p className="text-lg font-bold">{computed.mainProductsCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                <p className="text-[11px] text-muted-foreground">Vendas Order Bumps</p>
                <p className="text-lg font-bold">{computed.orderBumpsCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                <p className="text-[11px] text-muted-foreground">Receita Principais</p>
                <p className="text-lg font-bold">{fmt(computed.mainRevenue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                <p className="text-[11px] text-muted-foreground">Receita Order Bumps</p>
                <p className="text-lg font-bold">{fmt(computed.obRevenue)}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-[11px] text-muted-foreground">Influência OB na Receita</p>
                <p className="text-lg font-bold text-primary">
                  {computed.mainRevenue > 0 ? `+${((computed.obRevenue / computed.mainRevenue) * 100).toFixed(1)}%` : "0%"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {computed.sourceData.length > 0 && <MiniBarChart title="Receita por Origem" data={computed.sourceData} paletteIdx={0} />}
        {computed.campaignData.length > 0 && <MiniBarChart title="Receita por Campanha" data={computed.campaignData} paletteIdx={1} />}
        {computed.mediumData.length > 0 && <MiniBarChart title="Receita por Medium" data={computed.mediumData} paletteIdx={2} />}
        {computed.contentData.length > 0 && <MiniBarChart title="Receita por Content" data={computed.contentData} paletteIdx={3} />}
        {computed.productChartData.length > 0 && <MiniBarChart title="Receita por Produto" data={computed.productChartData} paletteIdx={4} />}
        {computed.paymentData.length > 0 && <MiniBarChart title="Meios de Pagamento" data={computed.paymentData.map(p => ({ name: p.name, value: p.receita }))} paletteIdx={5} />}
      </div>
    </div>
  );
}

/* ─── UTM TAB ─── */

function UtmPublicView({ data }: { data: any }) {
  const conversions = data.conversions || [];
  const clicks = data.clicks || [];

  const FIXED_ORDER: GroupKey[] = ["date", "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term", "product_name", "payment_method"];
  const [activeGroupsSet, setActiveGroupsSet] = useState<Set<GroupKey>>(new Set(FIXED_ORDER));
  const activeGroups = FIXED_ORDER.filter(g => activeGroupsSet.has(g));
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [fSource, setFSource] = useState("all");
  const [fMedium, setFMedium] = useState("all");
  const [fCampaign, setFCampaign] = useState("all");
  const [fContent, setFContent] = useState("all");
  const [fTerm, setFTerm] = useState("all");
  const [fProduct, setFProduct] = useState("all");
  const [fPayment, setFPayment] = useState("all");

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
    const withDate = conversions.map((c: any) => ({
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
        views: 0, sales: 0, revenue: 0,
        ...Object.fromEntries(activeGroups.map(g => [g, c[g] || "(não informado)"])),
      };
      entry.sales++;
      entry.revenue += Number(c.amount);
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

    return {
      displayRows: rows,
      totalSales: filtered.length,
      totalRevenue: filtered.reduce((s: number, c: any) => s + Number(c.amount), 0),
    };
  }, [clicks, conversions, sortKey, sortDir, fSource, fMedium, fCampaign, fContent, fTerm, fProduct, fPayment, activeGroups]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleGroup = (g: GroupKey) => {
    setActiveGroupsSet(prev => {
      const next = new Set(prev);
      if (next.size === 1 && next.has(g)) return new Set(FIXED_ORDER);
      if (next.size === FIXED_ORDER.length || (next.size > 1 && !next.has(g))) return new Set([g]);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const resetGroups = () => setActiveGroupsSet(new Set(FIXED_ORDER));

  const totalPages = Math.max(1, Math.ceil(displayRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = displayRows.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
        <div className="flex items-center gap-2 mb-3">
          <FileBarChart className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <DropdownFilter label="utm_source" value={fSource} onChange={setFSource} options={distinctValues.sources} />
          <DropdownFilter label="utm_campaign" value={fCampaign} onChange={setFCampaign} options={distinctValues.campaigns} />
          <DropdownFilter label="utm_medium" value={fMedium} onChange={setFMedium} options={distinctValues.mediums} />
          <DropdownFilter label="utm_content" value={fContent} onChange={setFContent} options={distinctValues.contents} />
          <DropdownFilter label="utm_term" value={fTerm} onChange={setFTerm} options={distinctValues.terms} />
          <DropdownFilter label="Produto" value={fProduct} onChange={setFProduct} options={distinctValues.products} />
          <DropdownFilter label="Pagamento" value={fPayment} onChange={setFPayment} options={distinctValues.payments} />
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">Agrupamento</span>
            <button onClick={resetGroups} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-border/30 hover:border-border/60">Reset</button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {GROUP_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleGroup(opt.value)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors border text-center ${
                  activeGroups.includes(opt.value)
                    ? "border-primary/50 bg-primary/5 text-primary/80"
                    : "border-border/30 text-muted-foreground/60 hover:text-muted-foreground hover:border-border/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Vendas</span>
          <div className="text-lg font-bold mt-1">{totalSales}</div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Faturamento</span>
          <div className="text-lg font-bold mt-1">{fmt(totalRevenue)}</div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Agrupamentos</span>
          <div className="text-lg font-bold mt-1">{displayRows.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="border-b border-border/30 bg-muted/20">
              {activeGroups.map(g => {
                const label = GROUP_OPTIONS.find(o => o.value === g)?.label || g;
                return (
                  <th key={g} className="px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground transition-colors whitespace-nowrap text-left" onClick={() => toggleSort(g)}>
                    {label} {sortKey === g && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                );
              })}
              <th className="px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground text-right" onClick={() => toggleSort("sales")}>
                Vendas {sortKey === "sales" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 text-[10px] font-medium text-muted-foreground uppercase cursor-pointer hover:text-foreground text-right" onClick={() => toggleSort("revenue")}>
                Receita {sortKey === "revenue" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
            </tr></thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr><td colSpan={activeGroups.length + 2} className="px-5 py-12 text-center text-muted-foreground text-sm">Nenhum dado no período</td></tr>
              ) : (
                <>
                  {paginatedRows.map((r: any, i: number) => {
                    const prevRow = i > 0 ? paginatedRows[i - 1] : null;
                    const firstGroupSame = prevRow && activeGroups.length > 0 && r[activeGroups[0]] === prevRow[activeGroups[0]];
                    return (
                      <tr key={i} className={`border-b border-border/20 hover:bg-accent/20 transition-colors ${firstGroupSame ? "border-border/10" : "border-t border-border/30"}`}>
                        {activeGroups.map((g, gi) => {
                          const showValue = gi === 0 && firstGroupSame ? "" : r[g];
                          return (
                            <td key={g} className={`px-2 sm:px-4 py-2 sm:py-3 text-xs truncate max-w-[160px] ${gi === 0 ? "font-medium" : "text-muted-foreground"} ${gi === 0 && firstGroupSame ? "opacity-0" : ""}`} title={r[g]}>{showValue}</td>
                          );
                        })}
                        <td className="text-right px-2 sm:px-4 py-2 sm:py-3 font-mono text-xs tabular-nums">{r.sales.toLocaleString("pt-BR")}</td>
                        <td className="text-right px-2 sm:px-4 py-2 sm:py-3 font-mono text-xs tabular-nums font-medium">{fmt(r.revenue)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-primary/30 bg-primary/5 font-semibold">
                    {activeGroups.map((g, gi) => (
                      <td key={g} className="px-4 py-3 text-xs uppercase tracking-wider">{gi === 0 ? "Total" : ""}</td>
                    ))}
                    <td className="text-right px-4 py-3 font-mono text-xs tabular-nums">{totalSales.toLocaleString("pt-BR")}</td>
                    <td className="text-right px-4 py-3 font-mono text-xs tabular-nums">{fmt(totalRevenue)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end flex-wrap gap-3">
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
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
