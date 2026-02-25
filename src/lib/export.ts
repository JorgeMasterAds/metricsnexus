import { exportToCsv, formatDateForFilename } from "./csv";

export { exportToCsv };

export function exportToExcel(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  
  import("xlsx").then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    
    const colWidths = Object.keys(data[0]).map((key) => {
      const maxLen = Math.max(
        key.length,
        ...data.map((row) => String(row[key] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws["!cols"] = colWidths;
    
    XLSX.writeFile(wb, `${filename}_${formatDateForFilename()}.xlsx`);
  });
}

// ─── Colors ───
const BG = [15, 15, 18] as const;
const CARD_BG = [22, 22, 28] as const;
const BORDER = [45, 45, 50] as const;
const RED = [200, 40, 40] as const;
const WHITE = [255, 255, 255] as const;
const GRAY = [140, 140, 150] as const;
const LIGHT = [230, 230, 235] as const;
const MUTED = [100, 100, 110] as const;

export async function exportToPdf(
  data: Record<string, any>[],
  filename: string,
  title: string,
  kpis?: { label: string; value: string }[]
) {
  if (data.length === 0) return;

  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const drawBg = () => { doc.setFillColor(...BG); doc.rect(0, 0, pw, ph, "F"); };
  const drawFooter = () => {
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Nexus Metrics — Relatório exportado automaticamente", pw / 2, ph - 6, { align: "center" });
  };
  const ensureSpace = (needed: number, y: number): number => {
    if (y + needed > ph - 14) {
      doc.addPage();
      drawBg();
      drawFooter();
      return 14;
    }
    return y;
  };

  // ─── Page 1 header ───
  drawBg();

  doc.setFontSize(18);
  doc.setTextColor(...RED);
  doc.text("Nexus", 14, 14);
  const nw = doc.getTextWidth("Nexus");
  doc.setTextColor(...WHITE);
  doc.text(" Metrics", 14 + nw, 14);

  doc.setFontSize(12);
  doc.setTextColor(...LIGHT);
  doc.text(title, 14, 22);

  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
    pw - 14, 14, { align: "right" }
  );

  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);
  doc.line(14, 26, pw - 26, 26);

  let y = 30;

  // ─── KPI cards (dashboard-style) ───
  if (kpis && kpis.length > 0) {
    const gap = 3;
    const kpiH = 18;
    const totalGap = (kpis.length - 1) * gap;
    const kpiW = (pw - 28 - totalGap) / kpis.length;

    kpis.forEach((k, i) => {
      const x = 14 + i * (kpiW + gap);
      // Card background
      doc.setFillColor(...CARD_BG);
      doc.roundedRect(x, y, kpiW, kpiH, 2, 2, "F");
      // Border
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, kpiW, kpiH, 2, 2, "S");
      // Label
      doc.setFontSize(6);
      doc.setTextColor(...GRAY);
      doc.text(k.label.toUpperCase(), x + 3, y + 6);
      // Value
      doc.setFontSize(11);
      doc.setTextColor(...WHITE);
      doc.text(k.value, x + 3, y + 14);
    });
    y += kpiH + 6;
  }

  // ─── Sections (tables grouped by "seção") ───
  const sections = new Map<string, Record<string, any>[]>();
  data.forEach((row) => {
    const sn = row["seção"] || "Dados";
    if (!sections.has(sn)) sections.set(sn, []);
    sections.get(sn)!.push(row);
  });

  if (sections.size <= 1 && !data[0]?.["seção"]) {
    sections.clear();
    sections.set("Dados", data);
  }

  for (const [sectionName, sectionData] of sections) {
    if (sectionData.length === 0) continue;

    y = ensureSpace(20, y);

    // Section title with red accent
    doc.setFillColor(RED[0], RED[1], RED[2]);
    doc.rect(14, y, 2, 6, "F");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(sectionName, 19, y + 5);
    y += 9;

    const headers = Object.keys(sectionData[0]).filter((h) => h !== "seção");
    const body = sectionData.map((row) => headers.map((h) => String(row[h] ?? "")));

    autoTable(doc, {
      startY: y,
      head: [headers],
      body,
      theme: "plain",
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: [...LIGHT],
        fillColor: [...BG],
        lineColor: [...BORDER],
        lineWidth: 0.15,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [35, 35, 40],
        textColor: [...WHITE],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [...CARD_BG],
      },
      margin: { left: 14, right: 14 },
      tableWidth: "auto",
      willDrawPage: () => { drawBg(); },
      didDrawPage: () => { drawFooter(); },
    });

    y = (doc as any).lastAutoTable?.finalY + 8 || y + 20;
  }

  drawFooter();
  doc.save(`${filename}_${formatDateForFilename()}.pdf`);
}
