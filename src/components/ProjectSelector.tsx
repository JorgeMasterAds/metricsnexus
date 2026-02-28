import { useState, useCallback } from "react";
import { useActiveProject } from "@/hooks/useActiveProject";
import { ChevronDown, FolderOpen, GripVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAccount } from "@/hooks/useAccount";

const ORDER_KEY = "nexus_project_order";

function getStoredOrder(accountId: string): string[] {
  try {
    const raw = localStorage.getItem(`${ORDER_KEY}_${accountId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setStoredOrder(accountId: string, order: string[]) {
  localStorage.setItem(`${ORDER_KEY}_${accountId}`, JSON.stringify(order));
}

function SortableProject({ project, isActive, onSelect }: { project: any; isActive: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        onClick={onSelect}
        className={cn(
          "flex-1 text-left px-2 py-2 rounded-lg text-xs transition-colors flex items-center gap-2",
          isActive
            ? "gradient-bg text-primary-foreground"
            : "hover:bg-accent text-foreground"
        )}
      >
        <div className="h-5 w-5 rounded bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
          {project.avatar_url ? (
            <img src={project.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[9px] font-bold">{project.name?.charAt(0)?.toUpperCase()}</span>
          )}
        </div>
        {project.name}
      </button>
    </div>
  );
}

export default function ProjectSelector() {
  const { activeProject, activeProjects, selectProject } = useActiveProject();
  const { activeAccountId } = useAccount();
  const [open, setOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Sort projects by stored order
  const sortedProjects = (() => {
    if (!activeAccountId) return activeProjects;
    const order = getStoredOrder(activeAccountId);
    if (order.length === 0) return activeProjects;
    const sorted = [...activeProjects].sort((a: any, b: any) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return sorted;
  })();

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeAccountId) return;

    const ids: string[] = sortedProjects.map((p: any) => String(p.id));
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const newOrder = arrayMove(ids, oldIndex, newIndex);
    setStoredOrder(activeAccountId, newOrder);
    // Force re-render
    setOpen(prev => { setTimeout(() => setOpen(true), 0); return false; });
  }, [sortedProjects, activeAccountId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-sm transition-colors">
          <div className="h-7 w-7 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {activeProject?.avatar_url ? (
              <img src={activeProject.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <span className="truncate text-sm font-medium flex-1 text-left">{activeProject?.name || "Projeto"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-popover border border-border z-50" align="start">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-3 py-1.5">Projetos</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedProjects.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {sortedProjects.map((p: any) => (
                <SortableProject
                  key={p.id}
                  project={p}
                  isActive={p.id === activeProject?.id}
                  onSelect={() => { selectProject(p.id); setOpen(false); }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        {activeProjects.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-2">Nenhum projeto ativo</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
