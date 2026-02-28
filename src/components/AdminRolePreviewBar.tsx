import { Eye, X } from "lucide-react";
import { useRolePreview, PreviewRole } from "@/hooks/useRolePreview";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: { value: PreviewRole; label: string }[] = [
  { value: "real", label: "Admin (real)" },
  { value: "member", label: "Membro" },
  { value: "viewer", label: "Visualizador" },
];

export default function AdminRolePreviewBar() {
  const { previewRole, setPreviewRole, isPreviewActive } = useRolePreview();

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
      isPreviewActive
        ? "bg-amber-500 text-amber-950"
        : "bg-primary/90 text-primary-foreground"
    )}>
      <Eye className="h-4 w-4" />
      <span>Visualizando como:</span>
      <div className="flex items-center gap-1 bg-black/10 rounded-lg p-0.5">
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPreviewRole(opt.value)}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-semibold transition-all",
              previewRole === opt.value
                ? "bg-white text-foreground shadow-sm"
                : "text-current hover:bg-white/20"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {isPreviewActive && (
        <button
          onClick={() => setPreviewRole("real")}
          className="ml-2 p-1 rounded hover:bg-black/10 transition-colors"
          title="Voltar ao modo real"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
