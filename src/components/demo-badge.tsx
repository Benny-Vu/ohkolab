import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";

/**
 * The "this is sample content" tag every recording-mode card carries. Its
 * key lives in the shell dictionary so every route can render it.
 */
export function ExampleBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <Badge variant="outline" className={cn("text-2xs", className)}>
      {t("demo.example")}
    </Badge>
  );
}
