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
  snapshotSelector?: string;
}

/** Recursively collect top-edge positions of all meaningful section boundaries */
function collectBreakPoints(el: HTMLElement, rootTop: number): number[] {
  const bps: number[] = [];
  const children = Array.from(el.children) as HTMLElement[];
  for (const child of children) {
    const r = child.getBoundingClientRect();
    const top = r.top - rootTop;
    // Only add if element has meaningful height (cards, charts, tables)
    if (r.height > 30) {
      bps.push(top);
      // Also add bottom edge so we know full extent
      bps.push(top + r.height);
    }
    // Go one level deeper for grids
    if (child.children.length > 0 && child.children.length <= 20) {
      bps.push(...collectBreakPoints(child, rootTop));
    }
  }
  return [...new Set(bps)].sort((a, b) => a - b);
}

async function exportSnapshotPdf(selector: string, filename: string) {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) { toast.error("Elemento não encontrado para exportação"); return; }

  toast.info("Gerando PDF…", { duration: 8000 });

  const html2canvas = (await import("html2canvas")).default;
  const { default: jsPDF } = await import("jspdf");

  // Temporarily constrain width to produce a tighter, more compact render
  // A4 landscape is ~297x210mm. We want content to fill the page well.
  const targetWidthPx = 1100;
  const origWidth = el.style.width;
  const origMaxWidth = el.style.maxWidth;
  const origMinWidth = el.style.minWidth;
  el.style.width = `${targetWidthPx}px`;
  el.style.maxWidth = `${targetWidthPx}px`;
  el.style.minWidth = `${targetWidthPx}px`;

  // Force reflow
  el.offsetHeight;
  await new Promise(r => setTimeout(r, 200));

  // Collect breakpoints AFTER reflow
  const elRect = el.getBoundingClientRect();
  const rawBreaks = collectBreakPoints(el, elRect.top);
  const totalH = el.scrollHeight;

  const scale = 2;
  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: "#0f0f12",
    logging: false,
    width: targetWidthPx,
    windowWidth: targetWidthPx,
    windowHeight: totalH,
  });

  // Restore original styles
  el.style.width = origWidth;
  el.style.maxWidth = origMaxWidth;
  el.style.minWidth = origMinWidth;

  const imgW = canvas.width;
  const imgH = canvas.height;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 5;
  const usableW = pw - margin * 2;
  const usableH = ph - margin * 2 - 4; // 4mm for footer

  const pxPerMm = imgW / usableW;
  const pageHeightPx = usableH * pxPerMm;

  // Scale breakpoints to canvas coordinates
  const scaledBreaks = rawBreaks.map(bp => bp * scale).filter(bp => bp > 0 && bp < imgH);

  // Build slices: never cut through a section
  const slices: { srcY: number; srcH: number }[] = [];
  let currentY = 0;

  while (currentY < imgH - 5) {
    const idealEnd = currentY + pageHeightPx;

    if (idealEnd >= imgH) {
      slices.push({ srcY: currentY, srcH: imgH - currentY });
      break;
    }

    // Find the best breakpoint: the HIGHEST one that is <= idealEnd
    // but also ensure we don't cut through any element
    // Strategy: find all element top-edges, pick the last one before idealEnd
    let bestCut = currentY + pageHeightPx * 0.5; // minimum half page

    for (const bp of scaledBreaks) {
      if (bp > currentY + 20 && bp <= idealEnd) {
        // Check this is an element TOP (not bottom) so we cut between sections
        bestCut = bp;
      }
    }

    // If bestCut would leave less than 10% of page, just use idealEnd
    if (bestCut - currentY < pageHeightPx * 0.3) {
      bestCut = idealEnd;
    }

    slices.push({ srcY: currentY, srcH: bestCut - currentY });
    currentY = bestCut;
  }

  // Render
  slices.forEach((slice, i) => {
    if (i > 0) doc.addPage();
    doc.setFillColor(15, 15, 18);
    doc.rect(0, 0, pw, ph, "F");

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = imgW;
    sliceCanvas.height = Math.ceil(slice.srcH);
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, slice.srcY, imgW, slice.srcH, 0, 0, imgW, slice.srcH);

    const destH = slice.srcH / pxPerMm;
    doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, usableW, destH);

    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 85);
    doc.text(`Nexus Metrics — Página ${i + 1}/${slices.length}`, pw / 2, ph - 3, { align: "center" });
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
