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
