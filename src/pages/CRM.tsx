import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus, UserPlus } from "lucide-react";
import { useCRM } from "@/hooks/useCRM";
import ListView from "@/components/crm/ListView";
import KanbanView from "@/components/crm/KanbanView";
import LeadDetailPanel from "@/components/crm/LeadDetailPanel";
import CreateLeadModal from "@/components/crm/CreateLeadModal";
import { cn } from "@/lib/utils";

export default function CRM() {
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { leads, isLoading } = useCRM();

  return (
    <DashboardLayout
      title="CRM & Pipeline"
      subtitle="Gerencie seus leads e funil de vendas"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("kanban")}
              className={cn("p-1.5 transition-colors", view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setView("list")}
              className={cn("p-1.5 transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 text-xs">
            <UserPlus className="h-3.5 w-3.5" /> Novo Lead
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : view === "kanban" ? (
        <KanbanView onSelectLead={setSelectedLead} />
      ) : (
        <ListView leads={leads} onSelectLead={setSelectedLead} />
      )}

      {selectedLead && (
        <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}

      <CreateLeadModal open={showCreate} onOpenChange={setShowCreate} />
    </DashboardLayout>
  );
}
