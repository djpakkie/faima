import * as XLSX from "xlsx";
import { COMPANY } from "./company";
import { formatDate } from "./format";

export interface ReportDataset {
  title: string;
  subtitle?: string;
  filters?: Array<[string, string]>;
  summary?: Array<[string, string]>;
  columnHeaders: string[];
  /** Raw string rows (already formatted for display). */
  rows: string[][];
  totals?: string[];
}

function csvEscape(v: string): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportReportCsv(ds: ReportDataset, fileName: string) {
  const lines: string[] = [];
  lines.push(csvEscape(COMPANY.name));
  lines.push(csvEscape(`Reg. ${COMPANY.registrationNumber}`));
  lines.push(csvEscape(ds.title));
  if (ds.subtitle) lines.push(csvEscape(ds.subtitle));
  lines.push(csvEscape(`Generated: ${formatDate(new Date())}`));
  lines.push("");
  if (ds.filters?.length) {
    lines.push("Filters");
    for (const [k, v] of ds.filters) lines.push([k, v].map(csvEscape).join(","));
    lines.push("");
  }
  if (ds.summary?.length) {
    lines.push("Summary");
    for (const [k, v] of ds.summary) lines.push([k, v].map(csvEscape).join(","));
    lines.push("");
  }
  lines.push(ds.columnHeaders.map(csvEscape).join(","));
  for (const row of ds.rows) {
    lines.push(row.map((c) => csvEscape(String(c ?? "").replace(/\n/g, " "))).join(","));
  }
  if (ds.totals?.length) lines.push(ds.totals.map(csvEscape).join(","));

  const blob = new Blob(["\ufeff" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, fileName);
}

export function exportReportXlsx(ds: ReportDataset, fileName: string) {
  const aoa: (string | number)[][] = [];
  aoa.push([COMPANY.name]);
  aoa.push([`Reg. ${COMPANY.registrationNumber}`]);
  aoa.push([
    `${COMPANY.bank.name} · ${COMPANY.bank.branchName} · Branch ${COMPANY.bank.branchCode}`,
  ]);
  aoa.push([ds.title]);
  if (ds.subtitle) aoa.push([ds.subtitle]);
  aoa.push([`Generated: ${formatDate(new Date())}`]);
  aoa.push([]);

  if (ds.filters?.length) {
    aoa.push(["Filters"]);
    for (const [k, v] of ds.filters) aoa.push([k, v]);
    aoa.push([]);
  }
  if (ds.summary?.length) {
    aoa.push(["Summary"]);
    for (const [k, v] of ds.summary) aoa.push([k, v]);
    aoa.push([]);
  }

  aoa.push(ds.columnHeaders);
  for (const row of ds.rows) {
    aoa.push(row.map((c) => String(c ?? "").replace(/\n/g, " ")));
  }
  if (ds.totals?.length) aoa.push(ds.totals);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Auto column widths
  const colWidths = ds.columnHeaders.map((h, i) => {
    let max = h.length;
    for (const row of ds.rows) {
      const cell = String(row[i] ?? "");
      if (cell.length > max) max = cell.length;
    }
    return { wch: Math.min(Math.max(max + 2, 10), 40) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, fileName);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
