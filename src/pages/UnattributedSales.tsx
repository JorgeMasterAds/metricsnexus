import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DateFilter, { DateRange, getDefaultDateRange } from "@/components/DateFilter";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/csv";

export default function UnattributedSales() {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);

  const since = dateRange.from.toISOString();
  const until = dateRange.to.toISOString();

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ["unattributed", since, until],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversions")
        .select("*")
        .is("click_id", null)
        .gte("created_at", since)
        .lte("created_at", until)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const total = conversions.reduce((s, c: any) => s + Number(c.amount), 0);

  return (
    <DashboardLayout
      title="Vendas Não Atribuídas"
      subtitle="Conversões sem click_id associado"
      actions={<DateFilter value={dateRange} onChange={setDateRange} />}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {conversions.length} vendas · R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => exportToCsv(conversions.map((c: any) => ({
            transaction_id: c.transaction_id,
            platform: c.platform,
            product: c.product_name,
            amount: c.amount,
            status: c.status,
            paid_at: c.paid_at,
          })), "unattributed-sales")}
        >
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <div className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : conversions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Nenhuma venda não atribuída no período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Plataforma</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Produto</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Transaction ID</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/20 hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{new Date(c.paid_at || c.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-5 py-3 text-xs capitalize font-medium">{c.platform}</td>
                    <td className="px-5 py-3 text-xs">{c.product_name || "—"}</td>
                    <td className="px-5 py-3 text-xs font-mono text-muted-foreground">{c.transaction_id}</td>
                    <td className="text-right px-5 py-3 text-xs font-mono">R$ {Number(c.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "approved" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                        {c.status}
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
