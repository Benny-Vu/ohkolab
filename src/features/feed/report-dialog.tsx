import { useState } from "react";
import { LoaderCircleIcon, MailIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { useCreateReport } from "@/lib/social/mutations";
import { REPORT_DETAILS_MAX, REPORT_REASONS } from "@/lib/social/validation";
import type { TranslationKey } from "@/lib/i18n/en";

export type ReportTargetType = "post" | "comment" | "profile";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
}

const REASON_LABELS: Record<(typeof REPORT_REASONS)[number], TranslationKey> = {
  spam: "report.reasonSpam",
  harassment: "report.reasonHarassment",
  inappropriate: "report.reasonInappropriate",
  other: "report.reasonOther",
};

const TARGET_LABELS: Record<ReportTargetType, TranslationKey> = {
  post: "report.targetPost",
  comment: "report.targetComment",
  profile: "report.targetProfile",
};

const EMAIL_SUBJECTS: Record<ReportTargetType, TranslationKey> = {
  post: "report.emailSubjectPost",
  comment: "report.emailSubjectComment",
  profile: "report.emailSubjectProfile",
};

function contentUrl(targetType: ReportTargetType, targetId: string): string {
  const origin = window.location.origin;
  if (targetType === "post") {
    return `${origin}/post/${targetId}`;
  }
  if (targetType === "profile") {
    return `${origin}/u/${targetId}`;
  }
  return `${origin}${window.location.pathname}`;
}

/**
 * Report dialog shared by posts, comments and profiles. Collects a reason and
 * optional details, then submits a report through the social layer. Signed-out
 * visitors get an email link instead of the form.
 */
export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: ReportDialogProps) {
  const { user } = useAuth();
  const t = useT();
  const createReport = useCreateReport();
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | "">(
    "",
  );
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const targetLabel = () => t(TARGET_LABELS[targetType]);

  function reset() {
    setReason("");
    setDetails("");
    setError(null);
  }

  async function submit() {
    if (reason === "") {
      setError(t("report.chooseReasonError"));
      return;
    }
    const normalized = normalizeDetails(details);
    const result = await createReport.mutateAsync({
      targetType,
      targetId,
      reason,
      details: normalized ?? undefined,
    });
    if (result.ok) {
      toast.success(t("report.sent"));
      reset();
      onOpenChange(false);
    } else {
      setError(result.error.message);
    }
  }

  if (user === null) {
    const subject = encodeURIComponent(t(EMAIL_SUBJECTS[targetType]));
    const body = encodeURIComponent(
      `Please review this ${targetType}:\n${contentUrl(targetType, targetId)}`,
    );
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("report.title", { target: targetLabel() })}
            </DialogTitle>
            <DialogDescription>
              {t("report.signedOutDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <p className="text-sm break-all text-muted-foreground">
              {contentUrl(targetType, targetId)}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={buttonTouchClass}
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" asChild className={buttonTouchClass}>
              <a
                href={`mailto:contact@ohkolab.com?subject=${subject}&body=${body}`}
              >
                <MailIcon aria-hidden />
                {t("report.byEmail")}
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("report.title", { target: targetLabel() })}
          </DialogTitle>
          <DialogDescription>{t("report.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="report-reason">{t("report.reasonLabel")}</Label>
            <Select
              value={reason === "" ? undefined : reason}
              onValueChange={(value) => {
                setReason(value as (typeof REPORT_REASONS)[number]);
                setError(null);
              }}
            >
              <SelectTrigger
                id="report-reason"
                aria-label={t("report.reasonAria")}
                className="w-full max-sm:h-11"
              >
                <SelectValue
                  placeholder={t("report.chooseReasonPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((candidate) => (
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
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-details">{t("report.detailsLabel")}</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              placeholder={t("report.detailsPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {details.length}/{REPORT_DETAILS_MAX}
            </p>
          </div>
          {error && (
            <p
              id="report-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className={buttonTouchClass}
            onClick={() => onOpenChange(false)}
            disabled={createReport.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className={buttonTouchClass}
            onClick={submit}
            disabled={createReport.isPending}
            aria-describedby={error ? "report-error" : undefined}
          >
            {createReport.isPending && (
              <LoaderCircleIcon className="animate-spin" aria-hidden />
            )}
            {t("report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizeDetails(details: string): string | null {
  const trimmed = details.trim();
  if (trimmed === "") return null;
  return trimmed;
}
