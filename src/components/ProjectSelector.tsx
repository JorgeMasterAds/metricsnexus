import { useState } from "react";
import { useActiveProject } from "@/hooks/useActiveProject";
import { ChevronDown, FolderOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function ProjectSelector() {
  const { activeProject, activeProjects, selectProject } = useActiveProject();
  const [open, setOpen] = useState(false);

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
        <div className="space-y-1">
          {activeProjects.map((p: any) => (
            <button
              key={p.id}
              onClick={() => { selectProject(p.id); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2",
                p.id === activeProject?.id
                  ? "gradient-bg text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              )}
            >
              <div className="h-5 w-5 rounded bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold">{p.name?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>
              {p.name}
            </button>
          ))}
          {activeProjects.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-2">Nenhum projeto ativo</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
