import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCsv, exportToExcel, exportToPdf } from "@/lib/export";
import { toast } from "sonner";

interface Props {
  data: Record<string, any>[];
  filename: string;
  title: string;
  kpis?: { label: string; value: string }[];
  size?: "sm" | "default";
  /** CSS selector of the DOM element to capture as a visual PDF snapshot */
  snapshotSelector?: string;
}

async function exportSnapshotPdf(selector: string, filename: string) {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) { toast.error("Elemento não encontrado para exportação"); return; }

  toast.info("Gerando PDF…", { duration: 5000 });

  const html2canvas = (await import("html2canvas")).default;
  const { default: jsPDF } = await import("jspdf");

  // Collect vertical breakpoints from direct children (section boundaries)
  const children = Array.from(el.children) as HTMLElement[];
  const elRect = el.getBoundingClientRect();
  const breakPoints: number[] = []; // pixel offsets from top of el
  children.forEach((child) => {
    const r = child.getBoundingClientRect();
    breakPoints.push(r.top - elRect.top);
  });
  breakPoints.push(el.scrollHeight);

  // Capture at 2x for quality
  const scale = 2;
  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: "#0f0f12",
    logging: false,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });

  const imgW = canvas.width;
  const imgH = canvas.height;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pw - margin * 2;
  const usableH = ph - margin * 2;

  // Pixels per mm in the scaled canvas
  const pxPerMm = imgW / usableW;
  const pageHeightPx = usableH * pxPerMm;

  // Build page slices using breakpoints to avoid cutting sections
  const scaledBreaks = breakPoints.map(bp => bp * scale);
  const slices: { srcY: number; srcH: number }[] = [];
  let currentY = 0;

  while (currentY < imgH) {
    let idealEnd = currentY + pageHeightPx;

    if (idealEnd >= imgH) {
      slices.push({ srcY: currentY, srcH: imgH - currentY });
      break;
    }

    // Find the closest breakpoint that doesn't exceed idealEnd
    let bestBreak = idealEnd;
    for (const bp of scaledBreaks) {
      if (bp > currentY + 10 && bp <= idealEnd) {
        bestBreak = bp;
      }
    }

    // If no good break found, just use idealEnd
    slices.push({ srcY: currentY, srcH: bestBreak - currentY });
    currentY = bestBreak;
  }

  // Render each slice to a page
  slices.forEach((slice, i) => {
    if (i > 0) doc.addPage();
    doc.setFillColor(15, 15, 18);
    doc.rect(0, 0, pw, ph, "F");

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = imgW;
    sliceCanvas.height = slice.srcH;
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, slice.srcY, imgW, slice.srcH, 0, 0, imgW, slice.srcH);

    const destH = (slice.srcH / pxPerMm);
    doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, usableW, destH);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 85);
    doc.text(`Nexus Metrics — Página ${i + 1}/${slices.length}`, pw / 2, ph - 4, { align: "center" });
  });

  const { formatDateForFilename } = await import("@/lib/csv");
  doc.save(`${filename}_${formatDateForFilename()}.pdf`);
  toast.success("PDF exportado!");
}

export default function ExportMenu({ data, filename, title, kpis, size = "sm", snapshotSelector }: Props) {
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
        <DropdownMenuItem
          onClick={() =>
            snapshotSelector
              ? exportSnapshotPdf(snapshotSelector, filename)
              : exportToPdf(data, filename, title, kpis)
          }
          className="text-xs gap-2 cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
