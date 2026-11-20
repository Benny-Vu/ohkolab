import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { rowHitXsClass } from "@/components/touch-targets";
import { KNOWN_LIMITATION_KEYS } from "@/features/calc/known-limitation-keys";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/t";

/**
 * A collapsible note at the bottom of the calculator: what it does not
 * simulate yet. Collapsed by default so it never crowds the tool.
 */
export function KnownLimitations() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={`justify-start gap-1.5 ${rowHitXsClass}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDownIcon
          className={cn(
            "size-4 transition-transform duration-(--motion-fast) ease-(--motion-ease-out)",
            open && "rotate-180",
          )}
        />
        {t("calc.knownLimitations")}
      </Button>
      {open ? (
        <ul className="grid gap-1.5 pl-1 text-sm text-muted-foreground">
          {KNOWN_LIMITATION_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
