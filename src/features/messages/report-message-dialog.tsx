import { useState } from "react";
import { FlagIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buttonTouchClass } from "@/components/touch-targets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import {
  MESSAGE_REPORT_REASONS,
  useReportMessage,
  type MessageReportReason,
} from "@/lib/messages/mutations";

const REASON_LABELS: Record<MessageReportReason, TranslationKey> = {
  spam: "report.reasonSpam",
  harassment: "report.reasonHarassment",
  inappropriate: "report.reasonInappropriate",
  other: "report.reasonOther",
};

/**
 * The report dialog for a direct message: a reason (the feed's report dialog
 * set) and submit, through the `report_message` RPC. The server snapshots
 * the message and the 20 before it into the moderation queue.
 */
export function ReportMessageDialog({
  open,
  onOpenChange,
  messageId,
  client = supabase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const report = useReportMessage(client);
  const [reason, setReason] = useState<MessageReportReason | "">("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (reason === "") {
      setError(t("report.chooseReasonError"));
      return;
    }
    const result = await report.mutateAsync({ messageId, reason });
    if (result.ok) {
      toast.success(t("report.sent"));
      setReason("");
      setError(null);
      onOpenChange(false);
    } else {
      setError(result.error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("report.title", { target: t("messages.targetLabel") })}
          </DialogTitle>
          <DialogDescription>{t("report.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="message-report-reason">
            {t("report.reasonLabel")}
          </Label>
          <Select
            value={reason === "" ? undefined : reason}
            onValueChange={(value) => {
              setReason(value as MessageReportReason);
              setError(null);
            }}
          >
            <SelectTrigger
              id="message-report-reason"
              aria-label={t("report.reasonAria")}
              className="w-full max-sm:h-11"
            >
              <SelectValue placeholder={t("report.chooseReasonPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_REPORT_REASONS.map((candidate) => (
                <SelectItem
                  key={candidate}
                  value={candidate}
                  className="max-sm:py-3"
                >
                  {t(REASON_LABELS[candidate])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className={buttonTouchClass}
            onClick={() => onOpenChange(false)}
            disabled={report.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className={buttonTouchClass}
            onClick={() => void submit()}
            disabled={report.isPending}
          >
            {report.isPending ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden />
            ) : (
              <FlagIcon aria-hidden />
            )}
            {t("report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
