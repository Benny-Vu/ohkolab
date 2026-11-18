import { Switch } from "@/components/ui/switch";
import {
  useTelemetryConsent,
  setTelemetryEnabled,
} from "@/lib/telemetry/consent";
import { useT } from "@/lib/i18n/t";

/**
 * The telemetry opt-out switch: one control for anonymous usage statistics
 * and crash reports, with a sentence saying what it covers.
 */

export function TelemetrySwitch() {
  const t = useT();
  const consent = useTelemetryConsent();

  return (
    <label className="flex items-start gap-3">
      <Switch
        checked={consent.enabled}
        onCheckedChange={(checked) => setTelemetryEnabled(checked)}
        aria-label={t("feedback.telemetryAria")}
        className="mt-0.5"
      />
      <span className="text-sm text-muted-foreground">
        {t("feedback.telemetryBody")}
      </span>
    </label>
  );
}
