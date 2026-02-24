import { useState } from "react";
import { useAccount } from "@/hooks/useAccount";
import { ChevronDown, FolderOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function ProjectSelector() {
  const { accounts, activeAccount, setActiveAccountId } = useAccount();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent text-sm transition-colors max-w-[180px]">
          <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate text-xs font-medium">{activeAccount?.name || "Conta"}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-popover border border-border z-50" align="start">
        <div className="space-y-1">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => { setActiveAccountId(a.id); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                a.id === activeAccount?.id
                  ? "gradient-bg text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
