import { useState } from "react";
import { Link, useRouteError } from "react-router";

import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CrashScreen } from "@/features/feedback/crash-screen";
import { reportError } from "@/lib/telemetry/sentry";

/** Shown for any URL no route matches. */
export function NotFoundPage() {
  return (
    <Page title="Page not found" width="narrow">
      <p className="mb-4 text-sm text-muted-foreground">
        There is nothing at this address. It may have moved or never existed.
      </p>
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </Page>
  );
}

/** Shown when a page fails to load or throws while rendering. */
export function RouteError() {
  const error = useRouteError();
  // Report the crash once per error (adjust state during render).
  const [reportedError, setReportedError] = useState<unknown>(null);
  const [hasReported, setHasReported] = useState(false);
  const [crashId, setCrashId] = useState<string | null>(null);
  if (!hasReported || reportedError !== error) {
    setReportedError(error);
    setHasReported(true);
    setCrashId(reportError(error));
  }
  return (
    <CrashScreen
      crashId={crashId}
      onReload={() => window.location.reload()}
      onGoHome={() => (window.location.href = "/")}
    />
  );
}

/** Shown while the first page's code is loading. */
export function PageLoading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6"
      aria-busy="true"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Button asChild variant="link" className="h-auto p-0">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}
