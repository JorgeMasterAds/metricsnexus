import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line,
} from "recharts";
import { MousePointerClick, TrendingUp, DollarSign, BarChart3, Ticket, Download, ShoppingCart } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import GamificationBar from "@/components/GamificationBar";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csv";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const sinceDate = dateRange.from.toISOString().split("T")[0];
  const untilDate = dateRange.to.toISOString().split("T")[0];

  const { data: metrics = [] } = useQuery({
    queryKey: ["dash-daily-metrics", sinceDate, untilDate, activeAccountId, activeProjectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("daily_metrics")
        .select("date, smartlink_id, variant_id, views, conversions, revenue")
        .gte("date", sinceDate)
        .lte("date", untilDate)
        .eq("account_id", activeAccountId);
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  const { data: smartLinks = [] } = useQuery({
    queryKey: ["dash-smartlinks", activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("smartlinks")
        .select("id, name, slug, is_active, created_at, smartlink_variants(id, name, url, weight, is_active)")
        .eq("account_id", activeAccountId)
        .order("created_at", { ascending: false });
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  const { totalViews, totalSales, totalRevenue, convRate, avgTicket, chartData, salesChartData, linkStats } = useMemo(() => {
    const tv = metrics.reduce((s: number, m: any) => s + Number(m.views), 0);
    const ts = metrics.reduce((s: number, m: any) => s + Number(m.conversions), 0);
    const tr = metrics.reduce((s: number, m: any) => s + Number(m.revenue), 0);
    const cr = tv > 0 ? (ts / tv) * 100 : 0;
    const at = ts > 0 ? tr / ts : 0;

    const dayMap = new Map<string, { views: number; sales: number; revenue: number }>();
    metrics.forEach((m: any) => {
      const dateStr = new Date(m.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entry = dayMap.get(dateStr) || { views: 0, sales: 0, revenue: 0 };
      entry.views += Number(m.views);
      entry.sales += Number(m.conversions);
      entry.revenue += Number(m.revenue);
      dayMap.set(dateStr, entry);
    });

    const days = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000));
    const cd: { date: string; views: number; sales: number }[] = [];
    const scd: { date: string; vendas: number; receita: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(dateRange.from.getTime() + i * 86400000);
      const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entry = dayMap.get(dateStr) || { views: 0, sales: 0, revenue: 0 };
      cd.push({ date: dateStr, views: entry.views, sales: entry.sales });
      scd.push({ date: dateStr, vendas: entry.sales, receita: entry.revenue });
    }

    const ls = smartLinks.map((link: any) => {
      const linkMetrics = metrics.filter((m: any) => m.smartlink_id === link.id);
      const lv = linkMetrics.reduce((s: number, m: any) => s + Number(m.views), 0);
      const lc = linkMetrics.reduce((s: number, m: any) => s + Number(m.conversions), 0);
      const lr = linkMetrics.reduce((s: number, m: any) => s + Number(m.revenue), 0);
      const lRate = lv > 0 ? (lc / lv) * 100 : 0;
      const lTicket = lc > 0 ? lr / lc : 0;
      return { ...link, views: lv, sales: lc, revenue: lr, rate: lRate, ticket: lTicket };
    });

    return { totalViews: tv, totalSales: ts, totalRevenue: tr, convRate: cr, avgTicket: at, chartData: cd, salesChartData: scd, linkStats: ls };
  }, [metrics, smartLinks, dateRange]);

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Visão geral dos seus experimentos"
      actions={
        <div className="flex items-center gap-2">
          <ProductTour {...TOURS.dashboard} />
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      }
    >
      <GamificationBar since={dateRange.from.toISOString()} until={dateRange.to.toISOString()} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard label="Total Views" value={totalViews.toLocaleString("pt-BR")} icon={MousePointerClick} />
        <MetricCard label="Vendas" value={totalSales.toLocaleString("pt-BR")} icon={TrendingUp} />
        <MetricCard label="Taxa Conv." value={`${convRate.toFixed(2)}%`} icon={BarChart3} />
        <MetricCard label="Faturamento" value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} />
        <MetricCard label="Ticket Médio" value={`R$ ${avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={Ticket} />
      </div>

      <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Tráfego & Conversões</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Views</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Vendas</span>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(1, 100%, 57%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(1, 100%, 57%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 7%)", border: "1px solid hsl(240, 4%, 16%)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="views" name="Views" stroke="hsl(1, 100%, 57%)" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
              <Area type="monotone" dataKey="sales" name="Vendas" stroke="hsl(142, 71%, 45%)" fillOpacity={1} fill="url(#colorConv)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado no período selecionado
          </div>
        )}
      </div>

      <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Volume de Vendas Diário
          </h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Vendas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Receita (R$)</span>
          </div>
        </div>
        {salesChartData.some(d => d.vendas > 0 || d.receita > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 7%)", border: "1px solid hsl(240, 4%, 16%)", borderRadius: 8, fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="vendas" name="Vendas" fill="hsl(1, 100%, 57%)" radius={[4, 4, 0, 0]} opacity={0.8} />
              <Line yAxisId="right" type="monotone" dataKey="receita" name="Receita (R$)" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma venda no período selecionado
          </div>
        )}
      </div>

      <ProductOverview accountId={activeAccountId} sinceDate={sinceDate} untilDate={untilDate} />
      <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Smart Links</h3>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => exportToCsv(linkStats.map((l: any) => ({
              nome: l.name, slug: l.slug, views: l.views, vendas: l.sales,
              receita: l.revenue.toFixed(2), taxa: l.rate.toFixed(2) + "%", ticket: l.ticket.toFixed(2),
              status: l.is_active ? "Ativo" : "Pausado",
            })), "smart-links")}
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
        {smartLinks.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum Smart Link criado ainda. Vá em <span className="text-primary">Smart Links</span> para criar um.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Slug</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Views</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Vendas</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Receita</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Taxa</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Ticket</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Criação</th>
                </tr>
              </thead>
              <tbody>
                {linkStats.map((link: any) => (
                  <tr key={link.id} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-4 font-medium text-sm">{link.name}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground font-mono">/{link.slug}</td>
                    <td className="text-right px-5 py-4 font-mono text-xs">{link.views.toLocaleString("pt-BR")}</td>
                    <td className="text-right px-5 py-4 font-mono text-xs">{link.sales.toLocaleString("pt-BR")}</td>
                    <td className="text-right px-5 py-4 font-mono text-xs">R$ {link.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="text-right px-5 py-4 font-mono text-xs text-success">{link.rate.toFixed(2)}%</td>
                    <td className="text-right px-5 py-4 font-mono text-xs">R$ {link.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="text-right px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${link.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${link.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                        {link.is_active ? "Ativo" : "Pausado"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{new Date(link.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ProductOverview({ accountId, sinceDate, untilDate }: { accountId?: string; sinceDate: string; untilDate: string }) {
  const { data: products = [] } = useQuery({
    queryKey: ["product-overview", sinceDate, untilDate, accountId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("product_name, amount, is_order_bump")
        .eq("status", "approved")
        .gte("created_at", sinceDate + "T00:00:00")
        .lte("created_at", untilDate + "T23:59:59");
      if (accountId) q = q.eq("account_id", accountId);
      const { data } = await q;
      if (!data || data.length === 0) return [];

      const map = new Map<string, { vendas: number; receita: number; isOrderBump: boolean }>();
      data.forEach((c: any) => {
        const name = c.product_name || "Produto desconhecido";
        const entry = map.get(name) || { vendas: 0, receita: 0, isOrderBump: c.is_order_bump };
        entry.vendas++;
        entry.receita += Number(c.amount);
        map.set(name, entry);
      });

      const totalRevenue = data.reduce((s: number, c: any) => s + Number(c.amount), 0);
      return Array.from(map.entries())
        .map(([name, v]) => ({
          name,
          vendas: v.vendas,
          receita: v.receita,
          ticket: v.vendas > 0 ? v.receita / v.vendas : 0,
          percentual: totalRevenue > 0 ? (v.receita / totalRevenue) * 100 : 0,
          isOrderBump: v.isOrderBump,
        }))
        .sort((a, b) => b.receita - a.receita);
    },
    staleTime: 60000,
    enabled: !!accountId,
  });

  if (products.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="text-sm font-semibold">Resumo por Produto</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Produto</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Vendas</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Receita</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Ticket</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">% Fat.</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p: any, i: number) => (
              <tr key={i} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                <td className="px-5 py-3 font-medium text-xs">{p.name}</td>
                <td className="text-right px-5 py-3 font-mono text-xs">{p.vendas}</td>
                <td className="text-right px-5 py-3 font-mono text-xs">R$ {p.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="text-right px-5 py-3 font-mono text-xs">R$ {p.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td className="text-right px-5 py-3 font-mono text-xs text-success">{p.percentual.toFixed(1)}%</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.isOrderBump ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary"}`}>
                    {p.isOrderBump ? "Order Bump" : "Principal"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
