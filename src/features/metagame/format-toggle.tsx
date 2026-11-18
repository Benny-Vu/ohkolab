import { Button } from "@/components/ui/button";
import { useBattleFormat } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import type { BattleFormat } from "@/types/battle";

const OPTIONS: { format: BattleFormat; label: string }[] = [
  { format: "singles", label: "Singles" },
  { format: "doubles", label: "Doubles" },
];

/** Singles / doubles switch with a clear active state. */
export function FormatToggle({ className }: { className?: string }) {
  const [format, setFormat] = useBattleFormat();
  return (
    <div
      role="group"
      aria-label="Battle format"
      className={cn("flex items-center gap-1", className)}
    >
      {OPTIONS.map(({ format: option, label }) => {
        const active = option === format;
        return (
          <Button
            key={option}
            variant={active ? "default" : "outline"}
            size="sm"
            aria-pressed={active}
            onClick={() => setFormat(option)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
