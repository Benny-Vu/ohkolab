import * as React from "react";
import { cn } from "@/lib/utils";

interface SegmentedControlOption {
  value: string;
  label: React.ReactNode;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label"?: string;
  className?: string;
}

/**
 * Compact segmented control for two to five mutually exclusive choices. The
 * active segment is a filled neutral button; arrow keys move between
 * segments.
 */
export function SegmentedControl({
  options,
  value,
  onValueChange,
  className,
  ...props
}: SegmentedControlProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const moveFocus = (from: number, delta: number) => {
    const count = options.length;
    if (count === 0) return;
    const to = (from + delta + count) % count;
    refs.current[to]?.focus();
  };

  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex h-8 items-center gap-0.5 rounded-md bg-surface-sunken p-0.5",
        className,
      )}
      {...props}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-posinset={index + 1}
            aria-setsize={options.length}
            tabIndex={active ? 0 : -1}
            data-active={active ? "" : undefined}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                moveFocus(index, 1);
                onValueChange(options[(index + 1) % options.length]!.value);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                moveFocus(index, -1);
                onValueChange(
                  options[(index - 1 + options.length) % options.length]!.value,
                );
              }
            }}
            className={cn(
              "inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium whitespace-nowrap transition-colors duration-(--motion-fast) ease-(--motion-ease-out) outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
