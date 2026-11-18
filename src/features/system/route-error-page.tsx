import { useRouteError } from "react-router";
import { useState } from "react";

import { CrashScreen } from "@/features/feedback/crash-screen";
import { reportError } from "@/lib/telemetry/sentry";

/**
 * Shown when a page fails to load or throws while rendering. Mounted by
 * the lead from `systemRoutes` (or imported directly as `RouteErrorPage`).
 */
export function RouteErrorPage() {
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
