import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

interface Props {
  leads: any[];
  onSelectLead: (lead: any) => void;
}

export default function ListView({ leads, onSelectLead }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter((l: any) =>
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.includes(q)
    );
  }, [leads, search]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar leads..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 text-sm" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} lead(s)</span>
      </div>

      <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Valor total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Origem</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tags</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((lead: any) => (
                <tr key={lead.id} onClick={() => onSelectLead(lead)}
                  className="border-b border-border/20 hover:bg-accent/20 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{lead.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{lead.email || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{lead.phone || "—"}</td>
                  <td className="px-4 py-3 text-primary font-medium text-xs">R$ {Number(lead.total_value || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs">{lead.source || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(lead.lead_tag_assignments || []).slice(0, 3).map((a: any) => (
                        <span key={a.tag_id} className="text-[10px] px-1.5 py-0.5 rounded-full border"
                          style={{ borderColor: a.lead_tags?.color + "50", color: a.lead_tags?.color }}>
                          {a.lead_tags?.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Nenhum lead encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs gap-1">
              <ChevronLeft className="h-3.5 w-3.5" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs gap-1">
              Próxima <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
