/**
 * The thin touchpoint for `@capacitor/push-notifications`. The real plugin is
 * loaded only through `getPushPlugin()` (a dynamic import behind the flag
 * and native checks), so it never reaches the web bundle or a flag-off
 * build. Tests mock the plugin module and inject fakes through the same
 * `PushPlugin` interface.
 */

/** What a `pushNotificationActionPerformed` event carries. */
interface PushActionPerformedEvent {
  notification: {
    /** The FCM `data` payload; `path` holds the in-app route. */
    data?: Record<string, unknown> | null;
  };
}

/** The subset of the Capacitor plugin the push layer uses. */
export interface PushPlugin {
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  addListener(
    event: "registration",
    listener: (event: { value: string }) => void,
  ): Promise<{ remove(): void }>;
  addListener(
    event: "registrationError",
    listener: (event: unknown) => void,
  ): Promise<{ remove(): void }>;
  addListener(
    event: "pushNotificationActionPerformed",
    listener: (event: PushActionPerformedEvent) => void,
  ): Promise<{ remove(): void }>;
  removeAllListeners(): Promise<void>;
}

/** The Capacitor push plugin, loaded lazily so it stays out of every bundle it does not belong in. */
export async function getPushPlugin(): Promise<PushPlugin> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return PushNotifications as unknown as PushPlugin;
}
