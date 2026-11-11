import { ConstructionIcon } from "lucide-react";

/** Placeholder body for a page whose feature is not built yet. */
export function ComingSoon({ children }: { children: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
      <ConstructionIcon className="size-8 text-muted-foreground" aria-hidden />
      <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
