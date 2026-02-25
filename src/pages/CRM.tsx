import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus, UserPlus } from "lucide-react";
import { useCRM } from "@/hooks/useCRM";
import ListView from "@/components/crm/ListView";
import KanbanView from "@/components/crm/KanbanView";
import LeadDetailPanel from "@/components/crm/LeadDetailPanel";
import CreateLeadModal from "@/components/crm/CreateLeadModal";
import CreatePipelineModal from "@/components/crm/CreatePipelineModal";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";

export default function CRM() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "kanban";
  const isListView = tab === "leads";

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const { leads, pipelines, stages, isLoading } = useCRM();

  // For kanban view, filter stages by selected pipeline
  const pipelineStages = activePipelineId
    ? stages.filter((s: any) => s.pipeline_id === activePipelineId)
    : stages;

  // Auto-select first pipeline if none selected
  if (!activePipelineId && pipelines.length > 0 && !isListView) {
    setActivePipelineId(pipelines[0].id);
  }

  return (
    <DashboardLayout
      title={isListView ? "Lista de Leads" : "CRM & Pipeline"}
      subtitle={isListView ? "Todos os leads do projeto" : "Gerencie seus pipelines e funis de vendas"}
      actions={
        <div className="flex items-center gap-2">
          {!isListView && (
            <>
              {/* Pipeline selector */}
              {pipelines.length > 1 && (
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {pipelines.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePipelineId(p.id)}
                      className={cn(
                        "px-3 py-2 text-xs font-medium transition-colors",
                        activePipelineId === p.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowPipelineModal(true)} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Novo Pipeline
              </Button>
            </>
          )}
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
      ) : isListView ? (
        <ListView leads={leads} onSelectLead={setSelectedLead} />
      ) : (
        <KanbanView
          onSelectLead={setSelectedLead}
          pipelineId={activePipelineId}
          stages={pipelineStages}
        />
      )}

      {selectedLead && (
        <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}

      <CreateLeadModal open={showCreate} onOpenChange={setShowCreate} />
      <CreatePipelineModal open={showPipelineModal} onOpenChange={setShowPipelineModal} />
    </DashboardLayout>
  );
}
