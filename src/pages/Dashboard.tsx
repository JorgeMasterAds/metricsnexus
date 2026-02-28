import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportTemplates from "@/components/reports/ReportTemplates";
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
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCsv } from "@/lib/csv";
import ExportMenu from "@/components/ExportMenu";
import ShareReportButton from "@/components/ShareReportButton";
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
import { cn } from "@/lib/utils";

const SECTION_IDS = ["metrics", "traffic-chart", "smartlinks", "products", "order-bumps", "mini-charts"];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--foreground))",
  padding: "10px 14px",
  boxShadow: "var(--shadow-card)",
};
const TICK_STYLE = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

const CHART_PALETTES = [
  ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--primary))"],
  ["hsl(var(--chart-2))", "hsl(var(--chart-1))", "hsl(var(--chart-4))", "hsl(var(--chart-3))", "hsl(var(--chart-5))", "hsl(var(--primary))"],
  ["hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-5))", "hsl(var(--primary))"],
  ["hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-2))", "hsl(var(--chart-1))", "hsl(var(--chart-3))", "hsl(var(--primary))"],
  ["hsl(var(--chart-5))", "hsl(var(--chart-3))", "hsl(var(--chart-1))", "hsl(var(--chart-4))", "hsl(var(--chart-2))", "hsl(var(--primary))"],
  ["hsl(var(--primary))", "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
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

function MetricWithTooltip({
  label,
  value,
  icon: Icon,
  tooltipKey,
  change,
  changeType,
}: {
  label: string;
  value: string;
  icon: any;
  tooltipKey: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="relative">
      <MetricCard label={label} value={value} icon={Icon} change={change} changeType={changeType} />
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

// Helper functions
const pctChange = (curr: number, prev: number) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
};

const fmtChange = (val: number, isAbsolute = false) => {
  const sign = val > 0 ? "+" : "";
  return isAbsolute
    ? `${sign}${val.toFixed(2).replace(".", ",")}pp`
    : `${sign}${val.toFixed(1).replace(".", ",")}%`;
};

const changeType = (val: number): "positive" | "negative" | "neutral" =>
  val > 0 ? "positive" : val < 0 ? "negative" : "neutral";

function ComparisonBadge({ value, isAbsolute = false }: { value: number; isAbsolute?: boolean }) {
  const type = changeType(value);
  return (
    <span className={cn(
      "text-[10px] font-normal",
      type === "positive" && "text-success",
      type === "negative" && "text-destructive",
      type === "neutral" && "text-muted-foreground",
    )}>
      {fmtChange(value, isAbsolute)}
    </span>
  );
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [debouncedRange, setDebouncedRange] = useState<DateRange>(dateRange);
  const [periodLabel, setPeriodLabel] = useState("7 dias");
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const { order, editMode, toggleEdit, handleReorder, resetLayout } = useDashboardLayout("dashboard", SECTION_IDS);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { toast } = useToast();
  const qc = useQueryClient();

  // Debounce date range changes (300ms)
  const handleDateChange = useCallback((range: DateRange) => {
    setDateRange(range);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedRange(range), 300);
  }, []);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const sinceISO = debouncedRange.from.toISOString();
  const untilISO = debouncedRange.to.toISOString();
  const sinceDate = debouncedRange.from.toISOString().slice(0, 10);
  const untilDate = debouncedRange.to.toISOString().slice(0, 10);
  
  // Calculate period days correctly (inclusive of both endpoints)
  const periodMs = debouncedRange.to.getTime() - debouncedRange.from.getTime();
  const periodDays = Math.max(1, Math.round(periodMs / 86400000));
  const prevUntil = new Date(debouncedRange.from.getTime() - 1);
  const prevSince = new Date(prevUntil.getTime() - periodMs);
  const prevSinceISO = prevSince.toISOString();
  const prevUntilISO = prevUntil.toISOString();
  const previousPeriodLabel = `${periodDays} dia${periodDays > 1 ? "s" : ""} anteriores`;

  const periodKey = `${sinceISO}__${untilISO}`;
  const { investmentInput, handleInvestmentChange, investmentValue } = useInvestment(periodKey);

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

  // Read from conversions with specific columns only
  const { data: conversions = [] } = useQuery({
    queryKey: ["dash-conversions", sinceDate, untilDate, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("id, amount, fees, net_amount, status, product_name, is_order_bump, payment_method, utm_source, utm_campaign, utm_medium, utm_content, created_at, click_id, smartlink_id, variant_id, paid_at")
        .eq("status", "approved")
        .gte("created_at", sinceISO)
        .lte("created_at", untilISO)
        .eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      q = q.limit(1000);
      const { data } = await q;
      return data || [];
    },
    staleTime: 300000,
    enabled: !!activeAccountId,
  });

  // Read clicks with minimal columns
  const { data: clicks = [] } = useQuery({
    queryKey: ["dash-clicks", sinceDate, untilDate, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("clicks")
        .select("id, created_at, smartlink_id, variant_id")
        .gte("created_at", sinceISO)
        .lte("created_at", untilISO)
        .eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      q = q.limit(1000);
      const { data } = await q;
      return data || [];
    },
    staleTime: 300000,
    enabled: !!activeAccountId,
  });

  const { data: prevConversions = [] } = useQuery({
    queryKey: ["dash-conversions-prev", prevSinceISO, prevUntilISO, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("id, amount, product_name, is_order_bump")
        .eq("status", "approved")
        .gte("created_at", prevSinceISO)
        .lte("created_at", prevUntilISO)
        .eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      q = q.limit(1000);
      const { data } = await q;
      return data || [];
    },
    staleTime: 300000,
    enabled: !!activeAccountId,
  });

  const { data: prevClicks = [] } = useQuery({
    queryKey: ["dash-clicks-prev", prevSinceISO, prevUntilISO, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("clicks")
        .select("id")
        .gte("created_at", prevSinceISO)
        .lte("created_at", prevUntilISO)
        .eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      q = q.limit(1000);
      const { data } = await q;
      return data || [];
    },
    staleTime: 300000,
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
      q = q.limit(50);
      const { data } = await q;
      return data || [];
    },
    staleTime: 300000,
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

    const prevTv = prevClicks.length;
    const prevTs = prevConversions.length;
    const prevTr = prevConversions.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const prevCr = prevTv > 0 ? (prevTs / prevTv) * 100 : 0;
    const prevAt = prevTs > 0 ? prevTr / prevTs : 0;

    // Previous period product-level data
    const prevProdMap = new Map<string, { vendas: number; receita: number }>();
    prevConversions.forEach((c: any) => {
      const name = c.product_name || "Produto desconhecido";
      const e = prevProdMap.get(name) || { vendas: 0, receita: 0 };
      e.vendas++; e.receita += Number(c.amount);
      prevProdMap.set(name, e);
    });

    const prevMainCount = prevConversions.filter((c: any) => !c.is_order_bump).length;
    const prevObCount = prevConversions.filter((c: any) => c.is_order_bump).length;
    const prevMainRevenue = prevConversions.filter((c: any) => !c.is_order_bump).reduce((s: number, c: any) => s + Number(c.amount), 0);
    const prevObRevenue = prevConversions.filter((c: any) => c.is_order_bump).reduce((s: number, c: any) => s + Number(c.amount), 0);

    const comparison = {
      views: pctChange(tv, prevTv),
      sales: pctChange(ts, prevTs),
      revenue: pctChange(tr, prevTr),
      convRate: cr - prevCr,
      ticket: pctChange(at, prevAt),
    };

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
      .map(([name, v]) => {
        const prev = prevProdMap.get(name);
        return {
          name, vendas: v.vendas, receita: v.receita, ticket: v.vendas > 0 ? v.receita / v.vendas : 0,
          percentual: tr > 0 ? (v.receita / tr) * 100 : 0, isOrderBump: v.isOrderBump,
          vendasChange: prev ? pctChange(v.vendas, prev.vendas) : (v.vendas > 0 ? 100 : 0),
          receitaChange: prev ? pctChange(v.receita, prev.receita) : (v.receita > 0 ? 100 : 0),
        };
      })
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
      const lMainConvs = lConvs.filter((c: any) => !c.is_order_bump);
      const lObConvs = lConvs.filter((c: any) => c.is_order_bump);
      const lc = lConvs.length;
      const lr = lConvs.reduce((s: number, c: any) => s + Number(c.amount), 0);
      return { ...link, views: lv, sales: lc, mainSales: lMainConvs.length, obSales: lObConvs.length, revenue: lr, rate: lv > 0 ? (lc / lv) * 100 : 0, ticket: lc > 0 ? lr / lc : 0 };
    });

    return {
      totalViews: tv, totalSales: ts, totalRevenue: tr, totalFees, totalNet, convRate: cr, avgTicket: at,
      comparison,
      chartData, salesChartData, paymentData, productData, feesData,
      sourceData: groupBy("utm_source"),
      campaignData: groupBy("utm_campaign"),
      mediumData: groupBy("utm_medium"),
      contentData: groupBy("utm_content"),
      productChartData: productData.map(p => ({ name: p.name, value: p.receita })).slice(0, 8),
      linkStats, pieData,
      mainProductsCount: mainProducts.length, orderBumpsCount: orderBumps.length,
      mainRevenue, obRevenue,
      prevMainCount, prevObCount, prevMainRevenue, prevObRevenue,
    };
  }, [clicks, conversions, smartLinks, dateRange, prevClicks, prevConversions]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = order.indexOf(active.id as string);
      const newIdx = order.indexOf(over.id as string);
      handleReorder(arrayMove(order, oldIdx, newIdx));
    }
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = computed.pieData[index]?.percent ?? 0;
    if (pct < 5) return null;
    return (
      <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
        {pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
      </text>
    );
  };

  const buildFullExportData = () => {
    const rows: Record<string, any>[] = [];
    const roas = investmentValue > 0 ? computed.totalRevenue / investmentValue : 0;
    rows.push({ seção: "Resumo", métrica: "Total Views", valor: computed.totalViews.toLocaleString("pt-BR") });
    rows.push({ seção: "Resumo", métrica: "Vendas", valor: computed.totalSales.toLocaleString("pt-BR") });
    rows.push({ seção: "Resumo", métrica: "Taxa Conv.", valor: computed.convRate.toFixed(2) + "%" });
    rows.push({ seção: "Resumo", métrica: "Investimento", valor: investmentValue > 0 ? fmt(investmentValue) : "—" });
    rows.push({ seção: "Resumo", métrica: "Faturamento", valor: fmt(computed.totalRevenue) });
    rows.push({ seção: "Resumo", métrica: "ROAS", valor: investmentValue > 0 ? roas.toFixed(2) + "x" : "—" });
    rows.push({ seção: "Resumo", métrica: "Ticket Médio", valor: fmt(computed.avgTicket) });
    computed.chartData.forEach((d: any) => {
      rows.push({ seção: "Tráfego Diário", data: d.date, views: d.views, vendas: d.sales, receita: fmt(d.revenue) });
    });
    computed.productData.forEach((p: any) => {
      rows.push({ seção: "Produtos", produto: p.name, vendas: p.vendas, receita: fmt(p.receita), ticket_medio: fmt(p.ticket), percentual: p.percentual.toFixed(1) + "%", tipo: p.isOrderBump ? "Order Bump" : "Principal" });
    });
    rows.push({ seção: "Order Bumps", categoria: "Produto Principal", vendas: computed.mainProductsCount, receita: fmt(computed.mainRevenue) });
    rows.push({ seção: "Order Bumps", categoria: "Order Bump", vendas: computed.orderBumpsCount, receita: fmt(computed.obRevenue) });
    computed.linkStats.forEach((l: any) => {
      rows.push({ seção: "Smart Links", nome: l.name, slug: l.slug, views: l.views, vendas: l.sales, receita: fmt(l.revenue), taxa: l.rate.toFixed(2) + "%", status: l.is_active ? "Ativo" : "Pausado" });
    });
    computed.sourceData.forEach((s: any) => { rows.push({ seção: "Receita por Origem", nome: s.name, receita: fmt(s.value) }); });
    computed.campaignData.forEach((s: any) => { rows.push({ seção: "Receita por Campanha", nome: s.name, receita: fmt(s.value) }); });
    computed.mediumData.forEach((s: any) => { rows.push({ seção: "Receita por Medium", nome: s.name, receita: fmt(s.value) }); });
    computed.contentData.forEach((s: any) => { rows.push({ seção: "Receita por Content", nome: s.name, receita: fmt(s.value) }); });
    computed.productChartData.forEach((s: any) => { rows.push({ seção: "Receita por Produto", nome: s.name, receita: fmt(s.value) }); });
    computed.paymentData.forEach((p: any) => { rows.push({ seção: "Meios de Pagamento", nome: p.name, vendas: p.vendas, receita: fmt(p.receita) }); });
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
            <MetricWithTooltip
              label="Total Views"
              value={computed.totalViews.toLocaleString("pt-BR")}
              icon={Eye}
              tooltipKey="total_views"
              change={`${fmtChange(computed.comparison.views)} vs ${previousPeriodLabel}`}
              changeType={changeType(computed.comparison.views)}
            />

            {/* Sales card with Total prominent */}
            <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow min-h-[100px] flex flex-col relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Vendas</span>
                <div className="h-7 w-7 rounded-lg gradient-bg-soft flex items-center justify-center">
                  <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <div className="text-xl font-bold flex-1 flex items-center">{computed.totalSales.toLocaleString("pt-BR")}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[9px] text-muted-foreground">Vendas <span className="font-mono font-medium text-foreground/80">{computed.mainProductsCount}</span></span>
                <span className="text-[9px] text-muted-foreground">OB <span className="font-mono font-medium text-foreground/80">{computed.orderBumpsCount}</span></span>
              </div>
              <div className={cn("text-[10px] font-normal mt-0.5", changeType(computed.comparison.sales) === "positive" ? "text-success" : changeType(computed.comparison.sales) === "negative" ? "text-destructive" : "text-muted-foreground")}>
                {fmtChange(computed.comparison.sales)} vs {previousPeriodLabel}
              </div>
            </div>

            <MetricWithTooltip label="Taxa Conv." value={`${computed.convRate.toFixed(2)}%`} icon={Percent} tooltipKey="conv_rate" change={`${fmtChange(computed.comparison.convRate, true)} vs ${previousPeriodLabel}`} changeType={changeType(computed.comparison.convRate)} />
            {/* Investment card */}
            <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow min-h-[100px] flex flex-col relative">
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
            <MetricWithTooltip label="Faturamento" value={fmt(computed.totalRevenue)} icon={DollarSign} tooltipKey="revenue" change={`${fmtChange(computed.comparison.revenue)} vs ${previousPeriodLabel}`} changeType={changeType(computed.comparison.revenue)} />
            {/* ROAS card */}
            <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow min-h-[100px] flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">ROAS</span>
                <div className="h-7 w-7 rounded-lg gradient-bg-soft flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <div className="text-lg font-bold font-mono flex-1 flex items-center" style={{ color: investmentValue > 0 ? roasColor : undefined }}>
                {investmentValue > 0 ? roas.toFixed(2) + "x" : "—"}
              </div>
            </div>
            <MetricWithTooltip label="Ticket Médio" value={fmt(computed.avgTicket)} icon={Ticket} tooltipKey="avg_ticket" change={`${fmtChange(computed.comparison.ticket)} vs ${previousPeriodLabel}`} changeType={changeType(computed.comparison.ticket)} />
          </div>
        );
      }

      case "traffic-chart":
        return (
          <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-5 mb-6 card-shadow">
            <ChartHeader title="Vendas Diárias" icon={<TrendingUp className="h-4 w-4 text-primary" />} tooltipKey="traffic-chart" />
            {computed.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={computed.chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-5))" stopOpacity={0.9} /><stop offset="100%" stopColor="hsl(var(--chart-5))" stopOpacity={0.35} /></linearGradient>
                  </defs>
                   <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} />
                  <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Bar yAxisId="right" dataKey="revenue" name="Faturamento (R$)" fill="url(#colorRevenue)" radius={[3, 3, 0, 0]} />
                  <Area yAxisId="left" type="monotone" dataKey="views" name="Views" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                  <Area yAxisId="left" type="monotone" dataKey="sales" name="Vendas" stroke="hsl(var(--chart-3))" fillOpacity={1} fill="url(#colorConv)" strokeWidth={2} />
                  <Line yAxisId="right" dataKey="revenue" stroke="none" dot={false} activeDot={false}>
                    <LabelList dataKey="revenue" position="top" style={{ fontSize: 9, fill: "hsl(var(--chart-5))" }} formatter={(v: number) => v > 0 ? `R$${(v/100 >= 10 ? (v/1000).toFixed(1)+'k' : v.toLocaleString("pt-BR", {maximumFractionDigits:0}))}` : ""} />
                  </Line>
                  <Line yAxisId="left" dataKey="views" stroke="none" dot={false} activeDot={false}>
                    <LabelList dataKey="views" position="top" style={{ fontSize: 9, fill: "hsl(var(--chart-1))" }} formatter={(v: number) => v > 0 ? v : ""} />
                  </Line>
                  <Line yAxisId="left" dataKey="sales" stroke="none" dot={false} activeDot={false}>
                    <LabelList dataKey="sales" position="top" style={{ fontSize: 9, fill: "hsl(var(--chart-3))" }} formatter={(v: number) => v > 0 ? v : ""} />
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
                      <td className="text-right px-5 py-3 text-xs">
                        <span className="font-mono">{p.vendas}</span>
                        <span className="ml-1.5"><ComparisonBadge value={p.vendasChange} /></span>
                      </td>
                      <td className="text-right px-5 py-3 text-xs">
                        <span className="font-mono">{fmt(p.receita)}</span>
                        <span className="ml-1.5"><ComparisonBadge value={p.receitaChange} /></span>
                      </td>
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
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-5 mb-6">
            <ChartHeader title="Produtos vs Order Bumps" icon={<Layers className="h-4 w-4 text-primary" />} tooltipKey="order-bumps" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="flex justify-center">
                {computed.totalSales > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={computed.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={115}
                        dataKey="value"
                        labelLine={false}
                        label={renderPieLabel}
                      >
                        {computed.pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} stroke="hsl(var(--card))" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
                        formatter={(value) => <span className="text-foreground/80">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState text="Sem dados de Order Bump" />}
              </div>
              <div className="flex flex-col justify-center space-y-3">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <p className="text-[11px] text-muted-foreground">Vendas Principais</p>
                  <p className="text-lg font-bold">
                    {computed.mainProductsCount}
                    <span className="ml-2"><ComparisonBadge value={pctChange(computed.mainProductsCount, computed.prevMainCount)} /></span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <p className="text-[11px] text-muted-foreground">Vendas Order Bumps</p>
                  <p className="text-lg font-bold">
                    {computed.orderBumpsCount}
                    <span className="ml-2"><ComparisonBadge value={pctChange(computed.orderBumpsCount, computed.prevObCount)} /></span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <p className="text-[11px] text-muted-foreground">Receita Principais</p>
                  <p className="text-lg font-bold">
                    {fmt(computed.mainRevenue)}
                    <span className="ml-2"><ComparisonBadge value={pctChange(computed.mainRevenue, computed.prevMainRevenue)} /></span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <p className="text-[11px] text-muted-foreground">Receita Order Bumps</p>
                  <p className="text-lg font-bold">
                    {fmt(computed.obRevenue)}
                    <span className="ml-2"><ComparisonBadge value={pctChange(computed.obRevenue, computed.prevObRevenue)} /></span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-[11px] text-muted-foreground">Influência OB na Receita</p>
                  <p className="text-lg font-bold text-primary">
                    {computed.mainRevenue > 0 ? `+${((computed.obRevenue / computed.mainRevenue) * 100).toFixed(1)}%` : "0%"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Order Bumps adicionaram este % à receita principal</p>
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
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">OB</th>
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
                            <td className="text-right px-5 py-3 font-mono text-xs">{link.mainSales.toLocaleString("pt-BR")}</td>
                            <td className="text-right px-5 py-3 font-mono text-xs text-muted-foreground">{link.obSales.toLocaleString("pt-BR")}</td>
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
                            const vMainSales = vConvs.filter((c: any) => !c.is_order_bump).length;
                            const vObSales = vConvs.filter((c: any) => c.is_order_bump).length;
                            const vRevenue = vConvs.reduce((s: number, c: any) => s + Number(c.amount), 0);
                            const vRate = vClicks > 0 ? (((vMainSales + vObSales) / vClicks) * 100).toFixed(2) : "0.00";
                            return (
                              <tr key={v.id} className="border-b border-border/10 bg-muted/10">
                                <td className="px-5 py-2 text-xs text-muted-foreground pl-10">↳ {v.name}</td>
                                <td className="px-5 py-2 text-xs text-muted-foreground font-mono truncate max-w-[140px]" title={v.url}>{v.url}</td>
                                <td className="text-right px-5 py-2 font-mono text-xs text-muted-foreground">{vClicks.toLocaleString("pt-BR")}</td>
                                <td className="text-right px-5 py-2 font-mono text-xs text-muted-foreground">{vMainSales.toLocaleString("pt-BR")}</td>
                                <td className="text-right px-5 py-2 font-mono text-xs text-muted-foreground">{vObSales.toLocaleString("pt-BR")}</td>
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
      title="Relatório"
      subtitle="Visão geral e templates de relatório"
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
          <DateFilter value={dateRange} onChange={handleDateChange} onPresetChange={setPeriodLabel} />
        </div>
      }
    >
      <div className="mb-6">
        <GamificationBar
          since={sinceISO}
          until={untilISO}
          goal={revenueGoal ?? 1000000}
          onEditGoal={() => { setGoalInput(String(revenueGoal ?? 1000000)); setGoalModalOpen(true); }}
        />
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="dashboard" className="text-xs">Relatório</TabsTrigger>
            <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <ExportMenu
              data={buildFullExportData()}
              filename="dashboard-nexus"
              title="Dashboard Completo — Nexus Metrics"
              snapshotSelector="#dashboard-export-root"
              periodLabel={`Período: ${periodLabel}`}
              kpis={[
                { label: "Views", value: computed.totalViews.toLocaleString("pt-BR") },
                { label: "Vendas", value: computed.totalSales.toLocaleString("pt-BR") },
                { label: "Taxa Conv.", value: computed.convRate.toFixed(2) + "%" },
                { label: "Investimento", value: investmentValue > 0 ? fmt(investmentValue) : "—" },
                { label: "Faturamento", value: fmt(computed.totalRevenue) },
                { label: "ROAS", value: investmentValue > 0 ? (computed.totalRevenue / investmentValue).toFixed(2) + "x" : "—" },
                { label: "Ticket Médio", value: fmt(computed.avgTicket) },
              ]}
              size="default"
            />
            <ShareReportButton />
          </div>
        </div>
        <TabsContent value="dashboard">

      <div id="dashboard-export-root">

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map(id => (
            <SortableSection key={id} id={id} editMode={editMode}>
              {renderSection(id)}
            </SortableSection>
          ))}
        </SortableContext>
      </DndContext>
      </div>{/* end dashboard-export-root */}

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
        </TabsContent>
        <TabsContent value="templates">
          <ReportTemplates />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">{text}</div>;
}

function MiniBarChart({ title, icon, tooltipKey, data, paletteIdx, fmt }: { title: string; icon?: React.ReactNode; tooltipKey: string; data: { name: string; value: number }[]; paletteIdx: number; fmt: (v: number) => string }) {
  const palette = CHART_PALETTES[paletteIdx % CHART_PALETTES.length];
  const miniTooltipStyle = {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    color: "hsl(var(--foreground))",
    padding: "10px 14px",
    boxShadow: "var(--shadow-card)",
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
          <defs>
            {data.map((_, i) => (
              <linearGradient key={`miniGrad${i}`} id={`miniGrad-${paletteIdx}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette[i % palette.length]} stopOpacity={0.95} />
                <stop offset="100%" stopColor={palette[i % palette.length]} stopOpacity={0.4} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={65} tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + "…" : v} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip content={<MiniCustomTooltip />} />
          <Bar dataKey="value" name="Receita" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={`url(#miniGrad-${paletteIdx}-${i})`} />)}
            <LabelList dataKey="value" position="inside" style={{ fontSize: 9, fill: "#ffffff", fontWeight: 600 }} formatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : fmt(v)} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
