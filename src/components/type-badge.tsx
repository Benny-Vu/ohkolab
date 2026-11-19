import { useDisplayName } from "@/data/display-names";
import { TYPE_COLORS } from "@/lib/type-colors";
import { cn } from "@/lib/utils";
import type { TypeName } from "@/types/pokemon";

interface TypeBadgeProps {
  type: TypeName;
  size?: "sm" | "md";
  className?: string;
}

/** Coloured pill showing a Pokémon type. */
export function TypeBadge({ type, size = "md", className }: TypeBadgeProps) {
  const displayName = useDisplayName();
  return (
    <span
      className={cn(
        "inline-flex w-16 shrink-0 items-center justify-center rounded-md px-1 text-xs font-semibold tracking-wide text-white uppercase",
        size === "sm" && "h-4",
        size === "md" && "h-5",
        className,
      )}
      style={{ backgroundColor: TYPE_COLORS[type] }}
    >
      {displayName("type", type)}
    </span>
  );
}
