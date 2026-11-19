import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/sonner";
import { PushSettingsCard } from "@/features/account/push-settings-card";
import type { PushSettings } from "@/lib/push/settings";
import { DEFAULT_PUSH_SETTINGS } from "@/lib/push/settings";

const mocks = vi.hoisted(() => ({
  usePushSettings: vi.fn(),
  useUpdatePushSettings: vi.fn(),
  getPushPlugin: vi.fn(),
  registerIfAlreadyGranted: vi.fn(),
  deleteRememberedPushToken: vi.fn(),
}));

vi.mock("@/lib/push/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/push/settings")>();
  return {
    ...actual,
    usePushSettings: mocks.usePushSettings,
    useUpdatePushSettings: mocks.useUpdatePushSettings,
  };
});

vi.mock("@/lib/push/plugin", () => ({
  getPushPlugin: mocks.getPushPlugin,
}));

vi.mock("@/lib/push/notifications", () => ({
  registerIfAlreadyGranted: mocks.registerIfAlreadyGranted,
}));

vi.mock("@/lib/push/tokens", () => ({
  rememberDeviceToken: vi.fn(),
  knownDeviceToken: vi.fn(() => null),
  clearRememberedDeviceToken: vi.fn(),
  deleteRememberedPushToken: mocks.deleteRememberedPushToken,
}));

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

const ALL_ON: PushSettings = { ...DEFAULT_PUSH_SETTINGS };

function queryResult(data: PushSettings) {
  return { data, isPending: false, isError: false, error: null };
}

function mutationResult(saved = true) {
  return {
    mutateAsync: vi.fn(async () => saved),
    mutate: vi.fn(),
    isPending: false,
  };
}

/** Renders the card with the toaster the toasts need. */
function renderCard() {
  return render(
    <>
      <PushSettingsCard />
      <Toaster />
    </>,
  );
}

function nativeOn(): void {
  vi.stubEnv("VITE_PUSH", "true");
  globalWithBridge.Capacitor = { isNativePlatform: () => true };
}

beforeEach(() => {
  mocks.usePushSettings.mockReturnValue(queryResult(ALL_ON));
  mocks.useUpdatePushSettings.mockReturnValue(mutationResult());
  mocks.getPushPlugin.mockResolvedValue({});
  mocks.registerIfAlreadyGranted.mockResolvedValue(true);
  mocks.deleteRememberedPushToken.mockResolvedValue(false);
});

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("PushSettingsCard", () => {
  it("renders nothing while the flag is off", () => {
    vi.stubEnv("VITE_PUSH", "");
    globalWithBridge.Capacitor = { isNativePlatform: () => true };

    renderCard();

    // The hook runs (React hooks always do) but stays disabled: the card
    // renders nothing and no settings UI reaches the user.
    expect(screen.queryByText("Push notifications")).not.toBeInTheDocument();
  });

  it("renders nothing on the web, flag or not", () => {
    vi.stubEnv("VITE_PUSH", "true");

    renderCard();

    expect(screen.queryByText("Push notifications")).not.toBeInTheDocument();
  });

  it("shows the master switch and one switch per kind", () => {
    nativeOn();

    renderCard();

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Push notifications")).toBeInTheDocument();
    for (const label of [
      "Likes",
      "Comments",
      "Follows",
      "Groups",
      "Messages",
    ]) {
      expect(screen.getByRole("switch", { name: label })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("switch", { name: "All push notifications" }),
    ).toBeInTheDocument();
  });

  it("saves a kind switch toggle", async () => {
    nativeOn();
    const update = mutationResult();
    mocks.useUpdatePushSettings.mockReturnValue(update);

    renderCard();
    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Likes" }));

    expect(update.mutateAsync).toHaveBeenCalledWith({
      ...ALL_ON,
      likes: false,
    });
    expect(await screen.findByText("Push settings saved.")).toBeInTheDocument();
  });

  it("deletes this device's token row when the master switch turns off", async () => {
    nativeOn();
    const update = mutationResult();

    mocks.useUpdatePushSettings.mockReturnValue(update);
    renderCard();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("switch", { name: "All push notifications" }),
    );

    expect(update.mutateAsync).toHaveBeenCalledWith({
      ...ALL_ON,
      enabled: false,
    });
    expect(mocks.deleteRememberedPushToken).toHaveBeenCalledOnce();
    expect(mocks.registerIfAlreadyGranted).not.toHaveBeenCalled();
  });

  it("re-registers the device when the master switch turns back on", async () => {
    nativeOn();
    const update = mutationResult();
    mocks.usePushSettings.mockReturnValue(
      queryResult({ ...ALL_ON, enabled: false }),
    );
    mocks.useUpdatePushSettings.mockReturnValue(update);

    renderCard();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("switch", { name: "All push notifications" }),
    );

    expect(update.mutateAsync).toHaveBeenCalledWith(ALL_ON);
    expect(mocks.deleteRememberedPushToken).not.toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(mocks.registerIfAlreadyGranted).toHaveBeenCalledOnce(),
    );
  });

  it("shows the failure toast when the save fails", async () => {
    nativeOn();
    const update = mutationResult(false);
    mocks.useUpdatePushSettings.mockReturnValue(update);

    renderCard();

    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Follows" }));

    expect(
      await screen.findByText("Push settings could not be saved."),
    ).toBeInTheDocument();
  });
});
