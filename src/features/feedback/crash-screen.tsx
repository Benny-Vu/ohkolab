import { HomeIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Page } from "@/components/page";
import { useT } from "@/lib/i18n/t";
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
  const t = useT();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <Page title={t("crash.title")} width="narrow">
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">{t("crash.body")}</p>
        {crashId ? (
          <p className="text-xs text-muted-foreground">
            {t("crash.referencePrefix")}
            {<span className="font-mono">{crashId}</span>}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => (onReload ? onReload() : window.location.reload())}
          >
            <RefreshCwIcon className="size-4" />
            {t("crash.reload")}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              onGoHome ? onGoHome() : (window.location.href = "/")
            }
          >
            <HomeIcon className="size-4" />
            {t("crash.goHome")}
          </Button>
          <Button variant="outline" onClick={() => setFeedbackOpen(true)}>
            {t("crash.tellUs")}
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
