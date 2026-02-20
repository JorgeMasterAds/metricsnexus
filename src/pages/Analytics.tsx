import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import MetricCard from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import {
  MousePointerClick,
  TrendingUp,
  DollarSign,
  BarChart3,
  ArrowLeft,
  Trophy,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";

const timeData = Array.from({ length: 14 }, (_, i) => ({
  date: `${i + 1}/02`,
  varA: Math.floor(300 + Math.random() * 200),
  varB: Math.floor(250 + Math.random() * 180),
  varC: Math.floor(150 + Math.random() * 120),
}));

const variants = [
  {
    id: "v1",
    label: "Controle",
    color: "hsl(1, 100%, 57%)",
    clicks: 6420,
    conversions: 321,
    revenue: 44840,
    winProb: 0.72,
    confidence: 0.94,
  },
  {
    id: "v2",
    label: "Variante B",
    color: "hsl(347, 100%, 57%)",
    clicks: 3852,
    conversions: 212,
    revenue: 29680,
    winProb: 0.21,
    confidence: 0.94,
  },
  {
    id: "v3",
    label: "Variante C",
    color: "hsl(217, 91%, 60%)",
    clicks: 2568,
    conversions: 109,
    revenue: 15160,
    winProb: 0.07,
    confidence: 0.94,
  },
];

const countryData = [
  { country: "Brasil", clicks: 8420, conversions: 462 },
  { country: "Portugal", clicks: 2180, conversions: 98 },
  { country: "EUA", clicks: 1340, conversions: 54 },
  { country: "Angola", clicks: 680, conversions: 21 },
  { country: "Outros", clicks: 220, conversions: 7 },
];

export default function Analytics() {
  const { id } = useParams();
  const bestVariant = variants.reduce((best, v) =>
    (v.conversions / v.clicks) > (best.conversions / best.clicks) ? v : best
  );

  return (
    <DashboardLayout
      title="Campanha VSL Principal"
      subtitle="Análise detalhada do experimento"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/smart-links">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Link>
        </Button>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Clicks" value="12,840" icon={MousePointerClick} change="+12% 7d" changeType="positive" />
        <MetricCard label="Conversões" value="642" icon={TrendingUp} change="+8% 7d" changeType="positive" />
        <MetricCard label="Taxa de Conversão" value="5.00%" icon={BarChart3} change="+0.4pp" changeType="positive" />
        <MetricCard label="Faturamento" value="R$ 89.7K" icon={DollarSign} change="+15% 7d" changeType="positive" />
      </div>

      {/* Variants comparison */}
      <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
        <h3 className="text-sm font-semibold mb-4">Performance por Variante</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {variants.map((v) => {
            const rate = ((v.conversions / v.clicks) * 100).toFixed(2);
            const rpv = (v.revenue / v.clicks).toFixed(2);
            const ticket = (v.revenue / v.conversions).toFixed(0);
            const isBest = v.id === bestVariant.id;
            return (
              <div
                key={v.id}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  isBest ? "border-primary/40 bg-primary/5" : "border-border/30 bg-secondary/20"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                    <span className="font-medium text-sm">{v.label}</span>
                  </div>
                  {isBest && <Trophy className="h-4 w-4 text-warning" />}
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clicks</span>
                    <span className="font-mono">{v.clicks.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversões</span>
                    <span className="font-mono">{v.conversions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa</span>
                    <span className={cn("font-mono font-semibold", isBest && "text-success")}>{rate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket Médio</span>
                    <span className="font-mono">R$ {ticket}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RPV</span>
                    <span className="font-mono">R$ {rpv}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receita</span>
                    <span className="font-mono">R$ {(v.revenue / 1000).toFixed(1)}K</span>
                  </div>
                </div>
                {/* Win probability bar */}
                <div className="mt-3 pt-3 border-t border-border/20">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Prob. vitória</span>
                    <span className="font-mono font-semibold">{(v.winProb * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-bg transition-all duration-500"
                      style={{ width: `${v.winProb * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Statistical significance */}
        <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border/20 flex items-center gap-3">
          <Target className="h-4 w-4 text-info shrink-0" />
          <div className="text-xs">
            <span className="font-medium">Significância estatística: </span>
            <span className="text-success font-semibold">94% de confiança</span>
            <span className="text-muted-foreground"> — O "Controle" lidera com 72% de probabilidade de ser a melhor variante (Teste Z, p {"<"} 0.06).</span>
          </div>
        </div>
      </div>

      {/* Timeline chart */}
      <div className="rounded-xl bg-card border border-border/50 p-5 mb-6 card-shadow">
        <h3 className="text-sm font-semibold mb-4">Clicks por Variante ao Longo do Tempo</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={timeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240, 5%, 7%)",
                border: "1px solid hsl(240, 4%, 16%)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="varA" name="Controle" stroke="hsl(1, 100%, 57%)" fill="hsl(1, 100%, 57%)" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="varB" name="Variante B" stroke="hsl(347, 100%, 57%)" fill="hsl(347, 100%, 57%)" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="varC" name="Variante C" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Country breakdown */}
      <div className="rounded-xl bg-card border border-border/50 p-5 card-shadow">
        <h3 className="text-sm font-semibold mb-4">Breakdown por País</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={countryData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis dataKey="country" type="category" tick={{ fontSize: 11, fill: "hsl(240, 5%, 55%)" }} axisLine={false} tickLine={false} width={70} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240, 5%, 7%)",
                border: "1px solid hsl(240, 4%, 16%)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="clicks" name="Clicks" fill="hsl(1, 100%, 57%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardLayout>
  );
}
