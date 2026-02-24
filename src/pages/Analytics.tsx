import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import {
  MousePointerClick,
  TrendingUp,
  DollarSign,
  BarChart3,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useAccount } from "@/hooks/useAccount";

export default function Analytics() {
  const { id } = useParams();
  const { activeAccountId } = useAccount();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const sinceDate = dateRange.from.toISOString().split("T")[0];
  const untilDate = dateRange.to.toISOString().split("T")[0];

  const { data: smartlink } = useQuery({
    queryKey: ["analytics-smartlink", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("smartlinks")
        .select("id, name, slug, smartlink_variants(id, name, url, weight, is_active)")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: clicks = [] } = useQuery({
    queryKey: ["analytics-clicks", id, sinceDate, untilDate, activeAccountId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("clicks")
        .select("id, variant_id, click_id, country, device_type, created_at")
        .gte("created_at", sinceDate + "T00:00:00")
        .lte("created_at", untilDate + "T23:59:59");
      if (id) q = q.eq("smartlink_id", id);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["analytics-conversions", id, sinceDate, untilDate, activeAccountId],
    queryFn: async () => {
      let q = (supabase as any)
        .from("conversions")
        .select("id, variant_id, click_id, amount, status, created_at")
        .eq("status", "approved")
        .gte("created_at", sinceDate + "T00:00:00")
        .lte("created_at", untilDate + "T23:59:59");
      if (id) q = q.eq("smartlink_id", id);
      if (activeAccountId) q = q.eq("account_id", activeAccountId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!activeAccountId,
  });

  const { totalClicks, totalConversions, totalRevenue, convRate, variants, chartData, countryData } = useMemo(() => {
    const tc = clicks.length;
    const tconv = conversions.length;
    const tr = conversions.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const cr = tc > 0 ? (tconv / tc) * 100 : 0;

    // Variant stats
    const variantMap = new Map<string, { clicks: number; conversions: number; revenue: number }>();
    clicks.forEach((c: any) => {
      const vid = c.variant_id || 'direct';
      const entry = variantMap.get(vid) || { clicks: 0, conversions: 0, revenue: 0 };
      entry.clicks++;
      variantMap.set(vid, entry);
    });
    conversions.forEach((c: any) => {
      const vid = c.variant_id || 'direct';
      const entry = variantMap.get(vid) || { clicks: 0, conversions: 0, revenue: 0 };
      entry.conversions++;
      entry.revenue += Number(c.amount);
      variantMap.set(vid, entry);
    });

    const variantNames = new Map<string, string>();
    if (smartlink?.smartlink_variants) {
      smartlink.smartlink_variants.forEach((v: any) => {
        variantNames.set(v.id, v.name);
      });
    }

    const variants = Array.from(variantMap.entries()).map(([vid, stats]) => ({
      id: vid,
      label: variantNames.get(vid) || (vid === 'direct' ? 'Direto' : vid.slice(0, 8)),
      ...stats,
      rate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0,
      ticket: stats.conversions > 0 ? stats.revenue / stats.conversions : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // Chart data by day
    const dayMap = new Map<string, { clicks: number; conversions: number }>();
    const days = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000));
    for (let i = 0; i < days; i++) {
      const d = new Date(dateRange.from.getTime() + i * 86400000);
      const ds = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      dayMap.set(ds, { clicks: 0, conversions: 0 });
    }
    clicks.forEach((c: any) => {
      const ds = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entry = dayMap.get(ds);
      if (entry) entry.clicks++;
    });
    conversions.forEach((c: any) => {
      const ds = new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entry = dayMap.get(ds);
      if (entry) entry.conversions++;
    });
    const chartData = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }));

    // Country
    const countryMap = new Map<string, { clicks: number }>();
    clicks.forEach((c: any) => {
      const country = c.country || 'Desconhecido';
      const entry = countryMap.get(country) || { clicks: 0 };
      entry.clicks++;
      countryMap.set(country, entry);
    });
    const countryData = Array.from(countryMap.entries())
      .map(([country, v]) => ({ country, clicks: v.clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    return { totalClicks: tc, totalConversions: tconv, totalRevenue: tr, convRate: cr, variants, chartData, countryData };
  }, [clicks, conversions, smartlink, dateRange]);

  const bestVariant = variants.length > 0 ? variants.reduce((best, v) => v.rate > best.rate ? v : best) : null;

  return (
    <DashboardLayout
      title={smartlink?.name || "Analytics"}
      subtitle="Análise detalhada"
      actions={
        <div className="flex items-center gap-2">
          <DateFilter value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" asChild>
            <Link to="/smart-links">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Cliques" value={totalClicks.toLocaleString("pt-BR")} icon={MousePointerClick} />
        <MetricCard label="Conversões" value={totalConversions.toLocaleString("pt-BR")} icon={TrendingUp} />
        <MetricCard label="Taxa Conv." value={`${convRate.toFixed(2)}%`} icon={BarChart3} />
        <MetricCard label="Faturamento" value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} />
      </div>

      {variants.length > 0 && (
        <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
          <h3 className="text-sm font-semibold mb-4">Performance por Variante</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {variants.map((v) => {
              const isBest = bestVariant?.id === v.id;
              return (
                <div
                  key={v.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    isBest ? "border-primary/40 bg-primary/5" : "border-border/30 bg-secondary/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm">{v.label}</span>
                    {isBest && <Trophy className="h-4 w-4 text-warning" />}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliques</span>
                      <span className="font-mono">{v.clicks.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Conversões</span>
                      <span className="font-mono">{v.conversions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa</span>
                      <span className={cn("font-mono font-semibold", isBest && "text-success")}>{v.rate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ticket Médio</span>
                      <span className="font-mono">R$ {v.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receita</span>
                      <span className="font-mono">R$ {v.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
        <h3 className="text-sm font-semibold mb-4">Cliques & Conversões ao Longo do Tempo</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 7%)", border: "1px solid hsl(240, 4%, 16%)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="clicks" name="Cliques" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="conversions" name="Conversões" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado no período
          </div>
        )}
      </div>

      {countryData.length > 0 && (
        <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h3 className="text-sm font-semibold">Cliques por País</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">País</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Cliques</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">%</th>
                </tr>
              </thead>
              <tbody>
                {countryData.map((c, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-xs">{c.country}</td>
                    <td className="text-right px-5 py-3 font-mono text-xs">{c.clicks.toLocaleString("pt-BR")}</td>
                    <td className="text-right px-5 py-3 font-mono text-xs text-success">
                      {totalClicks > 0 ? ((c.clicks / totalClicks) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
