import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MousePointerClick, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { useState } from "react";

const DAYS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
];

export default function Dashboard() {
  const [days, setDays] = useState(7);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: views = [] } = useQuery({
    queryKey: ["dash-views", days],
    queryFn: async () => {
      const { data } = await supabase
        .from("views")
        .select("id, created_at, smart_link_id, variant_id")
        .gte("created_at", since);
      return data || [];
    },
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["dash-conversions", days],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversions")
        .select("id, amount, is_order_bump, created_at, smart_link_id, variant_id")
        .eq("status", "approved")
        .gte("created_at", since);
      return data || [];
    },
  });

  const { data: smartLinks = [] } = useQuery({
    queryKey: ["dash-smart-links"],
    queryFn: async () => {
      const { data } = await supabase
        .from("smart_links")
        .select("id, name, slug, is_active, variants(id, name, url, weight, is_active)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Aggregate totals
  const totalViews = views.length;
  const totalSales = conversions.length;
  const totalRevenue = conversions.reduce((s, c) => s + Number(c.amount), 0);
  const convRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

  // Build chart data by day
  const chartData = buildChartData(views, conversions, days);

  // Per smart-link stats
  const linkStats = smartLinks.map((link: any) => {
    const linkViews = views.filter((v: any) => v.smart_link_id === link.id).length;
    const linkConv = conversions.filter((c: any) => c.smart_link_id === link.id);
    const linkRevenue = linkConv.reduce((s: number, c: any) => s + Number(c.amount), 0);
    return { ...link, views: linkViews, sales: linkConv.length, revenue: linkRevenue };
  });

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Visão geral dos seus experimentos"
      actions={
        <div className="flex gap-1">
          {DAYS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDays(d.value)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                days === d.value
                  ? "gradient-bg text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      }
    >
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Views" value={totalViews.toLocaleString("pt-BR")} icon={MousePointerClick} />
        <MetricCard label="Vendas" value={totalSales.toLocaleString("pt-BR")} icon={TrendingUp} />
        <MetricCard label="Taxa de Conversão" value={`${convRate.toFixed(2)}%`} icon={BarChart3} />
        <MetricCard
          label="Faturamento"
          value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
      </div>

      {/* Chart */}
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

      {/* Smart Links table */}
      <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="text-sm font-semibold">Smart Links</h3>
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
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Views</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Vendas</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Conv.</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Receita</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {linkStats.map((link: any) => (
                  <tr key={link.id} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium">{link.name}</div>
                      <div className="text-xs text-muted-foreground">/{link.slug}</div>
                    </td>
                    <td className="text-right px-5 py-4 font-mono text-xs">{link.views.toLocaleString("pt-BR")}</td>
                    <td className="text-right px-5 py-4 font-mono text-xs">{link.sales.toLocaleString("pt-BR")}</td>
                    <td className="text-right px-5 py-4 font-mono text-xs text-success">
                      {link.views > 0 ? ((link.sales / link.views) * 100).toFixed(2) : "0.00"}%
                    </td>
                    <td className="text-right px-5 py-4 font-mono text-xs">
                      R$ {link.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${link.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${link.is_active ? "bg-success" : "bg-muted-foreground"}`} />
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
    </DashboardLayout>
  );
}

function buildChartData(views: any[], conversions: any[], days: number) {
  const result: { date: string; views: number; sales: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
    result.push({
      date: dateStr,
      views: views.filter((v) => v.created_at >= dayStart && v.created_at < dayEnd).length,
      sales: conversions.filter((c) => c.created_at >= dayStart && c.created_at < dayEnd).length,
    });
  }
  return result;
}
