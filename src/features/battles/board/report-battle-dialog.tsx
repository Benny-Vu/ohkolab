import { useState } from "react";
import { FlagIcon, MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { menuItemClass } from "@/components/menu-item-class";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import { useReportBattleRequest } from "@/lib/battles/mutations";

/** The four report reasons the moderation queue knows (see the reports table). */
const REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate",
  "other",
] as const;

const REASON_LABELS: Record<(typeof REPORT_REASONS)[number], TranslationKey> = {
  spam: "report.reasonSpam",
  harassment: "report.reasonHarassment",
  inappropriate: "report.reasonInappropriate",
  other: "report.reasonOther",
};

interface ReportBattleButtonProps {
  requestId: string;
  client?: AppSupabaseClient | null;
}

/**
 * The card's overflow menu with its single Report row, plus the small dialog
 * behind it: one of the four reasons, then the moderation queue. The reasons
 * and the sent toast reuse the community report strings so both report flows
 * read the same.
 */
export function ReportBattleButton({
  requestId,
  client = supabase,
}: ReportBattleButtonProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={t("battles.report")}
            className="ml-auto"
          >
            <MoreHorizontalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className={menuItemClass}
            onSelect={() => setOpen(true)}
          >
            <FlagIcon aria-hidden />
            {t("battles.report")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportBattleDialog
        requestId={requestId}
        client={client}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

interface ReportBattleDialogProps {
  requestId: string;
  client?: AppSupabaseClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ReportBattleDialog({
  requestId,
  client = supabase,
  open,
  onOpenChange,
}: ReportBattleDialogProps) {
  const t = useT();
  const report = useReportBattleRequest(client);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | "">(
    "",
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason === "") {
      setError(t("report.chooseReasonError"));
      return;
    }
    try {
      await report.mutateAsync({ requestId, reason });
      toast.success(t("report.sent"));
      setReason("");
      setError(null);
      onOpenChange(false);
    } catch {
      setError(t("battles.errorGeneric"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("battles.reportTitle")}</DialogTitle>
          <DialogDescription>
            {t("battles.reportDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="battle-report-reason">
            {t("battles.reportReasonLabel")}
          </Label>
          <Select
            value={reason === "" ? undefined : reason}
            onValueChange={(value) => {
              setReason(value as (typeof REPORT_REASONS)[number]);
              setError(null);
            }}
          >
            <SelectTrigger
              id="battle-report-reason"
              aria-label={t("battles.reportReasonLabel")}
            >
              <SelectValue placeholder={t("battles.reportReasonLabel")} />
            </SelectTrigger>
            <SelectContent>
              {REPORT_REASONS.map((candidate) => (
                <SelectItem key={candidate} value={candidate}>
                  {t(REASON_LABELS[candidate])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && (
            <p
              id="battle-report-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={report.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={report.isPending}
            aria-describedby={error ? "battle-report-error" : undefined}
          >
            {t("report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
