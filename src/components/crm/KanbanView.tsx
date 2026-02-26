import { useState, useCallback } from "react";
import { Plus, MoreHorizontal, Trash2, Edit2, GripVertical, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCRM } from "@/hooks/useCRM";
import { cn } from "@/lib/utils";

interface Props {
  onSelectLead: (lead: any) => void;
  pipelineId: string | null;
  stages: any[];
}

const STAGE_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function InlineLeadForm({ stageId, onClose }: { stageId: string; onClose: () => void }) {
  const { createLead } = useCRM();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    createLead.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      stageId,
    });
    onClose();
  };

  return (
    <div className="p-3 rounded-lg border border-primary/30 bg-card space-y-2">
      <Input placeholder="Nome *" value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onClose()} autoFocus className="text-xs h-8" />
      <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="text-xs h-8" />
      <Input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()} className="text-xs h-8" />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={handleSubmit} className="text-xs h-7 flex-1">Criar</Button>
        <Button size="sm" variant="outline" onClick={onClose} className="text-xs h-7">Cancelar</Button>
      </div>
    </div>
  );
}

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="h-3 w-3 rounded-full flex-shrink-0 ring-1 ring-border hover:ring-primary transition-all cursor-pointer" style={{ backgroundColor: color }} />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 z-50" align="start">
        <div className="flex flex-wrap gap-1.5 max-w-[140px]">
          {STAGE_COLORS.map((c) => (
            <button key={c} onClick={() => onChange(c)}
              className={cn("h-5 w-5 rounded-full transition-all", color === c ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "hover:scale-110")}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function KanbanColumn({
  stage, leads, onSelectLead, onDropLead, columnIndex, dragOverColumnIndex,
  onDragColumnStart, onDragColumnOverHandler, onDragColumnDrop, onDragColumnEnd,
}: {
  stage: any; leads: any[]; onSelectLead: (l: any) => void;
  onDropLead: (leadId: string, stageId: string, stageName: string) => void;
  columnIndex: number; dragOverColumnIndex: number | null;
  onDragColumnStart: (index: number) => void; onDragColumnOverHandler: (index: number) => void;
  onDragColumnDrop: (targetIndex: number) => void; onDragColumnEnd: () => void;
}) {
  const { deleteStage, updateStage } = useCRM();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(stage.name);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [isLeadDragOver, setIsLeadDragOver] = useState(false);
  const [deletingStage, setDeletingStage] = useState(false);

  const isColumnDropTarget = dragOverColumnIndex === columnIndex;

  return (
    <div
      className={cn(
        "flex-shrink-0 w-[280px] rounded-xl border flex flex-col max-h-[calc(100vh-220px)] transition-all bg-card/30",
        isLeadDragOver
          ? "border-primary ring-2 ring-primary/40 bg-primary/5"
          : isColumnDropTarget
            ? "border-accent ring-1 ring-accent/30"
            : "border-border/60"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes("text/lead-id")) {
          setIsLeadDragOver(true);
        } else if (e.dataTransfer.types.includes("text/column-index")) {
          onDragColumnOverHandler(columnIndex);
        }
      }}
      onDragLeave={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const { clientX, clientY } = e;
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
          setIsLeadDragOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsLeadDragOver(false);
        const leadId = e.dataTransfer.getData("text/lead-id");
        const colIdx = e.dataTransfer.getData("text/column-index");
        if (leadId) {
          onDropLead(leadId, stage.id, stage.name);
        } else if (colIdx !== "") {
          onDragColumnDrop(columnIndex);
        }
      }}
    >
      {/* Column header */}
      <div className="p-3 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/column-index", String(columnIndex));
              e.dataTransfer.effectAllowed = "move";
              onDragColumnStart(columnIndex);
            }}
            onDragEnd={onDragColumnEnd}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <ColorPicker
            color={stage.color}
            onChange={(c) => updateStage.mutate({ id: stage.id, color: c })}
          />
          {editingName ? (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => { updateStage.mutate({ id: stage.id, name: newName }); setEditingName(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { updateStage.mutate({ id: stage.id, name: newName }); setEditingName(false); } }}
              className="h-6 text-xs w-24" autoFocus
            />
          ) : (
            <span className="text-sm font-medium text-foreground">{stage.name}</span>
          )}
          <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{leads.length}</span>
        </div>
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
            <DropdownMenuItem onClick={() => setDeletingStage(true)} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir coluna
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lead cards */}
      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => onSelectLead(lead)}
            className="p-3 rounded-lg bg-card border border-border/60 cursor-pointer hover:border-primary/40 transition-all shadow-sm"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/lead-id", lead.id);
              e.dataTransfer.effectAllowed = "move";
              e.stopPropagation();
            }}
          >
            {lead.source && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground mb-1.5 inline-block">
                {lead.source}
              </span>
            )}
            <p className="text-sm font-medium text-foreground">{lead.name}</p>
            {lead.phone && <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}</p>}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-medium text-primary">
                R$ {Number(lead.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
            {lead.lead_tag_assignments?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {lead.lead_tag_assignments.slice(0, 3).map((a: any) => (
                  <span key={a.tag_id} className="text-[10px] px-1.5 py-0.5 rounded-full border"
                    style={{ borderColor: a.lead_tags?.color + "50", color: a.lead_tags?.color }}>
                    {a.lead_tags?.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer — Create lead button */}
      <div className="p-2 border-t border-border/30">
        {showInlineCreate ? (
          <InlineLeadForm stageId={stage.id} onClose={() => setShowInlineCreate(false)} />
        ) : (
          <button
            onClick={() => setShowInlineCreate(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 border border-dashed border-border/50 hover:border-primary/30 transition-all"
          >
            <UserPlus className="h-3.5 w-3.5" /> Criar novo lead
          </button>
        )}
      </div>

      {/* Delete stage confirmation */}
      <AlertDialog open={deletingStage} onOpenChange={setDeletingStage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coluna "{stage.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Os leads desta coluna não serão excluídos, mas ficarão sem etapa definida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteStage.mutate(stage.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function KanbanView({ onSelectLead, pipelineId, stages }: Props) {
  const { leads, moveLeadToStage, createStage, reorderStages } = useCRM();
  const [showNewStage, setShowNewStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingColumnIndex, setDraggingColumnIndex] = useState<number | null>(null);

  const sortedStages = [...stages].sort((a: any, b: any) => a.position - b.position);

  const handleDropLead = useCallback((leadId: string, stageId: string, stageName: string) => {
    moveLeadToStage.mutate({ leadId, stageId, stageName });
  }, [moveLeadToStage]);

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    createStage.mutate({ name: newStageName.trim(), color: "#10b981", pipelineId: pipelineId || undefined });
    setNewStageName("");
    setShowNewStage(false);
  };

  const handleColumnDrop = useCallback((targetIndex: number) => {
    if (draggingColumnIndex === null || draggingColumnIndex === targetIndex) {
      setDragOverIndex(null);
      setDraggingColumnIndex(null);
      return;
    }
    const ordered = [...sortedStages];
    const [moved] = ordered.splice(draggingColumnIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    reorderStages.mutate(ordered.map((s: any) => s.id));
    setDragOverIndex(null);
    setDraggingColumnIndex(null);
  }, [sortedStages, reorderStages, draggingColumnIndex]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
      {sortedStages.map((stage: any, index: number) => {
        const stageLeads = leads.filter((l: any) => l.stage_id === stage.id);
        return (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={stageLeads}
            onSelectLead={onSelectLead}
            onDropLead={handleDropLead}
            columnIndex={index}
            dragOverColumnIndex={dragOverIndex}
            onDragColumnStart={(i) => setDraggingColumnIndex(i)}
            onDragColumnOverHandler={(i) => setDragOverIndex(i)}
            onDragColumnDrop={handleColumnDrop}
            onDragColumnEnd={() => { setDraggingColumnIndex(null); setDragOverIndex(null); }}
          />
        );
      })}

      {/* Unassigned leads column */}
      {leads.some((l: any) => !l.stage_id) && (
        <div className="flex-shrink-0 w-[280px] bg-muted/10 rounded-xl border border-dashed border-border flex flex-col max-h-[calc(100vh-220px)]">
          <div className="p-3 border-b border-border/30">
            <span className="text-sm font-medium text-muted-foreground">Sem etapa</span>
            <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 ml-2">
              {leads.filter((l: any) => !l.stage_id).length}
            </span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {leads.filter((l: any) => !l.stage_id).map((lead: any) => (
              <div key={lead.id} onClick={() => onSelectLead(lead)}
                className="p-3 rounded-lg bg-card border border-border/60 cursor-pointer hover:border-primary/40 transition-all shadow-sm"
                draggable onDragStart={(e) => { e.dataTransfer.setData("text/lead-id", lead.id); e.dataTransfer.effectAllowed = "move"; }}>
                <p className="text-sm font-medium">{lead.name}</p>
                <span className="text-xs text-primary">R$ {Number(lead.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
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
            className="w-full h-12 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Nova etapa
          </button>
        )}
      </div>
    </div>
  );
}
