import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY } from "./company";
import { formatNAD, formatDate } from "./format";
import type { ScheduleResult } from "./loan-math";

export interface SchedulePdfMeta {
  title: string;
  subtitle?: string;
  customerName?: string;
  applicationNumber?: string;
  loanNumber?: string;
  productName?: string;
  principal: number;
  annualRatePercent: number;
  termMonths: number;
  frequency: string;
  method: string;
  startDate: Date;
}

export function generateSchedulePdf(meta: SchedulePdfMeta, schedule: ScheduleResult): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFontSize(16).setFont("helvetica", "bold");
  doc.text(COMPANY.name, 40, y);
  doc.setFontSize(9).setFont("helvetica", "normal");
  doc.text(`Reg: ${COMPANY.registrationNumber}`, 40, y + 14);
  doc.text(`Bank: ${COMPANY.bank.name}, ${COMPANY.bank.branchName} (${COMPANY.bank.branchCode})`, 40, y + 26);

  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text(meta.title, pageWidth - 40, y, { align: "right" });
  if (meta.subtitle) {
    doc.setFontSize(9).setFont("helvetica", "normal");
    doc.text(meta.subtitle, pageWidth - 40, y + 14, { align: "right" });
  }

  y += 56;

  const summary: Array<[string, string]> = [
    ["Customer", meta.customerName ?? "—"],
    ["Product", meta.productName ?? "—"],
    ["Application #", meta.applicationNumber ?? "—"],
    ["Loan #", meta.loanNumber ?? "—"],
    ["Principal", formatNAD(meta.principal)],
    ["Interest rate", `${meta.annualRatePercent}% p.a. (${meta.method === "reducing_balance" ? "reducing balance" : "flat"})`],
    ["Term", `${meta.termMonths} months / ${schedule.numPeriods} ${meta.frequency} instalments`],
    ["First due", formatDate(schedule.rows[0]?.dueDate)],
    ["Maturity", formatDate(schedule.maturityDate)],
    ["Instalment", formatNAD(schedule.instalment)],
    ["Total interest", formatNAD(schedule.totalInterest)],
    ["Total repayable", formatNAD(schedule.totalRepayable)],
  ];

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    body: summary,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 120 }, 1: { cellWidth: 340 } },
  });

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16,
    head: [["#", "Due date", "Principal", "Interest", "Instalment", "Balance"]],
    body: schedule.rows.map((r) => [
      r.seq,
      formatDate(r.dueDate),
      formatNAD(r.principal),
      formatNAD(r.interest),
      formatNAD(r.instalment),
      formatNAD(r.balance),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      0: { halign: "right", cellWidth: 30 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(120);
    doc.text(
      `${COMPANY.name}  ·  Generated ${formatDate(new Date())}  ·  Page ${i} of ${pages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
    doc.setTextColor(0);
  }

  return doc;
}
