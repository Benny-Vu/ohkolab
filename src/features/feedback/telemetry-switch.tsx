import { Switch } from "@/components/ui/switch";
import {
  useTelemetryConsent,
  setTelemetryEnabled,
} from "@/lib/telemetry/consent";

/**
 * The telemetry opt-out switch: one control for anonymous usage statistics
 * and crash reports, with a sentence saying what it covers.
 */

export function TelemetrySwitch() {
  const consent = useTelemetryConsent();

  return (
    <label className="flex items-start gap-3">
      <Switch
        checked={consent.enabled}
        onCheckedChange={(checked) => setTelemetryEnabled(checked)}
        aria-label="Share anonymous usage statistics and crash reports"
        className="mt-0.5"
      />
      <span className="text-sm text-muted-foreground">
        Share anonymous usage statistics and crash reports. Usage statistics are
        cookieless and never include what you write or your teams; crash reports
        contain only the error and the page it happened on. You can turn this
        off at any time.
      </span>
    </label>
  );
}
