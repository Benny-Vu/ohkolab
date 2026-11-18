import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearNativeAuthFailure,
  completeNativeAuthRedirect,
  isAuthCallbackUrl,
  readNativeAuthFailure,
  startNativeAuthListener,
  type NativeAuth,
} from "@/lib/auth/native-auth";
import type { AuthResult, RedirectOutcome } from "@/lib/auth/types";

// The Capacitor plugins are native code; tests replace them wholesale. The
// mock applies to the dynamic import() inside the module under test too.
const browserClose = vi.fn().mockResolvedValue(undefined);
vi.mock("@capacitor/browser", () => ({
  Browser: { close: browserClose },
}));

const appAddListener = vi.fn().mockResolvedValue(undefined);
vi.mock("@capacitor/app", () => ({
  App: { addListener: appAddListener },
}));

type Bridge = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
};

const globalBridge = globalThis as { Capacitor?: Bridge };

/** The auth half the listener needs, as a controllable fake. */
function fakeAuth(
  result: AuthResult<RedirectOutcome>,
): NativeAuth & { completeAuthRedirect: ReturnType<typeof vi.fn> } {
  return {
    completeAuthRedirect: vi.fn().mockResolvedValue(result),
  };
}

const CALLBACK_URL = "com.vuforge.ohkolab://auth/callback?code=one-time-code";

beforeEach(() => {
  globalBridge.Capacitor = {
    getPlatform: () => "android",
    isNativePlatform: () => true,
  };
  browserClose.mockClear();
  appAddListener.mockClear();
  sessionStorage.clear();
});

describe("isAuthCallbackUrl", () => {
  it("accepts the app's auth callback, with any query", () => {
    expect(isAuthCallbackUrl(CALLBACK_URL)).toBe(true);
    expect(
      isAuthCallbackUrl("com.vuforge.ohkolab://auth/callback?code=x&state=y"),
    ).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isAuthCallbackUrl("https://ohkolab.com/auth/callback?code=x")).toBe(
      false,
    );
    expect(isAuthCallbackUrl("com.vuforge.ohkolab://auth/other")).toBe(false);
    expect(isAuthCallbackUrl("com.evil://auth/callback?code=x")).toBe(false);
    expect(isAuthCallbackUrl("")).toBe(false);
  });
});

describe("readNativeAuthFailure and clearNativeAuthFailure", () => {
  it("round-trips a failure", () => {
    sessionStorage.setItem(
      "ohkolab:auth:native-failure",
      JSON.stringify({ code: "unknown", message: "Sign-in failed." }),
    );
    expect(readNativeAuthFailure()).toEqual({
      code: "unknown",
      message: "Sign-in failed.",
    });
    clearNativeAuthFailure();
    expect(readNativeAuthFailure()).toBeNull();
  });

  it("returns null for missing or malformed entries", () => {
    expect(readNativeAuthFailure()).toBeNull();
    sessionStorage.setItem("ohkolab:auth:native-failure", "not json");
    expect(readNativeAuthFailure()).toBeNull();
    sessionStorage.setItem(
      "ohkolab:auth:native-failure",
      JSON.stringify({ message: "no code" }),
    );
    expect(readNativeAuthFailure()).toBeNull();
  });
});

describe("completeNativeAuthRedirect", () => {
  it("closes the browser, exchanges the code and navigates on", async () => {
    const auth = fakeAuth({
      ok: true,
      data: { returnTo: "/teams?slot=1" },
    });
    const navigate = vi.fn();

    await completeNativeAuthRedirect(auth, CALLBACK_URL, navigate);

    expect(browserClose).toHaveBeenCalledTimes(1);
    expect(auth.completeAuthRedirect).toHaveBeenCalledWith(CALLBACK_URL);
    expect(navigate).toHaveBeenCalledWith("/teams?slot=1");
    // A successful redirect leaves nothing behind for the callback page.
    expect(readNativeAuthFailure()).toBeNull();
  });

  it("keeps navigating when the browser is already closed", async () => {
    browserClose.mockRejectedValue(new Error("already closed"));
    const auth = fakeAuth({
      ok: true,
      data: { returnTo: "/" },
    });
    const navigate = vi.fn();

    await completeNativeAuthRedirect(auth, CALLBACK_URL, navigate);

    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("stashes the failure and sends the user to the callback page", async () => {
    const auth = fakeAuth({
      ok: false,
      error: { code: "link_invalid", message: "That link has expired." },
    });
    const navigate = vi.fn();

    await completeNativeAuthRedirect(auth, CALLBACK_URL, navigate);

    expect(navigate).toHaveBeenCalledWith("/auth/callback");
    expect(readNativeAuthFailure()).toEqual({
      code: "link_invalid",
      message: "That link has expired.",
    });
  });
});

describe("startNativeAuthListener", () => {
  it("registers a listener that finishes callback deep links", async () => {
    const auth = fakeAuth({ ok: true, data: { returnTo: "/" } });
    const navigate = vi.fn();

    await startNativeAuthListener(auth, { navigate });

    expect(appAddListener).toHaveBeenCalledWith(
      "appUrlOpen",
      expect.any(Function),
    );
    const handler = appAddListener.mock.calls[0]?.[1] as (event: {
      url?: string;
    }) => void;

    await handler({ url: CALLBACK_URL });
    await vi.waitFor(() => {
      expect(auth.completeAuthRedirect).toHaveBeenCalledWith(CALLBACK_URL);
    });
    expect(navigate).toHaveBeenCalledWith("/");

    // A deep link that is not the auth callback is ignored.
    auth.completeAuthRedirect.mockClear();
    await handler({ url: "com.vuforge.ohkolab://somewhere/else" });
    expect(auth.completeAuthRedirect).not.toHaveBeenCalled();
  });

  it("does nothing on the web", async () => {
    delete globalBridge.Capacitor;
    const auth = fakeAuth({ ok: true, data: { returnTo: "/" } });

    await startNativeAuthListener(auth);

    expect(appAddListener).not.toHaveBeenCalled();
    expect(auth.completeAuthRedirect).not.toHaveBeenCalled();
  });
});
