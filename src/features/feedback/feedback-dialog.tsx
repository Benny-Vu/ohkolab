import { BugIcon, LightbulbIcon, MessageCircleIcon } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buttonTouchClass } from "@/components/touch-targets";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import { CONTACT_EMAIL } from "@/features/legal/legal-info";
import { getTelemetryConfig } from "@/lib/telemetry/config";
import { track } from "@/lib/telemetry/analytics";
import { routeTemplate } from "@/lib/telemetry/route-template";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  isFeedbackKind,
  useSendFeedback,
  type FeedbackContext,
  type FeedbackKind,
} from "@/features/feedback/feedback";

/**
 * The feedback dialog: kind, message and the technical-details checkbox.
 * Signed-out users get a mailto fallback instead of the form.
 */

const KIND_LABELS: Record<FeedbackKind, TranslationKey> = {
  bug: "feedback.kindBug",
  idea: "feedback.kindIdea",
  other: "feedback.kindOther",
};

const KIND_ICONS: Record<FeedbackKind, ReactNode> = {
  bug: <BugIcon className="size-4" aria-hidden />,
  idea: <LightbulbIcon className="size-4" aria-hidden />,
  other: <MessageCircleIcon className="size-4" aria-hidden />,
};

export interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The kind to preselect, e.g. Bug from the crash screen. */
  defaultKind?: FeedbackKind;
  /** A crash id to attach when the dialog opens from the crash screen. */
  crashId?: string | null;
}

function buildContext(
  includeDetails: boolean,
  crashId: string | null,
): FeedbackContext | null {
  if (!includeDetails) {
    return null;
  }
  const config = getTelemetryConfig();
  const context: FeedbackContext = {
    page: routeTemplate(window.location.pathname),
    app_version: config.appVersion ?? "unknown",
    browser: navigator.userAgent,
    screen_size: `${window.innerWidth}x${window.innerHeight}`,
  };
  if (crashId) {
    context.crash_id = crashId;
  }
  return context;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  defaultKind = "other",
  crashId = null,
}: FeedbackDialogProps) {
  const { user } = useAuth();
  const t = useT();
  const [kind, setKind] = useState<FeedbackKind>(defaultKind);
  const [message, setMessage] = useState("");
  const [includeDetails, setIncludeDetails] = useState(true);
  const sendFeedback = useSendFeedback();

  const signedOut = user === null;

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < FEEDBACK_MESSAGE_MIN) {
      toast.error(t("feedback.tooShort", { min: FEEDBACK_MESSAGE_MIN }));
      return;
    }
    if (trimmed.length > FEEDBACK_MESSAGE_MAX) {
      toast.error(t("feedback.tooLong", { max: FEEDBACK_MESSAGE_MAX }));
      return;
    }
    sendFeedback.mutate(
      {
        kind,
        message: trimmed,
        context: buildContext(includeDetails, crashId),
      },
      {
        onSuccess: (result) => {
          if (result.ok) {
            track("feedback_sent", { kind });
            toast.success(t("feedback.sentToast"));
            setMessage("");
            onOpenChange(false);
          } else if (result.error.code === "rate_limited") {
            toast.error(t("feedback.rateLimited"));
          } else {
            toast.error(result.error.message);
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("footer.sendFeedback")}</DialogTitle>
          <DialogDescription>{t("feedback.description")}</DialogDescription>
        </DialogHeader>
        {signedOut ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("feedback.signedOutBody")}
            </p>
            <Button
              asChild
              variant="outline"
              className={`w-full ${buttonTouchClass}`}
            >
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                  "OHKOLab feedback",
                )}`}
              >
                {t("feedback.emailUs", { email: CONTACT_EMAIL })}
              </a>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <ToggleGroup
                type="single"
                value={kind}
                onValueChange={(value) => {
                  if (isFeedbackKind(value)) {
                    setKind(value);
                  }
                }}
                aria-label={t("feedback.kindAria")}
                variant="outline"
              >
                {FEEDBACK_KINDS.map((feedbackKind) => (
                  <ToggleGroupItem
                    key={feedbackKind}
                    value={feedbackKind}
                    className="max-sm:h-11"
                  >
                    {KIND_ICONS[feedbackKind]}
                    {t(KIND_LABELS[feedbackKind])}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("feedback.placeholder")}
                aria-label={t("feedback.messageAria")}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                {message.trim().length}/{FEEDBACK_MESSAGE_MAX}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeDetails}
                onCheckedChange={(checked) =>
                  setIncludeDetails(checked === true)
                }
              />
              {t("feedback.includeDetails")}
              {crashId ? t("feedback.crashIdSuffix") : ""})
            </label>
            <DialogFooter>
              <Button
                type="submit"
                className={buttonTouchClass}
                disabled={sendFeedback.isPending}
              >
                {sendFeedback.isPending
                  ? t("feedback.sending")
                  : t("feedback.send")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
