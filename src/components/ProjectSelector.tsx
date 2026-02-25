import { useState } from "react";
import { useAccount } from "@/hooks/useAccount";
import { ChevronDown, FolderOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function ProjectSelector({ avatarUrl }: { avatarUrl?: string | null }) {
  const { accounts, activeAccount, setActiveAccountId } = useAccount();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-sm transition-colors">
          <div className="h-7 w-7 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <span className="truncate text-sm font-medium flex-1 text-left">{activeAccount?.name || "Conta"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
