import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Eye,
  MousePointerClick,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Plus,
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

const chartData = [
  { name: "Seg", clicks: 1240, conversions: 87 },
  { name: "Ter", clicks: 1580, conversions: 112 },
  { name: "Qua", clicks: 1320, conversions: 95 },
  { name: "Qui", clicks: 1890, conversions: 143 },
  { name: "Sex", clicks: 2100, conversions: 168 },
  { name: "Sáb", clicks: 1750, conversions: 131 },
  { name: "Dom", clicks: 1420, conversions: 99 },
];

const smartLinks = [
  {
    id: "1",
    name: "Campanha VSL Principal",
    slug: "vsl-main",
    clicks: 12840,
    conversions: 642,
    revenue: 89680,
    variants: 3,
    status: "active",
  },
  {
    id: "2",
    name: "Checkout Teste Preço",
    slug: "checkout-price",
    clicks: 8420,
    conversions: 421,
    revenue: 52620,
    variants: 2,
    status: "active",
  },
  {
    id: "3",
    name: "Landing Page Frio",
    slug: "lp-cold",
    clicks: 5680,
    conversions: 170,
    revenue: 23800,
    variants: 4,
    status: "paused",
  },
];

export default function Dashboard() {
  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Visão geral dos seus experimentos"
      actions={
        <Button size="sm" className="gradient-bg border-0 text-primary-foreground hover:opacity-90" asChild>
          <Link to="/smart-links">
            <Plus className="h-4 w-4 mr-1" />
            Novo Smart Link
          </Link>
        </Button>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Clicks"
          value="26,940"
          change="+12.5% vs semana anterior"
          changeType="positive"
          icon={MousePointerClick}
        />
        <MetricCard
          label="Conversões"
          value="1,233"
          change="+8.3% vs semana anterior"
          changeType="positive"
          icon={TrendingUp}
        />
        <MetricCard
          label="Taxa Conversão"
          value="4.58%"
          change="+0.3pp"
          changeType="positive"
          icon={BarChart3}
        />
        <MetricCard
          label="Faturamento"
          value="R$ 166.1K"
          change="+15.2% vs semana anterior"
          changeType="positive"
          icon={DollarSign}
        />
      </div>

      {/* Chart */}
      <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Tráfego & Conversões</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Clicks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" /> Conversões
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(1, 100%, 57%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(1, 100%, 57%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240, 5%, 7%)",
                border: "1px solid hsl(240, 4%, 16%)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="clicks" stroke="hsl(1, 100%, 57%)" fillOpacity={1} fill="url(#colorClicks)" strokeWidth={2} />
            <Area type="monotone" dataKey="conversions" stroke="hsl(142, 71%, 45%)" fillOpacity={1} fill="url(#colorConversions)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Smart Links Table */}
      <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h3 className="text-sm font-semibold">Smart Links Ativos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Clicks</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Conv.</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Variantes</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {smartLinks.map((link) => (
                <tr key={link.id} className="border-b border-border/20 hover:bg-accent/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium">{link.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">/{link.slug}</div>
                  </td>
                  <td className="text-right px-5 py-4 font-mono text-xs">{link.clicks.toLocaleString()}</td>
                  <td className="text-right px-5 py-4 font-mono text-xs">{link.conversions.toLocaleString()}</td>
                  <td className="text-right px-5 py-4 font-mono text-xs text-success">
                    {((link.conversions / link.clicks) * 100).toFixed(2)}%
                  </td>
                  <td className="text-right px-5 py-4 font-mono text-xs">
                    R$ {(link.revenue / 1000).toFixed(1)}K
                  </td>
                  <td className="text-right px-5 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                      {link.variants}
                    </span>
                  </td>
                  <td className="text-right px-5 py-4">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/analytics/${link.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
