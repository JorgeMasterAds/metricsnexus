import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useActiveProject } from "@/hooks/useActiveProject";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { useUsageLimits } from "@/hooks/useSubscription";
import {
  ShoppingCart, Percent, DollarSign, Ticket, GitBranch, Package,
  Webhook, FileCode, Smartphone, Users, TrendingUp, Pencil, Check,
  HelpCircle, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import {
  ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, LabelList,
} from "recharts";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableSection } from "@/components/SortableSection";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

const SECTION_IDS = ["metrics", "limits", "sales-chart", "products"];

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

export default function Home() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [debouncedRange, setDebouncedRange] = useState<DateRange>(dateRange);
  const { activeAccountId } = useAccount();
  const { activeProjectId } = useActiveProject();
  const { order, editMode, toggleEdit, handleReorder, resetLayout } = useDashboardLayout("home", SECTION_IDS);
  const { maxSmartlinks, maxWebhooks } = useUsageLimits();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  const { data: userProfile } = useQuery({
    queryKey: ["home-user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await (supabase as any).from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["home-conversions", sinceDate, untilDate, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("id, amount, status, product_name, is_order_bump, created_at, smartlink_id")
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

  const { data: clicks = [] } = useQuery({
    queryKey: ["home-clicks", sinceDate, untilDate, activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("clicks")
        .select("id, created_at")
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

  // Usage counts
  const { data: smartlinkCount = 0 } = useQuery({
    queryKey: ["home-smartlink-count", activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any).from("smartlinks").select("id", { count: "exact", head: true }).eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { count } = await q;
      return count || 0;
    },
    enabled: !!activeAccountId,
  });

  const { data: webhookCount = 0 } = useQuery({
    queryKey: ["home-webhook-count", activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any).from("webhooks").select("id", { count: "exact", head: true }).eq("account_id", activeAccountId).neq("platform", "form");
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { count } = await q;
      return count || 0;
    },
    enabled: !!activeAccountId,
  });

  const { data: formCount = 0 } = useQuery({
    queryKey: ["home-form-count", activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any).from("webhook_forms").select("id", { count: "exact", head: true }).eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { count } = await q;
      return count || 0;
    },
    enabled: !!activeAccountId,
  });

  const { data: leadCount = 0 } = useQuery({
    queryKey: ["home-lead-count", activeAccountId, activeProjectId],
    queryFn: async () => {
      let q = (supabase as any).from("leads").select("id", { count: "exact", head: true }).eq("account_id", activeAccountId);
      if (activeProjectId) q = q.eq("project_id", activeProjectId);
      const { count } = await q;
      return count || 0;
    },
    enabled: !!activeAccountId,
  });

  const { data: deviceCount = 0 } = useQuery({
    queryKey: ["home-device-count", activeAccountId],
    queryFn: async () => {
      const { count } = await (supabase as any).from("whatsapp_devices").select("id", { count: "exact", head: true }).eq("account_id", activeAccountId);
      return count || 0;
    },
    enabled: !!activeAccountId,
  });

  const computed = useMemo(() => {
    const tv = clicks.length;
    const ts = conversions.length;
    const tr = conversions.reduce((s: number, c: any) => s + Number(c.amount), 0);
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

    const chartData = Array.from(dayMap.entries()).map(([date, v]) => ({ date, views: v.views, vendas: v.sales, receita: v.revenue }));

    const prodMap = new Map<string, { vendas: number; receita: number }>();
    conversions.forEach((c: any) => {
      const name = c.product_name || "Produto desconhecido";
      const e = prodMap.get(name) || { vendas: 0, receita: 0 };
      e.vendas++; e.receita += Number(c.amount);
      prodMap.set(name, e);
    });
    const productData = Array.from(prodMap.entries())
      .map(([name, v]) => ({ name, vendas: v.vendas, receita: v.receita, ticket: v.vendas > 0 ? v.receita / v.vendas : 0 }))
      .sort((a, b) => b.receita - a.receita);

    return { totalViews: tv, totalSales: ts, totalRevenue: tr, convRate: cr, avgTicket: at, chartData, productData };
  }, [clicks, conversions, dateRange]);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = order.indexOf(active.id as string);
      const newIdx = order.indexOf(over.id as string);
      handleReorder(arrayMove(order, oldIdx, newIdx));
    }
  };

  const firstName = userProfile?.full_name?.split(" ")[0] || "Usuário";

  const renderSection = (id: string) => {
    switch (id) {
      case "metrics":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <MiniMetric label="Vendas" value={computed.totalSales.toLocaleString("pt-BR")} icon={ShoppingCart} />
            <MiniMetric label="Taxa Conv." value={`${computed.convRate.toFixed(2)}%`} icon={Percent} />
            <MiniMetric label="Faturamento" value={fmt(computed.totalRevenue)} icon={DollarSign} />
            <MiniMetric label="Ticket Médio" value={fmt(computed.avgTicket)} icon={Ticket} />
            <MiniMetric label="Smart Links" value={String(smartlinkCount)} icon={GitBranch} />
          </div>
        );

      case "limits":
        return (
          <div className="rounded-xl bg-card border border-border/50 card-shadow p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Limites de Uso
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <UsageItem label="Smart Links" used={smartlinkCount} max={maxSmartlinks} icon={GitBranch} />
              <UsageItem label="Webhooks" used={webhookCount} max={maxWebhooks} icon={Webhook} />
              <UsageItem label="Formulários" used={formCount} max={99} icon={FileCode} />
              <UsageItem label="Dispositivos" used={deviceCount} max={5} icon={Smartphone} />
              <UsageItem label="Leads" used={leadCount} max={1000} icon={Users} />
            </div>
          </div>
        );

      case "sales-chart":
        return (
          <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-5 mb-6 card-shadow">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Vendas Diárias
            </h3>
            {computed.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={computed.chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="homeColorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(0, 90%, 60%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(0, 90%, 60%)" stopOpacity={0} /></linearGradient>
                    <linearGradient id="homeColorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(30, 90%, 60%)" stopOpacity={0.9} /><stop offset="100%" stopColor="hsl(30, 60%, 35%)" stopOpacity={0.4} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                  <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Bar yAxisId="right" dataKey="receita" name="Faturamento (R$)" fill="url(#homeColorRevenue)" radius={[3, 3, 0, 0]} />
                  <Area yAxisId="left" type="monotone" dataKey="vendas" name="Vendas" stroke="hsl(0, 85%, 55%)" fillOpacity={1} fill="url(#homeColorViews)" strokeWidth={2} />
                  <Line yAxisId="left" dataKey="vendas" stroke="none" dot={false} activeDot={false}>
                    <LabelList dataKey="vendas" position="top" style={{ fontSize: 9, fill: "hsl(0, 85%, 65%)" }} formatter={(v: number) => v > 0 ? v : ""} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Nenhum dado no período</div>
            )}
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
                </tr></thead>
                <tbody>
                  {computed.productData.map((p, i) => (
                    <tr key={i} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                      <td className="px-5 py-3 font-medium text-xs">{p.name}</td>
                      <td className="text-right px-5 py-3 font-mono text-xs">{p.vendas}</td>
                      <td className="text-right px-5 py-3 font-mono text-xs">{fmt(p.receita)}</td>
                      <td className="text-right px-5 py-3 font-mono text-xs">{fmt(p.ticket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null;

      default: return null;
    }
  };

  return (
    <DashboardLayout
      title={`Boas-vindas, ${firstName}`}
      subtitle="Visão geral do seu projeto"
      actions={
        <div className="flex items-center gap-2">
          {editMode && (
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={resetLayout}>
              <RotateCcw className="h-3.5 w-3.5" /> Redefinir
            </Button>
          )}
          <Button variant={editMode ? "default" : "outline"} size="sm" className="text-xs gap-1.5" onClick={toggleEdit}>
            {editMode ? <><Check className="h-3.5 w-3.5" /> Salvar Layout</> : <><Pencil className="h-3.5 w-3.5" /> Editar Layout</>}
          </Button>
          <DateFilter value={dateRange} onChange={handleDateChange} />
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

function MiniMetric({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 card-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <div className="h-7 w-7 rounded-lg gradient-bg-soft flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function UsageItem({ label, used, max, icon: Icon }: { label: string; used: number; max: number; icon: any }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const color = pct >= 90 ? "text-destructive" : pct >= 70 ? "text-warning" : "text-success";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <p className={`text-xs font-mono font-medium ${color}`}>{used} / {max}</p>
    </div>
  );
}
