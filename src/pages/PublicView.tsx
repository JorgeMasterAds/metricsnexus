import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Activity, BarChart3, FileBarChart, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import MetricCard from "@/components/MetricCard";
import { format, parseISO } from "date-fns";
import ChartLoader from "@/components/ChartLoader";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#ec4899"];

export default function PublicView() {
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activePage, setActivePage] = useState(searchParams.get("page") || "dashboard");
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const url = new URL(`${supabaseUrl}/functions/v1/public-view`);
    url.searchParams.set("token", token);
    url.searchParams.set("page", activePage);
    url.searchParams.set("from", dateRange.from.toISOString());
    url.searchParams.set("to", dateRange.to.toISOString());

    fetch(url.toString())
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      })
      .catch(() => setError("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, [token, activePage, dateRange, supabaseUrl]);

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setSearchParams({ page });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Eye className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Acesso negado</h2>
          <p className="text-muted-foreground text-sm">
            {error === "Token expired" ? "Este link expirou." : "Link inválido ou desativado."}
          </p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return <ChartLoader text="Carregando relatório público..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-4 lg:px-8 py-4 max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-bold">{data.project_name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" /> Visualização pública (somente leitura)
              </p>
            </div>
          </div>
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      </header>

      {/* Tab navigation */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-4">
        <Tabs value={activePage} onValueChange={handlePageChange}>
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Relatório
            </TabsTrigger>
            <TabsTrigger value="utm" className="gap-1.5">
              <FileBarChart className="h-3.5 w-3.5" /> Relatório UTM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardPublicView data={data} />
          </TabsContent>
          <TabsContent value="utm" className="mt-6">
            <UtmPublicView data={data} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DashboardPublicView({ data }: { data: any }) {
  const conversions = data.conversions || [];
  const clicks = data.clicks || [];

  const approved = conversions.filter((c: any) => c.status === "approved");
  const totalRevenue = approved.reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const totalClicks = clicks.length;
  const totalSales = approved.length;
  const convRate = totalClicks > 0 ? ((totalSales / totalClicks) * 100).toFixed(1) : "0";

  // Daily chart
  const dailyMap: Record<string, { date: string; revenue: number; sales: number; clicks: number }> = {};
  approved.forEach((c: any) => {
    const d = format(parseISO(c.created_at), "yyyy-MM-dd");
    if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, sales: 0, clicks: 0 };
    dailyMap[d].revenue += c.amount || 0;
    dailyMap[d].sales += 1;
  });
  clicks.forEach((c: any) => {
    const d = format(parseISO(c.created_at), "yyyy-MM-dd");
    if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, sales: 0, clicks: 0 };
    dailyMap[d].clicks += 1;
  });
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Receita" value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
        <MetricCard label="Vendas" value={totalSales.toString()} />
        <MetricCard label="Cliques" value={totalClicks.toString()} />
        <MetricCard label="Conversão" value={`${convRate}%`} />
      </div>

      {dailyData.length > 0 && (
        <div className="border rounded-xl p-4 bg-card">
          <h3 className="text-sm font-semibold mb-4">Receita por dia</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" name="Receita" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function UtmPublicView({ data }: { data: any }) {
  const conversions = (data.conversions || []).filter((c: any) => c.status === "approved");

  const grouped = useMemo(() => {
    const map: Record<string, { source: string; sales: number; revenue: number }> = {};
    conversions.forEach((c: any) => {
      const key = c.utm_source || "(direto)";
      if (!map[key]) map[key] = { source: key, sales: 0, revenue: 0 };
      map[key].sales += 1;
      map[key].revenue += c.amount || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [conversions]);

  return (
    <div className="space-y-6">
      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhum dado UTM no período selecionado.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border rounded-xl p-4 bg-card">
              <h3 className="text-sm font-semibold mb-4">Receita por Source</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={grouped.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="border rounded-xl p-4 bg-card">
              <h3 className="text-sm font-semibold mb-4">Vendas por Source</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={grouped.slice(0, 7)} dataKey="sales" nameKey="source" cx="50%" cy="50%" outerRadius={100} label>
                    {grouped.slice(0, 7).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2 font-medium">Source</th>
                  <th className="text-right px-4 py-2 font-medium">Vendas</th>
                  <th className="text-right px-4 py-2 font-medium">Receita</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((row) => (
                  <tr key={row.source} className="border-b last:border-0">
                    <td className="px-4 py-2">{row.source}</td>
                    <td className="px-4 py-2 text-right">{row.sales}</td>
                    <td className="px-4 py-2 text-right">R$ {row.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
