import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCsv, exportToExcel, exportToPdf } from "@/lib/export";

interface Props {
  data: Record<string, any>[];
  filename: string;
  title: string;
  kpis?: { label: string; value: string }[];
  size?: "sm" | "default";
}

export default function ExportMenu({ data, filename, title, kpis, size = "sm" }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => exportToCsv(data, filename)} className="text-xs gap-2 cursor-pointer">
          <Download className="h-3.5 w-3.5" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToExcel(data, filename)} className="text-xs gap-2 cursor-pointer">
          <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPdf(data, filename, title, kpis)} className="text-xs gap-2 cursor-pointer">
          <FileText className="h-3.5 w-3.5" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
