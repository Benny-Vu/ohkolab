import { TYPE_COLORS } from "@/lib/type-colors";
import { cn } from "@/lib/utils";
import type { TypeName } from "@/types/pokemon";

interface TypeBadgeProps {
  type: TypeName;
  className?: string;
}

/** Coloured pill showing a Pokémon type. */
export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-14 items-center justify-center rounded px-1.5 text-[11px] font-semibold tracking-wide text-white uppercase",
        className,
      )}
      style={{ backgroundColor: TYPE_COLORS[type] }}
    >
      {type}
    </span>
  );
}
