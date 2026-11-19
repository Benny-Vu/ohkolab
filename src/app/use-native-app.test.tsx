import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderAt } from "@/app/test-utils";
import { mountNativeShell } from "@/lib/native/shell";

vi.mock("@/lib/native/shell", () => ({
  mountNativeShell: vi.fn(),
}));

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

beforeEach(() => {
  vi.mocked(mountNativeShell).mockResolvedValue(() => {});
});

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.clearAllMocks();
});

describe("useNativeApp", () => {
  it("mounts the native shell glue once the app shell renders", async () => {
    globalWithBridge.Capacitor = { isNativePlatform: () => true };

    renderAt("/");

    await waitFor(() => expect(mountNativeShell).toHaveBeenCalledOnce());
    // The shell is handed the router's navigate, so notification taps can
    // deep-link in-app.
    const options = vi.mocked(mountNativeShell).mock.calls[0]?.[0];
    expect(options?.navigate).toBeTypeOf("function");
  });

  it("never mounts the glue on the web", async () => {
    renderAt("/");

    // Give the effect a chance to (not) run.
    await act(async () => {});

    expect(mountNativeShell).not.toHaveBeenCalled();
  });
});
