import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  MousePointerClick, TrendingUp, DollarSign, BarChart3, Ticket, Download,
  ShoppingCart, CreditCard, Pencil, Check, Target, Globe, Megaphone,
  Monitor, FileText, Package, Eye, Percent, Layers,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import GamificationBar from "@/components/GamificationBar";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csv";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { SortableSection } from "@/components/SortableSection";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

const SECTION_IDS = ["gamification", "metrics", "traffic-chart", "products", "order-bumps", "smartlinks", "sales-chart", "mini-charts"];
const CHART_STYLE = { backgroundColor: "hsl(240, 5%, 7%)", border: "1px solid hsl(240, 4%, 16%)", borderRadius: 8, fontSize: 12 };
const TICK_STYLE = { fontSize: 11, fill: "hsl(240, 5%, 55%)" };

// Red tone palette for charts
const RED_TONES = [
  "hsl(1, 100%, 57%)",   // Primary red
  "hsl(1, 90%, 45%)",    // Dark red
  "hsl(10, 85%, 52%)",   // Red-orange
  "hsl(350, 80%, 50%)",  // Crimson
  "hsl(1, 70%, 38%)",    // Deep red
  "hsl(15, 75%, 55%)",   // Coral red
  "hsl(340, 65%, 45%)",  // Berry red
  "hsl(1, 60%, 30%)",    // Maroon
];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const { order, editMode, toggleEdit, handleReorder } = useDashboardLayout("dashboard", SECTION_IDS);
  const sinceISO = dateRange.from.toISOString();
  const untilISO = dateRange.to.toISOString();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: conversions = [] } = useQuery({
    queryKey: ["dash-conversions", sinceISO, untilISO, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("id, amount, fees, net_amount, status, product_name, is_order_bump, payment_method, utm_source, utm_campaign, utm_medium, utm_content, created_at, click_id, smartlink_id, variant_id, paid_at")
        .eq("status", "approved")
        .gte("created_at", sinceISO)
        .lte("created_at", untilISO);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60000,
    enabled: !!activeAccountId,
  });

  const { data: clicks = [] } = useQuery({
    queryKey: ["dash-clicks", sinceISO, untilISO, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("clicks")
        .select("id, created_at, smartlink_id, variant_id")
        .gte("created_at", sinceISO)
        .lte("created_at", untilISO);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { data } = await q;
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

  const computed = useMemo(() => {
    const tv = clicks.length;
    const ts = conversions.length;
    const tr = conversions.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const cr = tv > 0 ? (ts / tv) * 100 : 0;
    const at = ts > 0 ? tr / ts : 0;

    const days = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000));
    const dayMap = new Map<string, { views: number; sales: number; revenue: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(dateRange.from.getTime() + i * 86400000);
      const ds = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      dayMap.set(ds, { views: 0, sales: 0, revenue: 0 });
    }
    clicks.forEach((c: any) => {
      const ds = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entry = dayMap.get(ds); if (entry) entry.views++;
    });
    conversions.forEach((c: any) => {
      const ds = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entry = dayMap.get(ds); if (entry) { entry.sales++; entry.revenue += Number(c.amount); }
    });

    const chartData = Array.from(dayMap.entries()).map(([date, v]) => ({ date, views: v.views, sales: v.sales }));
    const salesChartData = Array.from(dayMap.entries()).map(([date, v]) => ({ date, vendas: v.sales, receita: v.revenue }));

    const groupBy = (key: string) => {
      const map = new Map<string, number>();
      conversions.forEach((c: any) => {
        const k = c[key] || "(não informado)";
        map.set(k, (map.get(k) || 0) + Number(c.amount));
      });
      return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    };

    const paymentMap = new Map<string, { vendas: number; receita: number }>();
    conversions.forEach((c: any) => {
      const pm = c.payment_method || "(não informado)";
      const e = paymentMap.get(pm) || { vendas: 0, receita: 0 };
      e.vendas++; e.receita += Number(c.amount);
      paymentMap.set(pm, e);
    });
    const paymentData = Array.from(paymentMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.receita - a.receita);

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

    // Order bumps stats
    const mainProducts = conversions.filter((c: any) => !c.is_order_bump);
    const orderBumps = conversions.filter((c: any) => c.is_order_bump);
    const obRate = mainProducts.length > 0 ? (orderBumps.length / mainProducts.length) * 100 : 0;
    const obRevenue = orderBumps.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const obData = [
      { name: "Produtos Principais", value: mainProducts.length, revenue: mainProducts.reduce((s: number, c: any) => s + Number(c.amount), 0) },
      { name: "Order Bumps", value: orderBumps.length, revenue: obRevenue },
    ];

    const linkStats = smartLinks.map((link: any) => {
      const lv = clicks.filter((c: any) => c.smartlink_id === link.id).length;
      const lConvs = conversions.filter((c: any) => c.smartlink_id === link.id);
      const lc = lConvs.length;
      const lr = lConvs.reduce((s: number, c: any) => s + Number(c.amount), 0);
      return { ...link, views: lv, sales: lc, revenue: lr, rate: lv > 0 ? (lc / lv) * 100 : 0, ticket: lc > 0 ? lr / lc : 0 };
    });

    return {
      totalViews: tv, totalSales: ts, totalRevenue: tr, convRate: cr, avgTicket: at,
      chartData, salesChartData, paymentData, productData,
      sourceData: groupBy("utm_source"),
      campaignData: groupBy("utm_campaign"),
      mediumData: groupBy("utm_medium"),
      contentData: groupBy("utm_content"),
      productChartData: productData.map(p => ({ name: p.name, value: p.receita })).slice(0, 8),
      linkStats,
      obData, obRate, obRevenue,
      mainProductsCount: mainProducts.length,
      orderBumpsCount: orderBumps.length,
    };
  }, [clicks, conversions, smartLinks, dateRange]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = order.indexOf(active.id as string);
      const newIdx = order.indexOf(over.id as string);
      handleReorder(arrayMove(order, oldIdx, newIdx));
    }
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const renderSection = (id: string) => {
    switch (id) {
      case "gamification":
        return <GamificationBar since={sinceISO} until={untilISO} />;

      case "metrics":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <MetricCard label="Total Views" value={computed.totalViews.toLocaleString("pt-BR")} icon={Eye} />
            <MetricCard label="Vendas" value={computed.totalSales.toLocaleString("pt-BR")} icon={ShoppingCart} />
            <MetricCard label="Taxa Conv." value={`${computed.convRate.toFixed(2)}%`} icon={Percent} />
            <MetricCard label="Faturamento" value={fmt(computed.totalRevenue)} icon={DollarSign} />
            <MetricCard label="Ticket Médio" value={fmt(computed.avgTicket)} icon={Ticket} />
            <MetricCard label="Smart Links" value={computed.linkStats.length.toLocaleString("pt-BR")} icon={Target} />
          </div>
        );

      case "traffic-chart":
        return (
          <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Tráfego & Conversões
            </h3>
            {computed.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={computed.chartData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(1, 90%, 45%)" stopOpacity={0.2} /><stop offset="95%" stopColor="hsl(1, 90%, 45%)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                  <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Area type="monotone" dataKey="views" name="Views" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                  <Area type="monotone" dataKey="sales" name="Vendas" stroke="hsl(1, 90%, 45%)" fillOpacity={1} fill="url(#colorConv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyState text="Nenhum dado no período" />}
          </div>
        );

      case "products":
        return computed.productData.length > 0 ? (
          <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden mb-6">
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
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">% Fat.</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                </tr></thead>
                <tbody>
                  {computed.productData.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                      <td className="px-5 py-3 font-medium text-xs">{p.name}</td>
                      <td className="text-right px-5 py-3 font-mono text-xs">{p.vendas}</td>
                      <td className="text-right px-5 py-3 font-mono text-xs">{fmt(p.receita)}</td>
                      <td className="text-right px-5 py-3 font-mono text-xs">{fmt(p.ticket)}</td>
                      <td className="text-right px-5 py-3 font-mono text-xs" style={{ color: "hsl(1, 100%, 57%)" }}>{p.percentual.toFixed(1)}%</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.isOrderBump ? "bg-[hsl(10,85%,52%)]/20 text-[hsl(10,85%,52%)]" : "bg-primary/20 text-primary"}`}>
                          {p.isOrderBump ? "Order Bump" : "Principal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null;

      case "order-bumps":
        return (
          <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Produtos vs Order Bumps
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {computed.obData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={computed.obData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        <Cell fill={RED_TONES[0]} />
                        <Cell fill={RED_TONES[1]} />
                      </Pie>
                      <Tooltip contentStyle={CHART_STYLE} formatter={(v: number, name: string) => [v, name]} />
                      <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState text="Sem dados de Order Bump" />}
              </div>
              <div className="flex flex-col justify-center space-y-3">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <p className="text-[11px] text-muted-foreground">Vendas Principais</p>
                  <p className="text-lg font-bold">{computed.mainProductsCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <p className="text-[11px] text-muted-foreground">Order Bumps</p>
                  <p className="text-lg font-bold">{computed.orderBumpsCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <p className="text-[11px] text-muted-foreground">Taxa de Conversão OB</p>
                  <p className="text-lg font-bold" style={{ color: "hsl(1, 100%, 57%)" }}>{computed.obRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <p className="text-[11px] text-muted-foreground">Receita Order Bumps</p>
                  <p className="text-lg font-bold">{fmt(computed.obRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "smartlinks":
        return (
          <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Smart Links
              </h3>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => exportToCsv(computed.linkStats.map((l: any) => ({ nome: l.name, slug: l.slug, views: l.views, vendas: l.sales, receita: l.revenue.toFixed(2), taxa: l.rate.toFixed(2) + "%", ticket: l.ticket.toFixed(2), status: l.is_active ? "Ativo" : "Pausado" })), "smart-links")}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
            {smartLinks.length === 0 ? (
              <EmptyState text="Nenhum Smart Link criado." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/30">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Slug</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Views</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Vendas</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Receita</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Taxa</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Ticket</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  </tr></thead>
                  <tbody>
                    {computed.linkStats.map((link: any) => (
                      <tr key={link.id} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                        <td className="px-5 py-3 font-medium text-xs">{link.name}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground font-mono">/{link.slug}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{link.views.toLocaleString("pt-BR")}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{link.sales.toLocaleString("pt-BR")}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{fmt(link.revenue)}</td>
                        <td className="text-right px-5 py-3 font-mono text-xs" style={{ color: "hsl(1, 100%, 57%)" }}>{link.rate.toFixed(2)}%</td>
                        <td className="text-right px-5 py-3 font-mono text-xs">{fmt(link.ticket)}</td>
                        <td className="text-right px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${link.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${link.is_active ? "bg-primary" : "bg-muted-foreground"}`} />
                            {link.is_active ? "Ativo" : "Pausado"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "sales-chart":
        return (
          <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Volume de Vendas Diário
            </h3>
            {computed.salesChartData.some(d => d.vendas > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={computed.salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                  <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Bar yAxisId="left" dataKey="vendas" name="Vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Line yAxisId="right" type="monotone" dataKey="receita" name="Receita (R$)" stroke="hsl(1, 90%, 45%)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyState text="Nenhuma venda no período" />}
          </div>
        );

      case "mini-charts":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {computed.sourceData.length > 0 && <MiniBarChart title="Receita por Origem" icon={<Globe className="h-4 w-4 text-primary" />} data={computed.sourceData} colorIdx={0} fmt={fmt} />}
            {computed.campaignData.length > 0 && <MiniBarChart title="Receita por Campanha" icon={<Megaphone className="h-4 w-4 text-primary" />} data={computed.campaignData} colorIdx={1} fmt={fmt} />}
            {computed.mediumData.length > 0 && <MiniBarChart title="Receita por Medium" icon={<Monitor className="h-4 w-4 text-primary" />} data={computed.mediumData} colorIdx={2} fmt={fmt} />}
            {computed.contentData.length > 0 && <MiniBarChart title="Receita por Content" icon={<FileText className="h-4 w-4 text-primary" />} data={computed.contentData} colorIdx={3} fmt={fmt} />}
            {computed.productChartData.length > 0 && <MiniBarChart title="Receita por Produto" icon={<Package className="h-4 w-4 text-primary" />} data={computed.productChartData} colorIdx={4} fmt={fmt} />}
            {computed.paymentData.length > 0 && <MiniBarChart title="Meios de Pagamento" icon={<CreditCard className="h-4 w-4 text-primary" />} data={computed.paymentData.map(p => ({ name: p.name, value: p.receita }))} colorIdx={5} fmt={fmt} />}
          </div>
        );

      default: return null;
    }
  };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Visão geral dos seus experimentos"
      actions={
        <div className="flex items-center gap-2">
          <ProductTour {...TOURS.dashboard} />
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

function EmptyState({ text }: { text: string }) {
  return <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">{text}</div>;
}

function MiniBarChart({ title, icon, data, colorIdx, fmt }: { title: string; icon?: React.ReactNode; data: { name: string; value: number }[]; colorIdx: number; fmt: (v: number) => string }) {
  const color = RED_TONES[colorIdx % RED_TONES.length];
  return (
    <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
      <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">{icon}{title}</h3>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 7%)", border: "1px solid hsl(240, 4%, 16%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmt(v)} />
          <Bar dataKey="value" name="Receita" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
