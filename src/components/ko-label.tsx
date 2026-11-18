import { cn } from "@/lib/utils";

export type KoLabelResult =
  "OHKO" | "2HKO" | "3HKO" | "4HKO" | "GUARANTEED 2HKO" | "No damage";

const FILLED: KoLabelResult[] = ["OHKO", "2HKO", "GUARANTEED 2HKO"];

const FILLED_CLASSES: Partial<Record<KoLabelResult, string>> = {
  OHKO: "bg-damage-ohko text-accent-brand-foreground",
  "2HKO": "bg-damage-2hko text-accent-brand-foreground",
  "GUARANTEED 2HKO": "bg-damage-2hko text-accent-brand-foreground",
};

const TEXT_CLASSES: Partial<Record<KoLabelResult, string>> = {
  "3HKO": "text-damage-3hko",
  "4HKO": "text-damage-4hko",
  "No damage": "text-damage-none",
};

interface KoLabelProps {
  result: KoLabelResult;
  className?: string;
}

/**
 * KO summary label. OHKO and 2HKO results are filled pills with dark text;
 * weaker results are coloured text only.
 */
export function KoLabel({ result, className }: KoLabelProps) {
  const filled = FILLED.includes(result);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[3px] px-1.5 py-0.5 font-heading text-[11px] font-semibold tracking-wide uppercase",
        filled
          ? FILLED_CLASSES[result]
          : cn("bg-transparent", TEXT_CLASSES[result]),
        className,
      )}
    >
      {result}
    </span>
  );
}
