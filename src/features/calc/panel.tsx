import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Highlight for toggles that are switched on. */
export const TOGGLE_ON_CLASS =
  "aria-pressed:border-primary aria-pressed:bg-primary/15 data-[state=on]:border-primary data-[state=on]:bg-primary/15";

interface PanelProps {
  /** Id of the heading inside the panel that names it. */
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

/**
 * A section of the calculator. Bare on phones, where it fills a tab and
 * needs the full width; a card on wider screens.
 */
export function Panel({ labelledBy, className, children }: PanelProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        "grid min-w-0 content-start gap-4 md:rounded-xl md:border md:bg-card md:p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelTitle({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="text-base leading-tight font-semibold">
      {children}
    </h2>
  );
}
