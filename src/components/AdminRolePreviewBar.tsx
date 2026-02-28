import { Eye, ChevronDown } from "lucide-react";
import { useRolePreview, PreviewRole } from "@/hooks/useRolePreview";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_OPTIONS: { value: PreviewRole; label: string }[] = [
  { value: "real", label: "Admin (real)" },
  { value: "member", label: "Membro" },
  { value: "viewer", label: "Visualizador" },
];

export default function AdminRolePreviewBar() {
  const { previewRole, setPreviewRole, isPreviewActive } = useRolePreview();
  const currentLabel = ROLE_OPTIONS.find((o) => o.value === previewRole)?.label ?? "Admin (real)";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium",
            isPreviewActive
              ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
          title="Alternar modo de visualização"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">{isPreviewActive ? currentLabel : ""}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {ROLE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setPreviewRole(opt.value)}
            className={cn(
              "text-xs cursor-pointer",
              previewRole === opt.value && "font-semibold text-primary"
            )}
          >
            {opt.label}
            {previewRole === opt.value && <span className="ml-auto text-primary">●</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
