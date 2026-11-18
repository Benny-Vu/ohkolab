import { BugIcon, LightbulbIcon, MessageCircleIcon } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { CONTACT_EMAIL } from "@/features/legal/legal-info";
import { getTelemetryConfig } from "@/lib/telemetry/config";
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

const KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Bug",
  idea: "Idea",
  other: "Other",
};

const KIND_ICONS: Record<FeedbackKind, ReactNode> = {
  bug: <BugIcon className="size-4" />,
  idea: <LightbulbIcon className="size-4" />,
  other: <MessageCircleIcon className="size-4" />,
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
  const [kind, setKind] = useState<FeedbackKind>(defaultKind);
  const [message, setMessage] = useState("");
  const [includeDetails, setIncludeDetails] = useState(true);
  const sendFeedback = useSendFeedback();

  const signedOut = user === null;

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < FEEDBACK_MESSAGE_MIN) {
      toast.error(
        `Tell us a bit more (at least ${FEEDBACK_MESSAGE_MIN} characters).`,
      );
      return;
    }
    if (trimmed.length > FEEDBACK_MESSAGE_MAX) {
      toast.error(`Feedback is limited to ${FEEDBACK_MESSAGE_MAX} characters.`);
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
            toast.success("Thanks! Your feedback was sent.");
            setMessage("");
            onOpenChange(false);
          } else if (result.error.code === "rate_limited") {
            toast.error(
              "You have sent a lot of feedback recently. Please try again in an hour.",
            );
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
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Tell us what is broken, what is missing, or what you would like to
            see. We read everything.
          </DialogDescription>
        </DialogHeader>
        {signedOut ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You need an account to send feedback through the site. You can
              also email us and we will get back to you.
            </p>
            <Button asChild variant="outline" className="w-full">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                  "OHKOLab feedback",
                )}`}
              >
                Email {CONTACT_EMAIL}
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
                aria-label="Feedback kind"
                variant="outline"
              >
                {FEEDBACK_KINDS.map((feedbackKind) => (
                  <ToggleGroupItem key={feedbackKind} value={feedbackKind}>
                    {KIND_ICONS[feedbackKind]}
                    {KIND_LABELS[feedbackKind]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="What happened? What should we change?"
                aria-label="Your feedback"
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
              Include technical details (page, app version, browser, screen size
              {crashId ? ", crash id" : ""})
            </label>
            <DialogFooter>
              <Button type="submit" disabled={sendFeedback.isPending}>
                {sendFeedback.isPending ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
