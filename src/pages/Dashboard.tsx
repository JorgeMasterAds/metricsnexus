import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell, Legend, LabelList,
} from "recharts";
import {
  MousePointerClick, TrendingUp, DollarSign, BarChart3, Ticket, Download,
  ShoppingCart, CreditCard, Pencil, Check, Target, Globe, Megaphone,
  Monitor, FileText, Package, Eye, Percent, Layers, HelpCircle,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import GamificationBar from "@/components/GamificationBar";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCsv } from "@/lib/csv";
import ExportMenu from "@/components/ExportMenu";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { useInvestment } from "@/hooks/useInvestment";
import { SortableSection } from "@/components/SortableSection";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const SECTION_IDS = ["metrics", "traffic-chart", "smartlinks", "products", "order-bumps", "mini-charts"];

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

// Pure red palette only
const RED_PALETTE = [
  "hsl(0, 90%, 60%)",
  "hsl(0, 80%, 48%)",
  "hsl(0, 70%, 38%)",
  "hsl(0, 60%, 28%)",
  "hsl(0, 95%, 70%)",
  "hsl(355, 85%, 55%)",
  "hsl(5, 75%, 45%)",
  "hsl(350, 70%, 40%)",
];

const CHART_PALETTES = [
  ["hsl(0, 90%, 60%)", "hsl(0, 80%, 48%)", "hsl(0, 70%, 38%)", "hsl(0, 60%, 28%)", "hsl(0, 95%, 70%)", "hsl(355, 85%, 55%)", "hsl(5, 75%, 45%)", "hsl(350, 70%, 40%)"],
  ["hsl(355, 85%, 55%)", "hsl(0, 90%, 60%)", "hsl(5, 75%, 45%)", "hsl(0, 70%, 38%)", "hsl(350, 70%, 40%)", "hsl(0, 80%, 48%)", "hsl(0, 60%, 28%)", "hsl(0, 95%, 70%)"],
  ["hsl(0, 70%, 38%)", "hsl(0, 95%, 70%)", "hsl(0, 80%, 48%)", "hsl(355, 85%, 55%)", "hsl(0, 60%, 28%)", "hsl(0, 90%, 60%)", "hsl(350, 70%, 40%)", "hsl(5, 75%, 45%)"],
  ["hsl(5, 75%, 45%)", "hsl(350, 70%, 40%)", "hsl(0, 90%, 60%)", "hsl(0, 60%, 28%)", "hsl(0, 95%, 70%)", "hsl(0, 70%, 38%)", "hsl(355, 85%, 55%)", "hsl(0, 80%, 48%)"],
  ["hsl(0, 60%, 28%)", "hsl(0, 95%, 70%)", "hsl(355, 85%, 55%)", "hsl(0, 80%, 48%)", "hsl(5, 75%, 45%)", "hsl(0, 90%, 60%)", "hsl(0, 70%, 38%)", "hsl(350, 70%, 40%)"],
  ["hsl(350, 70%, 40%)", "hsl(0, 80%, 48%)", "hsl(0, 95%, 70%)", "hsl(5, 75%, 45%)", "hsl(0, 70%, 38%)", "hsl(0, 60%, 28%)", "hsl(0, 90%, 60%)", "hsl(355, 85%, 55%)"],
];

const CHART_TOOLTIPS: Record<string, string> = {
  "traffic-chart": "Exibe a evolução diária de visualizações (views) e vendas no período selecionado.",
  "products": "Resumo de vendas, receita, ticket médio e participação percentual por produto.",
  "order-bumps": "Comparação proporcional entre vendas de produto principal e order bumps.",
  "smartlinks": "Desempenho de cada Smart Link: views, vendas, receita e taxa de conversão.",
  "sales-chart": "Volume de vendas e receita diários no período selecionado.",
  "source": "Receita agrupada por origem de tráfego (utm_source).",
  "campaign": "Receita agrupada por campanha de marketing (utm_campaign).",
  "medium": "Receita agrupada por meio de tráfego (utm_medium).",
  "content": "Receita agrupada por conteúdo de anúncio (utm_content).",
  "product": "Receita agrupada por produto vendido.",
  "payment": "Receita agrupada por meio de pagamento utilizado.",
};

const METRIC_TOOLTIPS: Record<string, string> = {
  "total_views": "Número total de cliques registrados nos Smart Links no período selecionado.",
  "sales": "Quantidade total de vendas aprovadas no período selecionado.",
  "conv_rate": "Taxa de Conversão = (Vendas / Views) × 100. Percentual de visitantes que compraram.",
  "revenue": "Soma dos valores de todas as vendas aprovadas no período.",
  "avg_ticket": "Ticket Médio = Receita Total / Número de Vendas. Valor médio por transação.",
  "smart_links": "Quantidade de Smart Links criados neste projeto.",
};

function ChartHeader({ title, icon, tooltipKey }: { title: string; icon: React.ReactNode; tooltipKey: string }) {
  return (
    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
      {icon}
      {title}
      <UITooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs">
          {CHART_TOOLTIPS[tooltipKey] || "Dados do período selecionado."}
        </TooltipContent>
      </UITooltip>
    </h3>
  );
}

function MetricWithTooltip({ label, value, icon: Icon, tooltipKey }: { label: string; value: string; icon: any; tooltipKey: string }) {
  return (
    <div className="relative">
      <MetricCard label={label} value={value} icon={Icon} />
      <UITooltip>
        <TooltipTrigger asChild>
          <button className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {METRIC_TOOLTIPS[tooltipKey] || "Métrica do período selecionado."}
        </TooltipContent>
      </UITooltip>
    </div>
  );
}

// Custom tooltip component for recharts with white text
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
      {filtered.map((entry: any, i: number) => (
        <p key={i} style={{ color: "#ffffff", fontSize: 12 }}>
          <span style={{ color: entry.color || "#f5f5f5", marginRight: 6 }}>●</span>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString("pt-BR") : entry.value}
        </p>
      ))}
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

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const { order, editMode, toggleEdit, handleReorder, resetLayout } = useDashboardLayout("dashboard", SECTION_IDS);
  const sinceISO = dateRange.from.toISOString();
  const untilISO = dateRange.to.toISOString();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { toast } = useToast();
  const qc = useQueryClient();

  const periodKey = `${sinceISO}__${untilISO}`;
  const { investmentInput, setInvestmentInput, investmentValue } = useInvestment(periodKey);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const { data: revenueGoal } = useQuery({
    queryKey: ["revenue-goal", activeAccountId, activeProjectId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("revenue_goals")
        .select("goal")
        .eq("account_id", activeAccountId)
        .eq("project_id", activeProjectId)
        .maybeSingle();
      return data?.goal ?? 1000000;
    },
    staleTime: 60000,
    enabled: !!activeAccountId && !!activeProjectId,
  });

  const saveGoal = async () => {
    const val = parseFloat(goalInput.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(val) || val <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    const { error } = await (supabase as any)
      .from("revenue_goals")
      .upsert({ account_id: activeAccountId, project_id: activeProjectId, goal: val, updated_at: new Date().toISOString() }, { onConflict: "account_id,project_id" });
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Meta salva!" });
    qc.invalidateQueries({ queryKey: ["revenue-goal"] });
    setGoalModalOpen(false);
  };

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
    const totalFees = conversions.reduce((s: number, c: any) => s + Number(c.fees || 0), 0);
    const totalNet = conversions.reduce((s: number, c: any) => s + Number(c.net_amount || c.amount || 0), 0);
    const cr = tv > 0 ? (ts / tv) * 100 : 0;
    const at = ts > 0 ? tr / ts : 0;

    const days = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000)) + 1;
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

    const chartData = Array.from(dayMap.entries()).map(([date, v]) => ({ date, views: v.views, sales: v.sales, revenue: v.revenue }));
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

    // Fees by platform
    const feePlatformMap = new Map<string, { fees: number; vendas: number; receita: number }>();
    conversions.forEach((c: any) => {
      const plat = c.platform || c.payment_method || "(não informado)";
      const e = feePlatformMap.get(plat) || { fees: 0, vendas: 0, receita: 0 };
      e.fees += Number(c.fees || 0);
      e.vendas++;
      e.receita += Number(c.amount);
      feePlatformMap.set(plat, e);
    });
    const feesData = Array.from(feePlatformMap.entries())
      .map(([name, v]) => ({ name, fees: v.fees, vendas: v.vendas, receita: v.receita, percent: tr > 0 ? (v.fees / tr) * 100 : 0 }))
      .filter(f => f.fees > 0)
      .sort((a, b) => b.fees - a.fees);

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

    const mainProducts = conversions.filter((c: any) => !c.is_order_bump);
    const orderBumps = conversions.filter((c: any) => c.is_order_bump);
    const mainRevenue = mainProducts.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const obRevenue = orderBumps.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const totalPieValue = mainProducts.length + orderBumps.length;
    const pieData = [
      { name: "Produto Principal", value: mainProducts.length, receita: mainRevenue, percent: totalPieValue > 0 ? (mainProducts.length / totalPieValue * 100) : 0 },
      { name: "Order Bump", value: orderBumps.length, receita: obRevenue, percent: totalPieValue > 0 ? (orderBumps.length / totalPieValue * 100) : 0 },
    ];

    const linkStats = smartLinks.map((link: any) => {
      const lv = clicks.filter((c: any) => c.smartlink_id === link.id).length;
      const lConvs = conversions.filter((c: any) => c.smartlink_id === link.id);
      const lc = lConvs.length;
      const lr = lConvs.reduce((s: number, c: any) => s + Number(c.amount), 0);
      return { ...link, views: lv, sales: lc, revenue: lr, rate: lv > 0 ? (lc / lv) * 100 : 0, ticket: lc > 0 ? lr / lc : 0 };
    });

    return {
      totalViews: tv, totalSales: ts, totalRevenue: tr, totalFees, totalNet, convRate: cr, avgTicket: at,
      chartData, salesChartData, paymentData, productData, feesData,
      sourceData: groupBy("utm_source"),
      campaignData: groupBy("utm_campaign"),
      mediumData: groupBy("utm_medium"),
      contentData: groupBy("utm_content"),
      productChartData: productData.map(p => ({ name: p.name, value: p.receita })).slice(0, 8),
      linkStats, pieData,
      mainProductsCount: mainProducts.length, orderBumpsCount: orderBumps.length,
      mainRevenue, obRevenue,
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

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const PIE_COLORS = ["hsl(0, 90%, 60%)", "hsl(0, 55%, 28%)"];

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = computed.pieData[index]?.percent ?? 0;
    if (pct < 5) return null;
    return (
      <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
        {pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
      </text>
    );
  };

  const buildFullExportData = () => {
    const rows: Record<string, any>[] = [];

    // Section: Daily traffic data
    computed.chartData.forEach((d: any) => {
      rows.push({ seção: "Tráfego Diário", data: d.date, views: d.views, vendas: d.sales, receita: d.revenue.toFixed(2) });
    });

    // Section: Products
    computed.productData.forEach((p: any) => {
      rows.push({ seção: "Produtos", produto: p.name, vendas: p.vendas, receita: p.receita.toFixed(2), ticket_medio: p.ticket.toFixed(2), percentual: p.percentual.toFixed(1) + "%", tipo: p.isOrderBump ? "Order Bump" : "Principal" });
    });

    // Section: Order Bumps summary
    rows.push({ seção: "Order Bumps", categoria: "Produto Principal", vendas: computed.mainProductsCount, receita: computed.mainRevenue.toFixed(2) });
    rows.push({ seção: "Order Bumps", categoria: "Order Bump", vendas: computed.orderBumpsCount, receita: computed.obRevenue.toFixed(2) });

    // Section: SmartLinks
    computed.linkStats.forEach((l: any) => {
      rows.push({ seção: "Smart Links", nome: l.name, slug: l.slug, views: l.views, vendas: l.sales, receita: l.revenue.toFixed(2), taxa: l.rate.toFixed(2) + "%", status: l.is_active ? "Ativo" : "Pausado" });
    });

    // Section: UTM Sources
    computed.sourceData.forEach((s: any) => { rows.push({ seção: "Receita por Origem", nome: s.name, receita: s.value.toFixed(2) }); });
    computed.campaignData.forEach((s: any) => { rows.push({ seção: "Receita por Campanha", nome: s.name, receita: s.value.toFixed(2) }); });
    computed.mediumData.forEach((s: any) => { rows.push({ seção: "Receita por Medium", nome: s.name, receita: s.value.toFixed(2) }); });
    computed.contentData.forEach((s: any) => { rows.push({ seção: "Receita por Content", nome: s.name, receita: s.value.toFixed(2) }); });

    // Section: Payment methods
    computed.paymentData.forEach((p: any) => { rows.push({ seção: "Meios de Pagamento", nome: p.name, vendas: p.vendas, receita: p.receita.toFixed(2) }); });

    return rows;
  };

  const renderSection = (id: string) => {
    switch (id) {
      case "gamification":
        return null;

      case "metrics": {
        const roas = investmentValue > 0 ? computed.totalRevenue / investmentValue : 0;
        const roasColor = roas >= 3 ? "hsl(142, 71%, 45%)" : roas >= 1 ? "hsl(48, 96%, 53%)" : "hsl(0, 84%, 60%)";
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <MetricWithTooltip label="Total Views" value={computed.totalViews.toLocaleString("pt-BR")} icon={Eye} tooltipKey="total_views" />
            <MetricWithTooltip label="Vendas" value={computed.totalSales.toLocaleString("pt-BR")} icon={ShoppingCart} tooltipKey="sales" />
            <MetricWithTooltip label="Taxa Conv." value={`${computed.convRate.toFixed(2)}%`} icon={Percent} tooltipKey="conv_rate" />
            {/* Investment card - matching MetricCard style exactly */}
            <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Investimento</span>
                <div className="h-7 w-7 rounded-lg gradient-bg-soft flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <input
                value={investmentInput}
                onChange={(e) => setInvestmentInput(e.target.value)}
                placeholder="R$ 0,00"
                className="text-lg font-bold bg-transparent border-none outline-none w-full p-0 m-0 placeholder:text-muted-foreground/40"
              />
            </div>
            <MetricWithTooltip label="Faturamento" value={fmt(computed.totalRevenue)} icon={DollarSign} tooltipKey="revenue" />
            {/* ROAS card - matching MetricCard style */}
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
            <MetricWithTooltip label="Ticket Médio" value={fmt(computed.avgTicket)} icon={Ticket} tooltipKey="avg_ticket" />
          </div>
        );
      }

      case "traffic-chart":
        return (
          <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
            <ChartHeader title="Tráfego & Conversões" icon={<TrendingUp className="h-4 w-4 text-primary" />} tooltipKey="traffic-chart" />
            {computed.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={computed.chartData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(0, 90%, 60%)" stopOpacity={0.2} /><stop offset="95%" stopColor="hsl(0, 90%, 60%)" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(0, 60%, 30%)" stopOpacity={0.2} /><stop offset="95%" stopColor="hsl(0, 60%, 30%)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                  <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Bar yAxisId="right" dataKey="revenue" name="Faturamento (R$)" fill="hsl(30, 80%, 55%)" radius={[3, 3, 0, 0]} opacity={0.45} />
                  <Area yAxisId="left" type="monotone" dataKey="views" name="Views" stroke="hsl(0, 85%, 55%)" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                  <Area yAxisId="left" type="monotone" dataKey="sales" name="Vendas" stroke="hsl(150, 60%, 45%)" fillOpacity={1} fill="url(#colorConv)" strokeWidth={2} />
                  {/* Labels rendered last so they appear on top */}
                  <Line yAxisId="right" dataKey="revenue" stroke="none" dot={false} activeDot={false}>
                    <LabelList dataKey="revenue" position="top" style={{ fontSize: 9, fill: "hsl(30, 80%, 65%)" }} formatter={(v: number) => v > 0 ? `R$${(v/100 >= 10 ? (v/1000).toFixed(1)+'k' : v.toLocaleString("pt-BR", {maximumFractionDigits:0}))}` : ""} />
                  </Line>
                  <Line yAxisId="left" dataKey="views" stroke="none" dot={false} activeDot={false}>
                    <LabelList dataKey="views" position="top" style={{ fontSize: 9, fill: "hsl(0, 85%, 65%)" }} formatter={(v: number) => v > 0 ? v : ""} />
                  </Line>
                  <Line yAxisId="left" dataKey="sales" stroke="none" dot={false} activeDot={false}>
                    <LabelList dataKey="sales" position="top" style={{ fontSize: 9, fill: "hsl(150, 60%, 55%)" }} formatter={(v: number) => v > 0 ? v : ""} />
                  </Line>
                </ComposedChart>
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
              <UITooltip>
                <TooltipTrigger asChild><HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs">{CHART_TOOLTIPS["products"]}</TooltipContent>
              </UITooltip>
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
        ) : null;

      case "order-bumps":
        return (
          <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
            <ChartHeader title="Produtos vs Order Bumps" icon={<Layers className="h-4 w-4 text-primary" />} tooltipKey="order-bumps" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {computed.pieData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={computed.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        label={renderPieLabel}
                        labelLine={false}
                      >
                        {computed.pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} stroke="hsl(240, 5%, 12%)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
                        formatter={(value) => <span style={{ color: "hsl(0, 0%, 80%)" }}>{value}</span>}
                      />
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
              </div>
            </div>
          </div>
        );

      case "smartlinks":
        return (
          <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Smart Links</h3>
              <UITooltip>
                <TooltipTrigger asChild><HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-xs">{CHART_TOOLTIPS["smartlinks"]}</TooltipContent>
              </UITooltip>
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
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  </tr></thead>
                  <tbody>
                    {computed.linkStats.map((link: any) => {
                      const variants = link.smartlink_variants || [];
                      return (
                        <React.Fragment key={link.id}>
                          <tr className="border-b border-border/20 hover:bg-accent/20 transition-colors">
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
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "mini-charts":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {computed.sourceData.length > 0 && <MiniBarChart title="Receita por Origem" icon={<Globe className="h-4 w-4 text-primary" />} tooltipKey="source" data={computed.sourceData} paletteIdx={0} fmt={fmt} />}
            {computed.campaignData.length > 0 && <MiniBarChart title="Receita por Campanha" icon={<Megaphone className="h-4 w-4 text-primary" />} tooltipKey="campaign" data={computed.campaignData} paletteIdx={1} fmt={fmt} />}
            {computed.mediumData.length > 0 && <MiniBarChart title="Receita por Medium" icon={<Monitor className="h-4 w-4 text-primary" />} tooltipKey="medium" data={computed.mediumData} paletteIdx={2} fmt={fmt} />}
            {computed.contentData.length > 0 && <MiniBarChart title="Receita por Content" icon={<FileText className="h-4 w-4 text-primary" />} tooltipKey="content" data={computed.contentData} paletteIdx={3} fmt={fmt} />}
            {computed.productChartData.length > 0 && <MiniBarChart title="Receita por Produto" icon={<Package className="h-4 w-4 text-primary" />} tooltipKey="product" data={computed.productChartData} paletteIdx={4} fmt={fmt} />}
            {computed.paymentData.length > 0 && <MiniBarChart title="Meios de Pagamento" icon={<CreditCard className="h-4 w-4 text-primary" />} tooltipKey="payment" data={computed.paymentData.map(p => ({ name: p.name, value: p.receita }))} paletteIdx={5} fmt={fmt} />}
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
          {editMode && (
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={resetLayout}>
              Redefinir
            </Button>
          )}
          <Button variant={editMode ? "default" : "outline"} size="sm" className="text-xs gap-1.5" onClick={toggleEdit}>
            {editMode ? <><Check className="h-3.5 w-3.5" /> Salvar Layout</> : <><Pencil className="h-3.5 w-3.5" /> Editar Layout</>}
          </Button>
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      }
    >
      {/* Fixed: Meta de Faturamento + Export always on top */}
      <div className="mb-6">
        <GamificationBar
          since={sinceISO}
          until={untilISO}
          goal={revenueGoal ?? 1000000}
          onEditGoal={() => { setGoalInput(String(revenueGoal ?? 1000000)); setGoalModalOpen(true); }}
        />
        <div className="flex justify-end mt-1">
          <ExportMenu
            data={buildFullExportData()}
            filename="dashboard-nexus"
            title="Dashboard Completo — Nexus Metrics"
            kpis={[
              { label: "Views", value: computed.totalViews.toLocaleString("pt-BR") },
              { label: "Vendas", value: computed.totalSales.toLocaleString("pt-BR") },
              { label: "Faturamento", value: fmt(computed.totalRevenue) },
              { label: "Ticket Médio", value: fmt(computed.avgTicket) },
              { label: "Taxa Conv.", value: computed.convRate.toFixed(2) + "%" },
              { label: "Smart Links", value: computed.linkStats.length.toString() },
            ]}
            size="default"
          />
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map(id => (
            <SortableSection key={id} id={id} editMode={editMode}>
              {renderSection(id)}
            </SortableSection>
          ))}
        </SortableContext>
      </DndContext>

      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Meta de Faturamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-xs text-muted-foreground">Defina a meta de faturamento para este projeto no período selecionado.</p>
            <Input
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Ex: 1000000"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGoalModalOpen(false)}>Cancelar</Button>
            <Button size="sm" className="gradient-bg border-0 text-primary-foreground" onClick={saveGoal}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">{text}</div>;
}

function MiniBarChart({ title, icon, tooltipKey, data, paletteIdx, fmt }: { title: string; icon?: React.ReactNode; tooltipKey: string; data: { name: string; value: number }[]; paletteIdx: number; fmt: (v: number) => string }) {
  const palette = CHART_PALETTES[paletteIdx % CHART_PALETTES.length];
  const miniTooltipStyle = {
    backgroundColor: "hsl(240, 6%, 10%)",
    border: "1px solid hsl(240, 4%, 22%)",
    borderRadius: 8,
    fontSize: 12,
    color: "#f5f5f5",
    padding: "10px 14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  };

  function MiniCustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <div style={miniTooltipStyle}>
        <p style={{ color: "#e0e0e0", marginBottom: 4, fontWeight: 500 }}>{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: "#ffffff", fontSize: 12 }}>
            <span style={{ color: entry.color || "#f5f5f5", marginRight: 6 }}>●</span>
            {entry.name}: {fmt(entry.value)}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border/50 p-4 card-shadow">
      <h3 className="text-xs font-semibold mb-3 flex items-center gap-2">
        {icon}{title}
        <UITooltip>
          <TooltipTrigger asChild><HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs">{CHART_TOOLTIPS[tooltipKey] || "Dados do período."}</TooltipContent>
        </UITooltip>
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(240, 5%, 65%)" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={65} tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + "…" : v} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
          <Tooltip content={<MiniCustomTooltip />} />
          <Bar dataKey="value" name="Receita" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
