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

/**
 * HP bar for a damage result: the HP left after the maximum roll in the
 * foreground colour, the damage range in orange diagonal stripes, the rest
 * of the track muted.
 */
export function DamageMeter({
  minPercent,
  maxPercent,
  hpPercent,
  size = "md",
  className,
}: DamageMeterProps) {
  const damage = Math.max(0, Math.min(100, maxPercent));
  const remaining = Math.max(0, Math.min(hpPercent - damage, 100));
  const track = Math.max(0, 100 - remaining - damage);

  return (
    <div
      role="img"
      aria-label={`HP left after the hit: ${Math.max(0, Math.round(hpPercent - damage))} to ${Math.max(0, Math.round(hpPercent - minPercent))} percent`}
      className={cn(
        "flex w-full overflow-hidden rounded-sm bg-muted",
        HEIGHTS[size],
        className,
      )}
    >
      <div
        className="h-full bg-foreground"
        style={{ width: `${remaining}%` }}
      />
      <div
        className="h-full flex-1"
        style={{
          width: `${damage}%`,
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--damage-2hko) 0 4px, transparent 4px 8px)",
        }}
      />
      <div className="h-full flex-1" style={{ width: `${track}%` }} />
    </div>
  );
}
