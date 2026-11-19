import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PushPermissionCard } from "@/features/notifications/push-permission-card";

const mocks = vi.hoisted(() => ({
  getPushPlugin: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  register: vi.fn(),
}));

vi.mock("@/lib/push/plugin", () => ({
  getPushPlugin: mocks.getPushPlugin,
}));

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

/** A fake plugin resolving the given permission states. */
function fakePlugin(current: string, afterRequest: string = "granted"): void {
  mocks.getPushPlugin.mockImplementation(async () => ({
    checkPermissions: mocks.checkPermissions,
    requestPermissions: mocks.requestPermissions,
    register: mocks.register,
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
  }));
  mocks.checkPermissions.mockResolvedValue({ receive: current });
  mocks.requestPermissions.mockResolvedValue({ receive: afterRequest });
  mocks.register.mockResolvedValue(undefined);
}

function nativeOn(): void {
  vi.stubEnv("VITE_PUSH", "true");
  globalWithBridge.Capacitor = { isNativePlatform: () => true };
}

beforeEach(() => {
  mocks.getPushPlugin.mockReset();
  mocks.checkPermissions.mockReset();
  mocks.requestPermissions.mockReset();
  mocks.register.mockReset();
});

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.unstubAllEnvs();
});

describe("PushPermissionCard", () => {
  it("renders nothing while the flag is off, and never loads the plugin", async () => {
    vi.stubEnv("VITE_PUSH", "");
    globalWithBridge.Capacitor = { isNativePlatform: () => true };

    render(<PushPermissionCard />);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mocks.getPushPlugin).not.toHaveBeenCalled();
    expect(screen.queryByText("Turn on notifications")).not.toBeInTheDocument();
  });

  it("renders nothing on the web, flag or not", async () => {
    vi.stubEnv("VITE_PUSH", "true");

    render(<PushPermissionCard />);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mocks.getPushPlugin).not.toHaveBeenCalled();
    expect(screen.queryByText("Turn on notifications")).not.toBeInTheDocument();
  });

  it("stays hidden while the permission is already granted", async () => {
    nativeOn();
    fakePlugin("granted");

    render(<PushPermissionCard />);

    await waitFor(() => expect(mocks.checkPermissions).toHaveBeenCalledOnce());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText("Turn on notifications")).not.toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("asks for permission on the button and disappears once granted", async () => {
    nativeOn();
    fakePlugin("prompt");

    render(<PushPermissionCard />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Turn on" }));

    await waitFor(() => expect(mocks.register).toHaveBeenCalledOnce());
    expect(mocks.requestPermissions).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(
        screen.queryByText("Turn on notifications"),
      ).not.toBeInTheDocument(),
    );
  });

  it("explains the device-settings path once the OS dialog is blocked", async () => {
    nativeOn();
    fakePlugin("denied");

    render(<PushPermissionCard />);

    expect(
      await screen.findByText("Notifications are off"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(mocks.requestPermissions).not.toHaveBeenCalled();
  });

  it("shows the blocked explanation when the user answers the OS prompt with no", async () => {
    nativeOn();
    fakePlugin("prompt", "denied");

    render(<PushPermissionCard />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Turn on" }));

    await waitFor(() =>
      expect(screen.getByText("Notifications are off")).toBeInTheDocument(),
    );
    expect(mocks.register).not.toHaveBeenCalled();
  });
});
