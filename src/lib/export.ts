import { exportToCsv } from "./csv";

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
    
    XLSX.writeFile(wb, `${filename}.xlsx`);
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

  // Dark background
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

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
      doc.setFillColor(26, 26, 26);
      doc.roundedRect(x, startY, kpiWidth, 16, 2, 2, "F");
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
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

  // If no "seção" column, treat as single table
  if (sections.size <= 1 && !data[0]?.["seção"]) {
    sections.clear();
    sections.set("Dados", data);
  }

  for (const [sectionName, sectionData] of sections) {
    if (sectionData.length === 0) continue;

    // Section title
    doc.setFontSize(11);
    doc.setTextColor(220, 50, 50);
    doc.text(sectionName, 14, startY + 4);
    startY += 8;

    // Get headers excluding "seção" column
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
        textColor: [220, 220, 220],
        fillColor: [10, 10, 10],
        lineColor: [40, 40, 40],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [200, 40, 40],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [18, 18, 18],
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (pageData: any) => {
        // Black background on every page
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, pageWidth, pageH, "F");
        // Footer
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text("Nexus Metrics — Relatório exportado automaticamente", pageWidth / 2, pageH - 8, { align: "center" });
      },
    });

    // Get the final Y position after the table for the next section
    startY = (doc as any).lastAutoTable?.finalY + 10 || startY + 30;

    // If near bottom of page, add new page
    if (startY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");
      startY = 20;
    }
  }

  doc.save(`${filename}.pdf`);
}
