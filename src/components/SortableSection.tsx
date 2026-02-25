import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  id: string;
  editMode: boolean;
  children: ReactNode;
}

export function SortableSection({ id, editMode, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {editMode && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-2 top-3 z-10 p-1 rounded bg-muted/80 border border-border/50 cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
          aria-label="Arrastar seção"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      <div className={editMode ? "ring-1 ring-primary/20 rounded-xl" : ""}>
        {children}
      </div>
    </div>
  );
}
