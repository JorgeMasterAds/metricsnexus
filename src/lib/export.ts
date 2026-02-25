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
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawPageBackground = () => {
    doc.setFillColor(15, 15, 18);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
  };

  // First page background
  drawPageBackground();

  // Logo text "Nexus Metrics"
  doc.setFontSize(18);
  doc.setTextColor(220, 50, 50);
  doc.text("Nexus", 14, 16);
  const nexusWidth = doc.getTextWidth("Nexus");
  doc.setTextColor(255, 255, 255);
  doc.text(" Metrics", 14 + nexusWidth, 16);

  // Title
  doc.setFontSize(14);
  doc.setTextColor(240, 240, 240);
  doc.text(title, 14, 26);

  // Date
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
    pageWidth - 14,
    16,
    { align: "right" }
  );

  // Red separator line
  doc.setDrawColor(200, 40, 40);
  doc.setLineWidth(0.5);
  doc.line(14, 30, pageWidth - 14, 30);

  let startY = 35;

  // KPIs
  if (kpis && kpis.length > 0) {
    const kpiWidth = (pageWidth - 28 - (kpis.length - 1) * 4) / kpis.length;
    kpis.forEach((k, i) => {
      const x = 14 + i * (kpiWidth + 4);
      doc.setFillColor(28, 28, 32);
      doc.roundedRect(x, startY, kpiWidth, 16, 2, 2, "F");
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 150);
      doc.text(k.label.toUpperCase(), x + 4, startY + 6);
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(k.value, x + 4, startY + 13);
    });
    startY += 22;
  }

  // Group data by "seção" column for separate tables
  const sections = new Map<string, Record<string, any>[]>();
  data.forEach((row) => {
    const sectionName = row["seção"] || "Dados";
    if (!sections.has(sectionName)) sections.set(sectionName, []);
    sections.get(sectionName)!.push(row);
  });

  if (sections.size <= 1 && !data[0]?.["seção"]) {
    sections.clear();
    sections.set("Dados", data);
  }

  for (const [sectionName, sectionData] of sections) {
    if (sectionData.length === 0) continue;

    // Check if near bottom, add page if needed
    if (startY > pageHeight - 40) {
      doc.addPage();
      drawPageBackground();
      startY = 20;
    }

    // Section title
    doc.setFontSize(11);
    doc.setTextColor(220, 50, 50);
    doc.text(sectionName, 14, startY + 4);
    startY += 8;

    const headers = Object.keys(sectionData[0]).filter((h) => h !== "seção");
    const body = sectionData.map((row) => headers.map((h) => String(row[h] ?? "")));

    autoTable(doc, {
      startY,
      head: [headers],
      body,
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [230, 230, 235],
        fillColor: [15, 15, 18],
        lineColor: [45, 45, 50],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [200, 40, 40],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [22, 22, 26],
      },
      margin: { left: 14, right: 14 },
      willDrawPage: () => {
        // Draw background BEFORE content on new pages
        drawPageBackground();
      },
      didDrawPage: () => {
        // Footer on every page
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 85);
        doc.text("Nexus Metrics — Relatório exportado automaticamente", pageWidth / 2, pageHeight - 8, { align: "center" });
      },
    });

    startY = (doc as any).lastAutoTable?.finalY + 10 || startY + 30;
  }

  doc.save(`${filename}_${formatDateForFilename()}.pdf`);
}
