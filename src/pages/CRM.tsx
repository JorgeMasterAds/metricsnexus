import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, ChevronDown, Trash2, LayoutGrid, List } from "lucide-react";
import { useCRM } from "@/hooks/useCRM";
import ListView from "@/components/crm/ListView";
import KanbanView from "@/components/crm/KanbanView";
import LeadDetailPanel from "@/components/crm/LeadDetailPanel";
import CreateLeadModal from "@/components/crm/CreateLeadModal";
import CreatePipelineModal from "@/components/crm/CreatePipelineModal";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CRM() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "kanban";
  const isListView = tab === "leads";

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const { leads, pipelines, stages, isLoading, deletePipeline } = useCRM();

  // Auto-select first pipeline
  useEffect(() => {
    if (!activePipelineId && pipelines.length > 0 && !isListView) {
      setActivePipelineId(pipelines[0].id);
    }
  }, [pipelines, activePipelineId, isListView]);

  // Auto-prompt to create pipeline if none exist and not loading
  const [autoPrompted, setAutoPrompted] = useState(false);
  useEffect(() => {
    if (!isLoading && pipelines.length === 0 && !isListView && !autoPrompted) {
      setAutoPrompted(true);
      setShowPipelineModal(true);
    }
  }, [isLoading, pipelines.length, isListView, autoPrompted]);

  const pipelineStages = activePipelineId
    ? stages.filter((s: any) => s.pipeline_id === activePipelineId)
    : stages;

  const activePipeline = pipelines.find((p: any) => p.id === activePipelineId);

  const titleContent = isListView ? (
    "Lista de Leads"
  ) : (
    <div className="flex items-center gap-2">
      <span>CRM</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 border border-border hover:bg-accent transition-colors text-sm font-medium">
            {activePipeline?.name || "Selecionar Pipeline"}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 z-50 bg-popover border border-border shadow-lg">
          {pipelines.map((p: any) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setActivePipelineId(p.id)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                activePipelineId === p.id && "bg-accent"
              )}
            >
              <span>{p.name}</span>
              {pipelines.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePipeline.mutate(p.id);
                    if (activePipelineId === p.id) setActivePipelineId(null);
                  }}
                  className="text-muted-foreground hover:text-destructive p-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowPipelineModal(true)} className="cursor-pointer">
            <Plus className="h-3.5 w-3.5 mr-2" />
            Novo Pipeline
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <DashboardLayout
      title={titleContent as any}
      subtitle={isListView ? "Todos os leads do projeto" : "Gerencie seus pipelines e funis de vendas"}
      actions={
        <div className="flex items-center gap-2">
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
