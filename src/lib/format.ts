/**
 * Format a number as Namibian Dollars (N$).
 */
export function formatNAD(amount: number | null | undefined, opts?: { compact?: boolean }): string {
  const n = typeof amount === "number" && isFinite(amount) ? amount : 0;
  if (opts?.compact && Math.abs(n) >= 10_000) {
    return "N$ " + new Intl.NumberFormat("en-NA", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return "N$ " + new Intl.NumberFormat("en-NA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-NA").format(typeof n === "number" && isFinite(n) ? n : 0);
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-NA", { year: "numeric", month: "short", day: "2-digit" });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-NA", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
