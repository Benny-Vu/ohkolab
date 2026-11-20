import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { iconHitXsClass } from "@/components/touch-targets";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";

interface TeamIdChipProps {
  /** The Champions team ID to show. */
  id: string;
  /** Show only the ID without the "Team ID" label (dense spots). */
  compact?: boolean;
  className?: string;
}

/**
 * The "Team ID" chip shown next to a team: the code in mono plus a copy
 * button. Players paste the code in the game's "Build Teams using Team IDs"
 * screen; there is nothing to click through to.
 */
export function TeamIdChip({ id, compact, className }: TeamIdChipProps) {
  const t = useT();
  const copy = () => {
    void navigator.clipboard
      .writeText(id)
      .then(() => toast.success(t("teams.gameIdCopied")))
      .catch(() => toast.error(t("share.copyFailed")));
  };
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2 text-xs",
        className,
      )}
    >
      {!compact && (
        <span className="text-muted-foreground">{t("teams.gameIdLabel")}</span>
      )}
      <span className="font-mono tracking-wide">{id}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        className={iconHitXsClass}
        aria-label={t("teams.gameIdCopyAria")}
        onClick={copy}
      >
        <CopyIcon aria-hidden />
      </Button>
    </span>
  );
}
