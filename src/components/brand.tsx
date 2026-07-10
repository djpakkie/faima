import { COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

/**
 * Faima Cash Solutions brand mark.
 * The badge is a coin motif — a nod to "cash" — with a notched F.
 * Use sparingly: sidebar header and the sign-in screen are its two homes.
 */

const SIZES = {
  sm: { badge: 28, text: "text-sm", tagline: "text-[8px]" },
  md: { badge: 36, text: "text-base", tagline: "text-[9px]" },
  lg: { badge: 52, text: "text-2xl", tagline: "text-[11px]" },
} as const;

export function CoinMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${COMPANY.brandName} mark`}
    >
      <circle cx="20" cy="20" r="19" fill="var(--brand-gold)" />
      <circle
        cx="20"
        cy="20"
        r="19"
        fill="none"
        stroke="var(--brand-gold-dark)"
        strokeWidth="1"
        opacity="0.4"
      />
      <circle
        cx="20"
        cy="20"
        r="15"
        fill="none"
        stroke="var(--sidebar)"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <path d="M14.5 12.5H26.5V16H18.5V19H25V22.5H18.5V27.5H14.5V12.5Z" fill="var(--sidebar)" />
    </svg>
  );
}

/**
 * Hero masthead for the dashboard — the redesign's signature element.
 * A dark vault-plum banner with a concentric coin-ring watermark bleeding
 * off the edge, carrying the full brand name at real weight instead of
 * a small lockup tucked into a corner.
 */
export function BrandMasthead({ className }: { className?: string }) {
  const today = new Date().toLocaleDateString("en-NA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground shadow-[var(--shadow-elev)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="xMaxYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
        aria-hidden="true"
      >
        <circle
          cx="360"
          cy="100"
          r="150"
          fill="none"
          stroke="var(--brand-gold)"
          strokeWidth="1.5"
        />
        <circle
          cx="360"
          cy="100"
          r="110"
          fill="none"
          stroke="var(--brand-gold)"
          strokeWidth="1.5"
        />
        <circle cx="360" cy="100" r="70" fill="none" stroke="var(--brand-gold)" strokeWidth="1.5" />
        <circle cx="360" cy="100" r="30" fill="var(--brand-gold)" />
      </svg>

      <div className="relative z-10 flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/55">
            <span className="inline-block h-1 w-1 rounded-full bg-brand-gold" />
            Microfinance operations
          </div>
          <div className="mt-2 flex items-center gap-3">
            <CoinMark size={40} className="shrink-0" />
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {COMPANY.brandName}
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-sidebar-foreground/65">
            {COMPANY.tagline} · Reg. {COMPANY.registrationNumber}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-wider text-sidebar-foreground/50">Today</p>
          <p className="font-display text-sm font-medium text-sidebar-foreground/90">{today}</p>
        </div>
      </div>
    </div>
  );
}

export function Logo({
  size = "md",
  showTagline = true,
  className,
  onDark = true,
}: {
  size?: keyof typeof SIZES;
  showTagline?: boolean;
  className?: string;
  onDark?: boolean;
}) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <CoinMark size={s.badge} className="shrink-0" />
      <div className="min-w-0 leading-tight">
        <div
          className={cn(
            "font-display font-semibold truncate",
            s.text,
            onDark ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          {COMPANY.shortName}
        </div>
        {showTagline && (
          <div
            className={cn(
              "truncate uppercase tracking-[0.14em]",
              s.tagline,
              onDark ? "text-sidebar-foreground/55" : "text-muted-foreground",
            )}
          >
            {COMPANY.tagline}
          </div>
        )}
      </div>
    </div>
  );
}
