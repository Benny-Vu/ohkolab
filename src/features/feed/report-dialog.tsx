import { useState } from "react";
import { LoaderCircleIcon, MailIcon } from "lucide-react";
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
import { useCreateReport } from "@/lib/social/mutations";
import { REPORT_DETAILS_MAX, REPORT_REASONS } from "@/lib/social/validation";

export type ReportTargetType = "post" | "comment" | "profile";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
}

const REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  spam: "Spam",
  harassment: "Harassment or bullying",
  inappropriate: "Inappropriate content",
  other: "Something else",
};

const EMAIL_SUBJECTS: Record<ReportTargetType, string> = {
  post: "Report a post",
  comment: "Report a comment",
  profile: "Report a profile",
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
  const createReport = useCreateReport();
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number] | "">(
    "",
  );
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setReason("");
    setDetails("");
    setError(null);
  }

  async function submit() {
    if (reason === "") {
      setError("Choose a reason for the report.");
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
      toast.success("Report sent. Our moderators will take a look.");
      reset();
      onOpenChange(false);
    } else {
      setError(result.error.message);
    }
  }

  if (user === null) {
    const subject = encodeURIComponent(EMAIL_SUBJECTS[targetType]);
    const body = encodeURIComponent(
      `Please review this ${targetType}:\n${contentUrl(targetType, targetId)}`,
    );
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report {targetType}</DialogTitle>
            <DialogDescription>
              You need an account to report {targetType}s directly. You can also
              send the report to the moderators by email.
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" asChild>
              <a
                href={`mailto:contact@ohkolab.com?subject=${subject}&body=${body}`}
              >
                <MailIcon aria-hidden />
                Report by email
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
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>
            Tell us what is wrong. Moderators review every report.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="report-reason">Reason</Label>
            <Select
              value={reason === "" ? undefined : reason}
              onValueChange={(value) => {
                setReason(value as (typeof REPORT_REASONS)[number]);
                setError(null);
              }}
            >
              <SelectTrigger id="report-reason" aria-label="Report reason">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((candidate) => (
                  <SelectItem key={candidate} value={candidate}>
                    {REASON_LABELS[candidate]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              placeholder="Anything that helps moderators understand the report."
            />
            <p className="text-xs text-muted-foreground">
              {details.length}/{REPORT_DETAILS_MAX}
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createReport.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={createReport.isPending}
          >
            {createReport.isPending && (
              <LoaderCircleIcon className="animate-spin" aria-hidden />
            )}
            Submit report
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
