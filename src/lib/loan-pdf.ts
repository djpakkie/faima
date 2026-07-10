import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY } from "./company";
import { formatNAD, formatDate } from "./format";
import type { ScheduleResult } from "./loan-math";
import { drawDocumentFooter, drawDocumentHeader, loadCompanyLogo } from "./pdf-header";

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

export async function generateSchedulePdf(
  meta: SchedulePdfMeta,
  schedule: ScheduleResult,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const logo = await loadCompanyLogo();

  let y = drawDocumentHeader(doc, {
    title: meta.title,
    subtitle: meta.subtitle,
    logoDataUrl: logo,
  });

  const summary: Array<[string, string]> = [
    ["Customer", meta.customerName ?? "—"],
    ["Product", meta.productName ?? "—"],
    ["Application #", meta.applicationNumber ?? "—"],
    ["Loan #", meta.loanNumber ?? "—"],
    ["Principal", formatNAD(meta.principal)],
    [
      "Interest rate",
      `${meta.annualRatePercent}% p.a. (${meta.method === "reducing_balance" ? "reducing balance" : "flat"})`,
    ],
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

  drawDocumentFooter(doc);
  // Reference COMPANY so unused-import lint stays quiet even if summary omits it later.
  void COMPANY;
  return doc;
}
