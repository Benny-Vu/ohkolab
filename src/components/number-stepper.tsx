import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Remaining budget across all steppers; caps increases, never rendered. */
  remaining?: number;
  label: string;
  className?: string;
}

/**
 * Minus/plus stepper for Stat Points. 44px touch targets on phones, Plex Mono
 * value, keyboard up/down, clamped to min/max and the remaining budget.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 32,
  remaining,
  label,
  className,
}: NumberStepperProps) {
  const clamp = (next: number) => {
    const ceiling =
      remaining !== undefined ? Math.min(max, value + remaining) : max;
    return Math.max(min, Math.min(ceiling, next));
  };

  const step = (delta: number) => onChange(clamp(value + delta));

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => step(-1)}
          className="grid size-11 place-content-center rounded-md text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 max-md:grid max-md:place-content-center"
        >
          <MinusIcon className="size-4" />
        </button>
        <span
          aria-live="polite"
          className="grid h-11 min-w-12 place-content-center rounded-md bg-surface-sunken px-2 font-mono text-sm tabular-nums"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max || (remaining !== undefined && remaining <= 0)}
          onClick={() => step(1)}
          className="grid size-11 place-content-center rounded-md text-muted-foreground transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
