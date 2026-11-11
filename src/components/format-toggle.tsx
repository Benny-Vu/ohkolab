import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBattleFormat } from "@/lib/preferences";
import type { BattleFormat } from "@/types/battle";

/** Singles / doubles switch bound to the app-wide format preference. */
export function FormatToggle({ className }: { className?: string }) {
  const [format, setFormat] = useBattleFormat();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={format}
      onValueChange={(value) => {
        // Radix sends "" when the active item is pressed again; keep the current format.
        if (value) setFormat(value as BattleFormat);
      }}
      aria-label="Battle format"
      className={className}
    >
      <ToggleGroupItem value="singles">Singles</ToggleGroupItem>
      <ToggleGroupItem value="doubles">Doubles</ToggleGroupItem>
    </ToggleGroup>
  );
}
