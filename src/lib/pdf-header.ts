import type jsPDF from "jspdf";
import { COMPANY } from "./company";
import { formatDateTime } from "./format";

// -----------------------------------------------------------------------------
// Company logo loader — fetched once from /brand/faima-mark-256.png and cached
// as a data URL so jsPDF can embed it into every generated document.
// -----------------------------------------------------------------------------

const LOGO_URL = "/brand/faima-mark-256.png";
let logoPromise: Promise<string | null> | null = null;

export function loadCompanyLogo(): Promise<string | null> {
  if (logoPromise) return logoPromise;
  if (typeof window === "undefined") {
    logoPromise = Promise.resolve(null);
    return logoPromise;
  }
  logoPromise = fetch(LOGO_URL)
    .then((r) => (r.ok ? r.blob() : null))
    .then(
      (blob) =>
        new Promise<string | null>((resolve) => {
          if (!blob) return resolve(null);
          const reader = new FileReader();
          reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        }),
    )
    .catch(() => null);
  return logoPromise;
}

// Kick off loading as early as possible.
if (typeof window !== "undefined") void loadCompanyLogo();

// -----------------------------------------------------------------------------
// Shared header / footer drawn on every company document.
// -----------------------------------------------------------------------------

export interface DocumentHeaderOptions {
  title: string;
  subtitle?: string;
  logoDataUrl?: string | null;
  /** Left margin in pt. Defaults to 40. */
  marginX?: number;
  /** Top y-coordinate in pt. Defaults to 40. */
  startY?: number;
  /** Height in pt reserved for the logo. Defaults to 44. */
  logoSize?: number;
}

/**
 * Draws the standard company header (logo + name + registration + bank) on the
 * top-left, with the document title on the top-right. Returns the y-coordinate
 * where document body content should start.
 */
export function drawDocumentHeader(doc: jsPDF, opts: DocumentHeaderOptions): number {
  const marginX = opts.marginX ?? 40;
  const y = opts.startY ?? 40;
  const logoSize = opts.logoSize ?? 44;
  const pageWidth = doc.internal.pageSize.getWidth();

  let textX = marginX;
  if (opts.logoDataUrl) {
    try {
      doc.addImage(opts.logoDataUrl, "PNG", marginX, y - 4, logoSize, logoSize);
      textX = marginX + logoSize + 12;
    } catch {
      // Ignore image failures — the header still renders without the logo.
    }
  }

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(14).setFont("helvetica", "bold");
  doc.text(COMPANY.name, textX, y + 10);
  doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(90);
  doc.text(`${COMPANY.tagline} · Reg. ${COMPANY.registrationNumber}`, textX, y + 22);
  doc.text(
    `Bank: ${COMPANY.bank.name} · ${COMPANY.bank.branchName} (${COMPANY.bank.branchCode})`,
    textX,
    y + 33,
  );
  doc.setTextColor(0);

  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.text(opts.title, pageWidth - marginX, y + 10, { align: "right" });
  if (opts.subtitle) {
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(90);
    doc.text(opts.subtitle, pageWidth - marginX, y + 24, { align: "right" });
    doc.setTextColor(0);
  }

  // Divider line
  const dividerY = y + logoSize + 6;
  doc.setDrawColor(220).setLineWidth(0.5).line(marginX, dividerY, pageWidth - marginX, dividerY);

  return dividerY + 14;
}

/**
 * Draws a footer with "Company · Generated at · Page X of Y" on every page.
 * Call this AFTER all content has been rendered.
 */
export function drawDocumentFooter(doc: jsPDF, marginX = 40): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  const generated = formatDateTime(new Date());
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(230).setLineWidth(0.5).line(marginX, pageHeight - 34, pageWidth - marginX, pageHeight - 34);
    doc.setFontSize(7.5).setFont("helvetica", "normal").setTextColor(120);
    doc.text(`${COMPANY.name} · ${COMPANY.tagline}`, marginX, pageHeight - 20);
    doc.text(`Generated ${generated}`, pageWidth / 2, pageHeight - 20, { align: "center" });
    doc.text(`Page ${i} of ${total}`, pageWidth - marginX, pageHeight - 20, { align: "right" });
    doc.setTextColor(0);
  }
}
