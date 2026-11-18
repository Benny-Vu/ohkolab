import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useT } from "@/lib/i18n/t";

/** Shown instead of the auth screens when Supabase is not configured. */
export function UnconfiguredNotice() {
  const t = useT();
  return (
    <Alert>
      <TriangleAlertIcon />
      <AlertTitle>{t("unconfigured.title")}</AlertTitle>
      <AlertDescription>{t("auth.errNotConfigured")}</AlertDescription>
    </Alert>
  );
}
