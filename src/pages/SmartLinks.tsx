import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Copy, ExternalLink, MoreHorizontal, Pause, Play } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const mockLinks = [
  {
    id: "1",
    name: "Campanha VSL Principal",
    slug: "vsl-main",
    status: "active" as const,
    variants: [
      { id: "v1", label: "Controle", url: "https://page.com/vsl-a", weight: 50, clicks: 6420, conversions: 321, revenue: 44840 },
      { id: "v2", label: "Variante B", url: "https://page.com/vsl-b", weight: 30, clicks: 3852, conversions: 212, revenue: 29680 },
      { id: "v3", label: "Variante C", url: "https://page.com/vsl-c", weight: 20, clicks: 2568, conversions: 109, revenue: 15160 },
    ],
  },
  {
    id: "2",
    name: "Checkout Teste Preço",
    slug: "checkout-price",
    status: "active" as const,
    variants: [
      { id: "v4", label: "R$ 497", url: "https://pay.com/497", weight: 50, clicks: 4210, conversions: 252, revenue: 31494 },
      { id: "v5", label: "R$ 397", url: "https://pay.com/397", weight: 50, clicks: 4210, conversions: 169, revenue: 21126 },
    ],
  },
  {
    id: "3",
    name: "Landing Page Frio",
    slug: "lp-cold",
    status: "paused" as const,
    variants: [
      { id: "v6", label: "Original", url: "https://lp.com/v1", weight: 25, clicks: 1420, conversions: 42, revenue: 5880 },
      { id: "v7", label: "Social Proof", url: "https://lp.com/v2", weight: 25, clicks: 1420, conversions: 56, revenue: 7840 },
      { id: "v8", label: "Urgência", url: "https://lp.com/v3", weight: 25, clicks: 1420, conversions: 38, revenue: 5320 },
      { id: "v9", label: "Minimalista", url: "https://lp.com/v4", weight: 25, clicks: 1420, conversions: 34, revenue: 4760 },
    ],
  },
];

export default function SmartLinks() {
  const [expandedId, setExpandedId] = useState<string | null>("1");

  return (
    <DashboardLayout
      title="Smart Links"
      subtitle="Gerencie seus links e variantes de teste"
      actions={
        <Button size="sm" className="gradient-bg border-0 text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4 mr-1" />
          Novo Smart Link
        </Button>
      }
    >
      <div className="space-y-4">
        {mockLinks.map((link) => {
          const isExpanded = expandedId === link.id;
          const totalClicks = link.variants.reduce((s, v) => s + v.clicks, 0);
          const totalConv = link.variants.reduce((s, v) => s + v.conversions, 0);
          const bestVariant = link.variants.reduce((best, v) =>
            (v.conversions / v.clicks) > (best.conversions / best.clicks) ? v : best
          );

          return (
            <div
              key={link.id}
              className="rounded-xl bg-card border border-border/50 card-shadow overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : link.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    link.status === "active" ? "bg-success" : "bg-muted-foreground"
                  )} />
                  <div>
                    <div className="font-medium text-sm">{link.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>/{link.slug}</span>
                      <span>·</span>
                      <span>{link.variants.length} variantes</span>
                      <span>·</span>
                      <span>{totalClicks.toLocaleString()} clicks</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="hidden sm:inline font-mono">
                    {((totalConv / totalClicks) * 100).toFixed(2)}% conv.
                  </span>
                </div>
              </button>

              {/* Expanded variants */}
              {isExpanded && (
                <div className="border-t border-border/30">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/20">
                          <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Variante</th>
                          <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Peso</th>
                          <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Clicks</th>
                          <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Conv.</th>
                          <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Taxa</th>
                          <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Receita</th>
                          <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">RPV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {link.variants.map((v) => {
                          const rate = ((v.conversions / v.clicks) * 100).toFixed(2);
                          const rpv = (v.revenue / v.clicks).toFixed(2);
                          const isBest = v.id === bestVariant.id;
                          return (
                            <tr key={v.id} className={cn(
                              "border-b border-border/10 transition-colors",
                              isBest && "bg-primary/5"
                            )}>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  {isBest && <span className="h-1.5 w-1.5 rounded-full gradient-bg" />}
                                  <span className="font-medium">{v.label}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{v.url}</div>
                              </td>
                              <td className="text-right px-5 py-3 font-mono text-xs">{v.weight}%</td>
                              <td className="text-right px-5 py-3 font-mono text-xs">{v.clicks.toLocaleString()}</td>
                              <td className="text-right px-5 py-3 font-mono text-xs">{v.conversions.toLocaleString()}</td>
                              <td className={cn(
                                "text-right px-5 py-3 font-mono text-xs",
                                isBest && "text-success font-semibold"
                              )}>
                                {rate}%
                              </td>
                              <td className="text-right px-5 py-3 font-mono text-xs">R$ {(v.revenue / 1000).toFixed(1)}K</td>
                              <td className="text-right px-5 py-3 font-mono text-xs">R$ {rpv}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
