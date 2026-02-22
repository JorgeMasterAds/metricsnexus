import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MousePointerClick, TrendingUp, DollarSign, BarChart3, Ticket, Download } from "lucide-react";
import MetricCard from "@/components/MetricCard";
import GamificationBar from "@/components/GamificationBar";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import ProductTour, { TOURS } from "@/components/ProductTour";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csv";
import { useProject } from "@/hooks/useProject";

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const { activeProject } = useProject();
  const projectId = activeProject?.id;
  const since = dateRange.from.toISOString();
  const until = dateRange.to.toISOString();

  const { data: views = [] } = useQuery({
    queryKey: ["dash-views", since, until, projectId],
    queryFn: async () => {
      let q = supabase
        .from("views")
        .select("id, created_at, smart_link_id, variant_id")
        .gte("created_at", since)
        .lte("created_at", until);
      if (projectId) q = (q as any).eq("project_id", projectId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 30000,
    enabled: !!projectId,
  });

  const { data: conversions = [] } = useQuery({
    queryKey: ["dash-conversions", since, until, projectId],
    queryFn: async () => {
      let q = supabase
        .from("conversions")
        .select("id, amount, is_order_bump, created_at, smart_link_id, variant_id, status")
        .eq("status", "approved")
        .gte("created_at", since)
        .lte("created_at", until);
      if (projectId) q = (q as any).eq("project_id", projectId);
      const { data } = await q;
      return data || [];
    },
    staleTime: 30000,
    enabled: !!projectId,
  });

  const { data: smartLinks = [] } = useQuery({
    queryKey: ["dash-smart-links", projectId],
    queryFn: async () => {
      let q = supabase
        .from("smart_links")
        .select("id, name, slug, is_active, created_at, variants(id, name, url, weight, is_active)")
        .order("created_at", { ascending: false });
      if (projectId) q = (q as any).eq("project_id", projectId);
      const { data } = await q;
      return data || [];
    },
    enabled: !!projectId,
  });

  const totalViews = views.length;
  const totalSales = conversions.length;
  const totalRevenue = conversions.reduce((s, c: any) => s + Number(c.amount), 0);
  const convRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  const days = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000));
  const chartData = buildChartData(views, conversions, dateRange.from, days);

  const linkStats = smartLinks.map((link: any) => {
    const linkViews = views.filter((v: any) => v.smart_link_id === link.id).length;
    const linkConv = conversions.filter((c: any) => c.smart_link_id === link.id);
    const linkRevenue = linkConv.reduce((s: number, c: any) => s + Number(c.amount), 0);
    const linkRate = linkViews > 0 ? (linkConv.length / linkViews) * 100 : 0;
    const linkTicket = linkConv.length > 0 ? linkRevenue / linkConv.length : 0;
    return { ...link, views: linkViews, sales: linkConv.length, revenue: linkRevenue, rate: linkRate, ticket: linkTicket };
  });

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
      <GamificationBar since={since} until={until} />

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

function buildChartData(views: any[], conversions: any[], startDate: Date, days: number) {
  const result: { date: string; views: number; sales: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
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
