import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Shown instead of the auth screens when Supabase is not configured. */
export function UnconfiguredNotice() {
  return (
    <Alert>
      <TriangleAlertIcon />
      <AlertTitle>Accounts are unavailable</AlertTitle>
      <AlertDescription>
        Accounts are not available in this build. The tools still work without
        one.
      </AlertDescription>
    </Alert>
  );
}
