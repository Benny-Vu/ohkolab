import { SegmentedControl } from "@/components/segmented-control";
import { useBattleFormat } from "@/lib/preferences";
import type { BattleFormat } from "@/types/battle";

const OPTIONS: { value: BattleFormat; label: string }[] = [
  { value: "singles", label: "Singles" },
  { value: "doubles", label: "Doubles" },
];

/** Singles / doubles switch with a clear active state. */
export function FormatToggle({ className }: { className?: string }) {
  const [format, setFormat] = useBattleFormat();
  return (
    <SegmentedControl
      options={OPTIONS}
      value={format}
      onValueChange={(value) => setFormat(value as BattleFormat)}
      aria-label="Battle format"
      className={className}
    />
  );
}
