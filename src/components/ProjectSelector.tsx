import { useState } from "react";
import { useProject } from "@/hooks/useProject";
import { ChevronDown, Plus, FolderOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ProjectSelector() {
  const { projects, activeProject, setActiveProjectId, createProject } = useProject();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProject(newName.trim());
      setNewName("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent text-sm transition-colors max-w-[180px]">
          <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate text-xs font-medium">{activeProject?.name || "Projeto"}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-popover border border-border z-50" align="start">
        <div className="space-y-1 mb-2">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => { setActiveProjectId(p.id); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                p.id === activeProject?.id
                  ? "gradient-bg text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="border-t border-border/50 pt-2 space-y-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do novo projeto"
            className="text-xs h-8"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button
            size="sm"
            className="w-full text-xs h-7 gradient-bg border-0 text-primary-foreground"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
          >
            <Plus className="h-3 w-3 mr-1" /> Criar projeto
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
