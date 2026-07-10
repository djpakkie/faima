import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatNAD, formatDate, formatDateTime } from "./format";
import { drawDocumentFooter, drawDocumentHeader, loadCompanyLogo } from "./pdf-header";

export interface ReceiptPdfMeta {
  receiptNumber: string;
  paidOn: string;
  loanNumber: string;
  customerName: string;
  customerNumber: string;
  amount: number;
  penalty: number;
  method: string;
  reference?: string | null;
  notes?: string | null;
  outstandingBefore: number;
  outstandingAfter: number;
  recordedByEmail?: string | null;
}

export async function generateReceiptPdf(meta: ReceiptPdfMeta): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadCompanyLogo();

  let y = drawDocumentHeader(doc, {
    title: "PAYMENT RECEIPT",
    subtitle: `${meta.receiptNumber} · ${formatDate(meta.paidOn)}`,
    logoDataUrl: logo,
    marginX: 32,
    logoSize: 36,
  });

  const rows: Array<[string, string]> = [
    ["Customer", `${meta.customerName} (${meta.customerNumber})`],
    ["Loan #", meta.loanNumber],
    ["Method", meta.method.toUpperCase()],
    ["Reference", meta.reference?.trim() || "—"],
    ["Amount received", formatNAD(meta.amount)],
    ["Penalty included", formatNAD(meta.penalty)],
    ["Outstanding before", formatNAD(meta.outstandingBefore)],
    ["Outstanding after", formatNAD(meta.outstandingAfter)],
  ];

  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: 32, right: 32 },
    styles: { fontSize: 9, cellPadding: 4 },
    body: rows,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 120 }, 1: { cellWidth: 240 } },
  });

  let finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (meta.notes?.trim()) {
    doc.setFontSize(9).setFont("helvetica", "bold");
    doc.text("Notes", 32, finalY + 14);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(meta.notes.trim(), pageWidth - 64);
    doc.text(lines, 32, finalY + 28);
    finalY += 28 + lines.length * 11;
  }

  finalY += 20;
  doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(120);
  doc.text(
    `Recorded by ${meta.recordedByEmail ?? "—"} · ${formatDateTime(new Date())}`,
    32,
    finalY,
  );
  doc.text("This receipt is computer-generated.", 32, finalY + 11);
  doc.setTextColor(0);

  drawDocumentFooter(doc, 32);
  return doc;
}
