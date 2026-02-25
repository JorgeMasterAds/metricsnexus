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

  toast.info("Gerando PDF…", { duration: 3000 });

  const html2canvas = (await import("html2canvas")).default;
  const { default: jsPDF } = await import("jspdf");

  // Capture at 2x for quality
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#0f0f12",
    logging: false,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgW = canvas.width;
  const imgH = canvas.height;

  // Use landscape A4, fit content width to page
  const doc = new jsPDF({
    orientation: imgW > imgH ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pw - margin * 2;

  const ratio = imgH / imgW;
  const scaledH = usableW * ratio;

  // If content fits in one page
  if (scaledH <= ph - margin * 2) {
    doc.setFillColor(15, 15, 18);
    doc.rect(0, 0, pw, ph, "F");
    doc.addImage(imgData, "PNG", margin, margin, usableW, scaledH);
  } else {
    // Multi-page: slice the canvas into page-sized chunks
    const pageContentH = ph - margin * 2;
    const srcSliceH = (pageContentH / scaledH) * imgH;
    let srcY = 0;
    let pageIdx = 0;

    while (srcY < imgH) {
      if (pageIdx > 0) doc.addPage();
      doc.setFillColor(15, 15, 18);
      doc.rect(0, 0, pw, ph, "F");

      const sliceH = Math.min(srcSliceH, imgH - srcY);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = imgW;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, srcY, imgW, sliceH, 0, 0, imgW, sliceH);

      const sliceImg = sliceCanvas.toDataURL("image/png");
      const destH = (sliceH / imgH) * scaledH;
      doc.addImage(sliceImg, "PNG", margin, margin, usableW, destH);

      srcY += sliceH;
      pageIdx++;
    }
  }

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
