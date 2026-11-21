import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";

type DamageMeterSize = "sm" | "md" | "lg";

const HEIGHTS: Record<DamageMeterSize, string> = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3.5",
};

interface DamageMeterProps {
  /** Damage range as a percentage of max HP. */
  minPercent: number;
  maxPercent: number;
  /** Defender's current HP as a percentage of max HP, 0 to 100. */
  hpPercent: number;
  size?: DamageMeterSize;
  className?: string;
}

/** Clamps a segment width into 0–100, at a hundredth of a percent. */
function clampPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

/**
 * HP bar for a damage result, left to right: the HP left after the maximum
 * roll in the foreground colour, the roll range (max − min) in orange
 * diagonal stripes, and the damage every roll does (min) muted. The widths
 * are explicit (no flex-1, nothing shrinks), so the three segments always
 * show their true share; an OHKO's overflow clips at the bar's end. The
 * segments glide from result to result (width-only transitions); the first
 * paint shows the final state.
 */
export function DamageMeter({
  minPercent,
  maxPercent,
  hpPercent,
  size = "md",
  className,
}: DamageMeterProps) {
  const t = useT();
  // The HP after the max roll, the roll range, and the guaranteed damage.
  const solid = clampPercent(hpPercent - maxPercent);
  const striped = clampPercent(maxPercent - minPercent);
  const muted = clampPercent(minPercent);

  return (
    <div
      role="img"
      aria-label={t("calc.damageMeterAria", {
        min: Math.max(0, Math.round(hpPercent - maxPercent)),
        max: Math.max(0, Math.round(hpPercent - minPercent)),
      })}
      className={cn(
        "flex w-full overflow-hidden rounded-sm bg-muted",
        HEIGHTS[size],
        className,
      )}
    >
      <div
        className="h-full shrink-0 bg-foreground transition-[width] duration-(--motion-base) ease-(--motion-ease-out)"
        style={{ width: `${solid}%` }}
      />
      <div
        className="h-full shrink-0 transition-[width] duration-(--motion-base) ease-(--motion-ease-out)"
        style={{
          width: `${striped}%`,
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--damage-2hko) 0 4px, transparent 4px 8px)",
        }}
      />
      <div
        className="h-full shrink-0 transition-[width] duration-(--motion-base) ease-(--motion-ease-out)"
        style={{ width: `${muted}%` }}
      />
    </div>
  );
}
