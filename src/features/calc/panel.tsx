import type { ReactNode } from "react";

import type { SideId } from "@/lib/calc/state";
import { cn } from "@/lib/utils";

/** The calculator's own names for the two sides. */
export const CALC_SIDE_LABELS: Record<SideId, string> = {
  p1: "Attacker",
  p2: "Defender",
};

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
        "grid min-w-0 content-start gap-4 md:rounded-lg md:border md:bg-card md:p-4",
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
    <h2 id={id} className="font-heading text-base leading-tight font-semibold">
      {children}
    </h2>
  );
}
