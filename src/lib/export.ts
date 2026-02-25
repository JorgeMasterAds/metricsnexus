import { exportToCsv } from "./csv";

export { exportToCsv };

export function exportToExcel(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  
  // Dynamic import to keep bundle size small
  import("xlsx").then((XLSX) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    
    // Auto-size columns
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

export function exportToPdf(data: Record<string, any>[], filename: string, title: string, kpis?: { label: string; value: string }[]) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  
  const kpiHtml = kpis
    ? `<div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;">${kpis.map(
        (k) => `<div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:12px 20px;min-width:140px;">
          <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${k.label}</div>
          <div style="font-size:18px;font-weight:700;color:#fff;margin-top:4px;">${k.value}</div>
        </div>`
      ).join("")}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 20mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #f5f5f5; margin: 0; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid hsl(0, 80%, 48%); padding-bottom: 16px; }
  .header h1 { font-size: 22px; color: hsl(0, 90%, 60%); margin: 0; }
  .header .date { font-size: 11px; color: #888; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: hsl(0, 80%, 48%); color: #fff; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 7px 12px; border-bottom: 1px solid #222; }
  tr:nth-child(even) { background: #111; }
  tr:hover { background: #1a1a1a; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #555; }
</style></head><body>
<div class="header">
  <h1>${title}</h1>
  <div class="date">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</div>
</div>
${kpiHtml}
<table>
  <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
  <tbody>${data.map((row) => `<tr>${headers.map((h) => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
<div class="footer">Nexus Metrics — Relatório exportado automaticamente</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      setTimeout(() => { win.print(); }, 500);
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
