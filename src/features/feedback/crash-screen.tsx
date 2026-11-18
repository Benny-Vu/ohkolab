import { HomeIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Page } from "@/components/page";
import { FeedbackDialog } from "@/features/feedback/feedback-dialog";

/**
 * The crash screen shown when a route throws: a friendly message, Reload,
 * Go home, and a path to tell us what happened with the crash id attached.
 */

export interface CrashScreenProps {
  /** The Sentry event id for the crash, when crash reporting is on. */
  crashId?: string | null;
  /** Called when the user chooses to reload the page. */
  onReload?: () => void;
  /** Called when the user chooses to go home. */
  onGoHome?: () => void;
}

export function CrashScreen({
  crashId = null,
  onReload,
  onGoHome,
}: CrashScreenProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <Page title="Something went wrong" width="narrow">
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Something broke on our side. Your data is safe. You can reload the
          page, go back to the feed, or tell us what happened so we can fix it
          faster.
        </p>
        {crashId ? (
          <p className="text-xs text-muted-foreground">
            Crash reference: <span className="font-mono">{crashId}</span>
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => (onReload ? onReload() : window.location.reload())}
          >
            <RefreshCwIcon className="size-4" />
            Reload
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              onGoHome ? onGoHome() : (window.location.href = "/")
            }
          >
            <HomeIcon className="size-4" />
            Go home
          </Button>
          <Button variant="outline" onClick={() => setFeedbackOpen(true)}>
            Tell us what happened
          </Button>
        </div>
      </div>
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        defaultKind="bug"
        crashId={crashId}
      />
    </Page>
  );
}
