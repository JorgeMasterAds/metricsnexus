import { useState, useCallback } from "react";
import { Plus, MoreHorizontal, Trash2, Edit2, GripVertical, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCRM } from "@/hooks/useCRM";
import { cn } from "@/lib/utils";

interface Props {
  onSelectLead: (lead: any) => void;
  pipelineId: string | null;
  stages: any[];
}

function InlineLeadForm({ stageId, onClose }: { stageId: string; onClose: () => void }) {
  const { createLead } = useCRM();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    createLead.mutate({ name: name.trim(), phone: phone.trim() || undefined });
    onClose();
  };

  return (
    <div className="p-2 rounded-lg border border-primary/30 bg-card space-y-2">
      <Input placeholder="Nome do lead..." value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()} autoFocus className="text-xs h-8" />
      <Input placeholder="Telefone (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()} className="text-xs h-8" />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={handleSubmit} className="text-xs h-7 flex-1">Criar</Button>
        <Button size="sm" variant="outline" onClick={onClose} className="text-xs h-7">✕</Button>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  leads,
  onSelectLead,
  onDropLead,
  onDragColumnStart,
  onDragColumnOver,
  onDragColumnDrop,
  columnIndex,
}: {
  stage: any;
  leads: any[];
  onSelectLead: (l: any) => void;
  onDropLead: (e: React.DragEvent, stageId: string, stageName: string) => void;
  onDragColumnStart: (e: React.DragEvent, index: number) => void;
  onDragColumnOver: (e: React.DragEvent, index: number) => void;
  onDragColumnDrop: (e: React.DragEvent, index: number) => void;
  columnIndex: number;
}) {
  const { deleteStage, updateStage } = useCRM();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(stage.name);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [isOverColumn, setIsOverColumn] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        // Only drag column if grip handle was used
        if ((e.target as HTMLElement).closest("[data-column-grip]")) {
          e.dataTransfer.setData("columnIndex", String(columnIndex));
          e.dataTransfer.effectAllowed = "move";
        } else {
          e.preventDefault();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const hasColumn = e.dataTransfer.types.includes("columnindex");
        const hasLead = e.dataTransfer.types.includes("leadid");
        if (hasColumn) {
          onDragColumnOver(e, columnIndex);
        }
        if (hasLead) {
          setIsOverColumn(true);
        }
      }}
      onDragLeave={() => setIsOverColumn(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOverColumn(false);
        const colIdx = e.dataTransfer.getData("columnIndex");
        if (colIdx !== "") {
          onDragColumnDrop(e, columnIndex);
          return;
        }
        onDropLead(e, stage.id, stage.name);
      }}
      className={cn(
        "flex-shrink-0 w-[280px] bg-muted/20 rounded-xl border border-border/50 flex flex-col max-h-[calc(100vh-260px)] transition-all",
        isOverColumn && "ring-2 ring-primary/50"
      )}
    >
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div data-column-grip className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
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
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowInlineCreate(true)}>
            <UserPlus className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 bg-popover border border-border shadow-lg">
              <DropdownMenuItem onClick={() => setEditingName(true)}>
                <Edit2 className="h-3.5 w-3.5 mr-2" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteStage.mutate(stage.id)} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {showInlineCreate && (
          <InlineLeadForm stageId={stage.id} onClose={() => setShowInlineCreate(false)} />
        )}
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => onSelectLead(lead)}
            className="p-3 rounded-lg bg-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("leadId", lead.id);
              e.stopPropagation();
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

export default function KanbanView({ onSelectLead, pipelineId, stages }: Props) {
  const { leads, moveLeadToStage, createStage, reorderStages } = useCRM();
  const [showNewStage, setShowNewStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDropLead = (e: React.DragEvent, stageId: string, stageName: string) => {
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) {
      moveLeadToStage.mutate({ leadId, stageId, stageName });
    }
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    createStage.mutate({ name: newStageName.trim(), color: "#10b981", pipelineId: pipelineId || undefined });
    setNewStageName("");
    setShowNewStage(false);
  };

  const handleColumnDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("columnIndex", String(index));
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleColumnDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData("columnIndex"));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }
    const ordered = [...stages];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    reorderStages.mutate(ordered.map((s: any) => s.id));
    setDragOverIndex(null);
  }, [stages, reorderStages]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {stages.map((stage: any, index: number) => {
        const stageLeads = leads.filter((l: any) => l.stage_id === stage.id);
        return (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={stageLeads}
            onSelectLead={onSelectLead}
            onDropLead={handleDropLead}
            onDragColumnStart={handleColumnDragStart}
            onDragColumnOver={handleColumnDragOver}
            onDragColumnDrop={handleColumnDrop}
            columnIndex={index}
          />
        );
      })}

      {/* Unassigned leads column */}
      {leads.some((l: any) => !l.stage_id) && (
        <div className="flex-shrink-0 w-[280px] bg-muted/10 rounded-xl border border-dashed border-border/50 flex flex-col max-h-[calc(100vh-260px)]">
          <div className="p-3 border-b border-border/30">
            <span className="text-sm font-medium text-muted-foreground">Sem etapa</span>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 ml-2">{leads.filter((l: any) => !l.stage_id).length}</span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {leads.filter((l: any) => !l.stage_id).map((lead: any) => (
              <div key={lead.id} onClick={() => onSelectLead(lead)}
                className="p-3 rounded-lg bg-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                draggable onDragStart={(e) => { e.dataTransfer.setData("leadId", lead.id); }}>
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
