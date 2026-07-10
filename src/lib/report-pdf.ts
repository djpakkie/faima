import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CellHookData, RowInput, Styles } from "jspdf-autotable";
import { formatDate } from "./format";
import { drawDocumentFooter, drawDocumentHeader, loadCompanyLogo } from "./pdf-header";

export type ReportOrientation = "portrait" | "landscape";

export interface ReportColumn {
  header: string;
  /** Column width in pt. If omitted, autoTable auto-sizes. */
  width?: number;
  align?: "left" | "right" | "center";
}

export interface ReportPdfInput {
  title: string;
  subtitle?: string;
  /** Small "as-of" or filter description shown under the title block. */
  filters?: Array<[string, string]>;
  /** Key/value summary rendered before the main table. */
  summary?: Array<[string, string]>;
  columns: ReportColumn[];
  rows: RowInput[];
  /** Values (already formatted strings) rendered as the table's foot / totals row. */
  totals?: string[];
  orientation?: ReportOrientation;
  /** File name suggestion — used only for `save()` by the caller. */
  fileName?: string;
}

/**
 * Generic tabular company report with the standard header on every page,
 * an optional summary block, the data table itself, and the standard footer
 * (company + generated-at + page numbers).
 */
export async function generateReportPdf(input: ReportPdfInput): Promise<jsPDF> {
  const orientation = input.orientation ?? "portrait";
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation });
  const logo = await loadCompanyLogo();
  const marginX = 40;

  let y = drawDocumentHeader(doc, {
    title: input.title,
    subtitle: input.subtitle ?? `As of ${formatDate(new Date())}`,
    logoDataUrl: logo,
    marginX,
  });

  // Filter chips
  if (input.filters?.length) {
    doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(90);
    const line = input.filters.map(([k, v]) => `${k}: ${v}`).join("   ·   ");
    doc.text(line, marginX, y);
    doc.setTextColor(0);
    y += 14;
  }

  // Summary key/value block
  if (input.summary?.length) {
    autoTable(doc, {
      startY: y,
      theme: "plain",
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9, cellPadding: 3 },
      body: input.summary,
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 140, textColor: [55, 65, 81] },
        1: { cellWidth: "auto" },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  const columnStyles: { [key: number]: Partial<Styles> } = {};
  input.columns.forEach((col, i) => {
    const style: Partial<Styles> = {};
    if (col.width) style.cellWidth = col.width;
    if (col.align) style.halign = col.align;
    if (Object.keys(style).length) columnStyles[i] = style;
  });

  autoTable(doc, {
    startY: y,
    head: [input.columns.map((c) => c.header)],
    body: input.rows,
    foot: input.totals ? [input.totals] : undefined,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 8.5, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles,
    didParseCell: (data: CellHookData) => {
      // Apply column alignment to head + foot cells too.
      const col = input.columns[data.column.index];
      if (col?.align && (data.section === "head" || data.section === "foot")) {
        data.cell.styles.halign = col.align;
      }
    },
  });

  drawDocumentFooter(doc, marginX);
  return doc;
}
