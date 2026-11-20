import * as React from "react";

import { CardTitle as KitCardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A card title on the written type scale (design-rules.md): the heading
 * font at 13px, semibold. The generated kit's CardTitle stays untouched;
 * this wrapper applies the rules' card-title spec, so call sites use it
 * instead of the raw kit component.
 */
export function CardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <KitCardTitle
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  );
}
