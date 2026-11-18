import { cn } from "@/lib/utils";

interface StatBarProps {
  /** Current value, 0 to max. */
  value: number;
  max: number;
  /** Accent fill when the stat carries Stat Points, muted otherwise. */
  tone?: "accent" | "muted";
  className?: string;
}

/**
 * Horizontal stat bar. With Stat Points the fill is the accent colour; a
 * plain stat shows muted.
 */
export function StatBar({
  value,
  max,
  tone = "muted",
  className,
}: StatBarProps) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div
      role="img"
      aria-label={`${value} of ${safeMax}`}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-sm bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-sm transition-[width] duration-150 ease-out",
          tone === "accent" ? "bg-accent-brand-text" : "bg-muted-foreground/40",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
