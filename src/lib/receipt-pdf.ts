import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY } from "./company";
import { formatNAD, formatDate, formatDateTime } from "./format";

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

export function generateReceiptPdf(meta: ReceiptPdfMeta): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFontSize(15).setFont("helvetica", "bold");
  doc.text(COMPANY.name, 32, y);
  doc.setFontSize(8).setFont("helvetica", "normal");
  doc.text(`Reg: ${COMPANY.registrationNumber}`, 32, y + 13);
  doc.text(
    `Bank: ${COMPANY.bank.name}, ${COMPANY.bank.branchName} (${COMPANY.bank.branchCode})`,
    32,
    y + 24,
  );

  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", pageWidth - 32, y, { align: "right" });
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text(meta.receiptNumber, pageWidth - 32, y + 14, { align: "right" });
  doc.text(formatDate(meta.paidOn), pageWidth - 32, y + 26, { align: "right" });

  y += 50;
  doc.setDrawColor(220).line(32, y, pageWidth - 32, y);
  y += 20;

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
    styles: { fontSize: 9, cellPadding: 4 },
    body: rows,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 120 }, 1: { cellWidth: 260 } },
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

  finalY += 24;
  doc.setDrawColor(220).line(32, finalY, pageWidth - 32, finalY);
  finalY += 16;
  doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(120);
  doc.text(
    `Recorded by ${meta.recordedByEmail ?? "—"} · Generated ${formatDateTime(new Date())}`,
    32,
    finalY,
  );
  doc.text(`${COMPANY.name} · This receipt is computer-generated.`, 32, finalY + 12);
  doc.setTextColor(0);

  return doc;
}
