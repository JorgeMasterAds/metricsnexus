import { useState } from "react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Plus, MoreHorizontal, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCRM } from "@/hooks/useCRM";
import { cn } from "@/lib/utils";

interface Props {
  onSelectLead: (lead: any) => void;
}

function DroppableColumn({ stage, leads, onSelectLead }: { stage: any; leads: any[]; onSelectLead: (l: any) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const { deleteStage } = useCRM();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(stage.name);
  const { updateStage } = useCRM();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[280px] bg-muted/20 rounded-xl border border-border/50 flex flex-col max-h-[calc(100vh-220px)]",
        isOver && "ring-2 ring-primary/50"
      )}
    >
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          {editingName ? (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => { updateStage.mutate({ id: stage.id, name: newName }); setEditingName(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { updateStage.mutate({ id: stage.id, name: newName }); setEditingName(false); } }}
              className="h-6 text-xs w-24"
              autoFocus
            />
          ) : (
            <span className="text-sm font-medium text-foreground">{stage.name}</span>
          )}
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5">{leads.length}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingName(true)}>
              <Edit2 className="h-3.5 w-3.5 mr-2" /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteStage.mutate(stage.id)} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => onSelectLead(lead)}
            className="p-3 rounded-lg bg-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("leadId", lead.id);
            }}
          >
            {lead.source && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground mb-1.5 inline-block">
                {lead.source}
              </span>
            )}
            <p className="text-sm font-medium text-foreground">{lead.name}</p>
            {lead.phone && <p className="text-xs text-muted-foreground mt-0.5">📱 {lead.phone}</p>}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-medium text-primary">R$ {Number(lead.total_value || 0).toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
            {lead.lead_tag_assignments?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {lead.lead_tag_assignments.slice(0, 3).map((a: any) => (
                  <span key={a.tag_id} className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ borderColor: a.lead_tags?.color + "50", color: a.lead_tags?.color }}>
                    {a.lead_tags?.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KanbanView({ onSelectLead }: Props) {
  const { leads, stages, moveLeadToStage, createStage } = useCRM();
  const [showNewStage, setShowNewStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  const handleDrop = (e: React.DragEvent, stageId: string, stageName: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) {
      moveLeadToStage.mutate({ leadId, stageId, stageName });
    }
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    createStage.mutate({ name: newStageName.trim(), color: "#10b981" });
    setNewStageName("");
    setShowNewStage(false);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {stages.map((stage: any) => {
        const stageLeads = leads.filter((l: any) => l.stage_id === stage.id);
        return (
          <div
            key={stage.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, stage.id, stage.name)}
          >
            <DroppableColumn stage={stage} leads={stageLeads} onSelectLead={onSelectLead} />
          </div>
        );
      })}

      {/* Unassigned leads column */}
      {leads.some((l: any) => !l.stage_id) && (
        <div className="flex-shrink-0 w-[280px] bg-muted/10 rounded-xl border border-dashed border-border/50 flex flex-col max-h-[calc(100vh-220px)]">
          <div className="p-3 border-b border-border/30">
            <span className="text-sm font-medium text-muted-foreground">Sem etapa</span>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 ml-2">{leads.filter((l: any) => !l.stage_id).length}</span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {leads.filter((l: any) => !l.stage_id).map((lead: any) => (
              <div key={lead.id} onClick={() => onSelectLead(lead)}
                className="p-3 rounded-lg bg-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors">
                <p className="text-sm font-medium">{lead.name}</p>
                <span className="text-xs text-primary">R$ {Number(lead.total_value || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add stage button */}
      <div className="flex-shrink-0 w-[280px]">
        {showNewStage ? (
          <div className="p-3 rounded-xl border border-dashed border-primary/30 space-y-2">
            <Input placeholder="Nome da etapa..." value={newStageName} onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStage()} autoFocus className="text-sm" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddStage} className="text-xs">Criar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewStage(false)} className="text-xs">Cancelar</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewStage(true)}
            className="w-full h-12 rounded-xl border border-dashed border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Nova etapa
          </button>
        )}
      </div>
    </div>
  );
}
