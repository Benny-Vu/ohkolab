import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  registerIfAlreadyGranted,
  requestPermissionAndRegister,
  setupPushNotifications,
} from "@/lib/push/notifications";
import type { PushPlugin } from "@/lib/push/plugin";
import {
  clearRememberedDeviceToken,
  knownDeviceToken,
} from "@/lib/push/tokens";
import { createFakePushClient } from "@/lib/push/test-client";

type Bridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

/** The glue's view of the plugin, with per-event listener capture. */
interface FakePlugin {
  plugin: PushPlugin;
  checkPermissions: ReturnType<typeof vi.fn>;
  requestPermissions: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  listeners: Map<string, (event: unknown) => void>;
  removed: string[];
}

function createFakePlugin() {
  const listeners = new Map<string, (event: unknown) => void>();
  const removed: string[] = [];
  const checkPermissions = vi.fn(async () => ({ receive: "prompt" }));
  const requestPermissions = vi.fn(async () => ({ receive: "granted" }));
  const register = vi.fn(async () => {});
  const addListener = vi.fn(
    async (event: string, listener: (event: unknown) => void) => {
      listeners.set(event, listener);
      return {
        remove: () => {
          removed.push(event);
        },
      };
    },
  );
  const plugin = {
    checkPermissions,
    requestPermissions,
    register,
    addListener,
    removeAllListeners: vi.fn(async () => {}),
  } as unknown as PushPlugin;
  return {
    plugin,
    checkPermissions,
    requestPermissions,
    register,
    listeners,
    removed,
  } as FakePlugin;
}

function nativeOn(): void {
  vi.stubEnv("VITE_PUSH", "true");
  globalWithBridge.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => "android",
  };
}

beforeEach(() => {
  clearRememberedDeviceToken();
});

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  clearRememberedDeviceToken();
});

describe("registerIfAlreadyGranted", () => {
  it("registers when permission is already granted", async () => {
    const fake = createFakePlugin();
    fake.checkPermissions.mockResolvedValue({ receive: "granted" });

    await expect(registerIfAlreadyGranted(fake.plugin)).resolves.toBe(true);
    expect(fake.register).toHaveBeenCalledOnce();
  });

  it("never registers, never prompts, on a prompt state", async () => {
    const fake = createFakePlugin();
    fake.checkPermissions.mockResolvedValue({ receive: "prompt" });

    await expect(registerIfAlreadyGranted(fake.plugin)).resolves.toBe(false);
    expect(fake.register).not.toHaveBeenCalled();
    expect(fake.requestPermissions).not.toHaveBeenCalled();
  });

  it("does not register when the user has denied", async () => {
    const fake = createFakePlugin();
    fake.checkPermissions.mockResolvedValue({ receive: "denied" });

    await expect(registerIfAlreadyGranted(fake.plugin)).resolves.toBe(false);
    expect(fake.register).not.toHaveBeenCalled();
    expect(fake.requestPermissions).not.toHaveBeenCalled();
  });
});

describe("requestPermissionAndRegister", () => {
  it("asks and registers when the OS allows the prompt", async () => {
    const fake = createFakePlugin();
    fake.checkPermissions.mockResolvedValue({
      receive: "prompt-with-permission-request",
    });

    await expect(requestPermissionAndRegister(fake.plugin)).resolves.toBe(
      "registered",
    );
    expect(fake.requestPermissions).toHaveBeenCalledOnce();
    expect(fake.register).toHaveBeenCalledOnce();
  });

  it("registers without asking when permission is already granted", async () => {
    const fake = createFakePlugin();
    fake.checkPermissions.mockResolvedValue({ receive: "granted" });

    await expect(requestPermissionAndRegister(fake.plugin)).resolves.toBe(
      "registered",
    );
    expect(fake.requestPermissions).not.toHaveBeenCalled();
    expect(fake.register).toHaveBeenCalledOnce();
  });

  it("gives up without asking when the OS dialog is blocked", async () => {
    const fake = createFakePlugin();
    fake.checkPermissions.mockResolvedValue({ receive: "denied" });

    await expect(requestPermissionAndRegister(fake.plugin)).resolves.toBe(
      "denied",
    );
    expect(fake.requestPermissions).not.toHaveBeenCalled();
    expect(fake.register).not.toHaveBeenCalled();
  });

  it("gives up when the user answers the OS dialog with no", async () => {
    const fake = createFakePlugin();
    fake.checkPermissions.mockResolvedValue({ receive: "prompt" });
    fake.requestPermissions.mockResolvedValue({ receive: "denied" });

    await expect(requestPermissionAndRegister(fake.plugin)).resolves.toBe(
      "denied",
    );
    expect(fake.register).not.toHaveBeenCalled();
  });
});

describe("setupPushNotifications", () => {
  it("registers the three listeners and cleans them up", async () => {
    nativeOn();
    const fake = createFakePlugin();
    const { client } = createFakePushClient();
    const authListeners: Array<(event: string) => void> = [];
    const unsubscribe = vi.fn();

    const dispose = await setupPushNotifications({
      plugin: fake.plugin,
      client,
      getUserId: async () => "user-1",
      navigate: vi.fn(),
      subscribeToAuth: (listener) => {
        authListeners.push(listener);
        return unsubscribe;
      },
    });

    expect(fake.listeners.size).toBe(3);
    expect([...fake.listeners.keys()]).toEqual(
      expect.arrayContaining([
        "registration",
        "registrationError",
        "pushNotificationActionPerformed",
      ]),
    );

    dispose();

    expect(fake.removed).toHaveLength(3);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("registers the token through the RPC on the registration event", async () => {
    nativeOn();
    const fake = createFakePlugin();
    const { client, rpcCalls } = createFakePushClient();

    await setupPushNotifications({
      plugin: fake.plugin,
      client,
      getUserId: async () => "user-1",
      navigate: vi.fn(),
      subscribeToAuth: () => () => {},
    });

    // The launch registration, and FCM's rotation, both land here.
    fake.listeners.get("registration")?.({ value: "fcm-token" });
    await vi.waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0]).toEqual({
      fn: "register_push_token",
      args: { p_token: "fcm-token", p_platform: "android" },
    });
    expect(knownDeviceToken()).toBe("fcm-token");

    // Rotation: the same listener, a new token, the RPC again.
    fake.listeners.get("registration")?.({ value: "fcm-token-2" });
    await vi.waitFor(() => expect(rpcCalls).toHaveLength(2));
    expect(rpcCalls[1]?.args.p_token).toBe("fcm-token-2");
  });

  it("skips the RPC while nobody is signed in", async () => {
    nativeOn();
    const fake = createFakePlugin();
    const { client, rpcCalls } = createFakePushClient();

    await setupPushNotifications({
      plugin: fake.plugin,
      client,
      getUserId: async () => null,
      navigate: vi.fn(),
      subscribeToAuth: () => () => {},
    });

    fake.listeners.get("registration")?.({ value: "fcm-token" });
    expect(knownDeviceToken()).toBe("fcm-token");
    await actgap();
    await actgap();
    expect(rpcCalls).toHaveLength(0);
  });

  it("navigates in-app paths on notification taps, including the cold-start replay", async () => {
    nativeOn();
    const fake = createFakePlugin();
    const navigate = vi.fn();

    await setupPushNotifications({
      plugin: fake.plugin,
      client: null,
      getUserId: async () => "user-1",
      navigate,
      subscribeToAuth: () => () => {},
    });

    const tap = fake.listeners.get("pushNotificationActionPerformed");
    expect(tap).toBeTypeOf("function");

    // The cold-start tap: the plugin replays the launch event right after
    // this listener exists, before anything else happens.
    tap?.({ notification: { data: { path: "/post/abc" } } });
    expect(navigate).toHaveBeenCalledWith("/post/abc");

    // Later taps while the app is open navigate the same way.
    tap?.({ notification: { data: { path: "/u/misty" } } });
    expect(navigate).toHaveBeenCalledWith("/u/misty");

    // A payload without a usable in-app path never navigates.
    tap?.({ notification: { data: { path: "https://evil.example" } } });
    tap?.({ notification: {} });
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it("re-registers silently after sign-in only when permission is granted", async () => {
    nativeOn();
    const fake = createFakePlugin();
    const authListeners: Array<(event: string) => void> = [];

    await setupPushNotifications({
      plugin: fake.plugin,
      client: null,
      getUserId: async () => "user-1",
      navigate: vi.fn(),
      subscribeToAuth: (listener) => {
        authListeners.push(listener);
        return () => {};
      },
    });
    fake.checkPermissions.mockResolvedValue({ receive: "granted" });

    // App start while signed in (supabase-js fires INITIAL_SESSION).
    emitAuth(authListeners, "INITIAL_SESSION");
    await vi.waitFor(() => expect(fake.register).toHaveBeenCalledOnce());

    // An explicit sign-in.
    emitAuth(authListeners, "SIGNED_IN");
    await vi.waitFor(() => expect(fake.register).toHaveBeenCalledTimes(2));
    expect(fake.requestPermissions).not.toHaveBeenCalled();
  });

  it("never prompts during the silent flow", async () => {
    nativeOn();
    const fake = createFakePlugin();
    fake.checkPermissions.mockResolvedValue({ receive: "prompt" });
    const authListeners: Array<(event: string) => void> = [];

    await setupPushNotifications({
      plugin: fake.plugin,
      client: null,
      getUserId: async () => "user-1",
      navigate: vi.fn(),
      subscribeToAuth: (listener) => {
        authListeners.push(listener);
        return () => {};
      },
    });

    emitAuth(authListeners, "INITIAL_SESSION");
    emitAuth(authListeners, "SIGNED_IN");
    await actgap();
    expect(fake.register).not.toHaveBeenCalled();
    expect(fake.requestPermissions).not.toHaveBeenCalled();
  });

  it("deletes this device's token row on sign-out", async () => {
    nativeOn();
    const fake = createFakePlugin();
    const { client, records, rpcCalls } = createFakePushClient();
    const authListeners: Array<(event: string) => void> = [];

    await setupPushNotifications({
      plugin: fake.plugin,
      client,
      getUserId: async () => "user-1",
      navigate: vi.fn(),
      subscribeToAuth: (listener) => {
        authListeners.push(listener);
        return () => {};
      },
    });

    // Register first, so the cleanup has a token to delete.
    fake.listeners.get("registration")?.({ value: "fcm-token" });
    await vi.waitFor(() => expect(rpcCalls).toHaveLength(1));

    emitAuth(authListeners, "SIGNED_OUT");
    await vi.waitFor(() => expect(records).toHaveLength(1));
    expect(records[0]).toMatchObject({ table: "push_tokens" });
    expect(records[0]?.eqFilters).toContainEqual(["token", "fcm-token"]);
    expect(knownDeviceToken()).toBeNull();
  });

  it("ignores unrelated auth events", async () => {
    nativeOn();
    const fake = createFakePlugin();
    const authListeners: Array<(event: string) => void> = [];

    await setupPushNotifications({
      plugin: fake.plugin,
      client: null,
      getUserId: async () => "user-1",
      navigate: vi.fn(),
      subscribeToAuth: (listener) => {
        authListeners.push(listener);
        return () => {};
      },
    });

    emitAuth(authListeners, "TOKEN_REFRESHED");
    emitAuth(authListeners, "PASSWORD_RECOVERY");
    await actgap();
    expect(fake.register).not.toHaveBeenCalled();
  });

  it("does nothing when the flag is off — no plugin call at all", async () => {
    vi.stubEnv("VITE_PUSH", "");
    globalWithBridge.Capacitor = { isNativePlatform: () => true };
    const fake = createFakePlugin();

    const dispose = await setupPushNotifications({
      plugin: fake.plugin,
      client: null,
      getUserId: async () => "user-1",
      navigate: vi.fn(),
      subscribeToAuth: () => () => {},
    });
    dispose();

    expect(fake.checkPermissions).not.toHaveBeenCalled();
    expect(fake.register).not.toHaveBeenCalled();
    expect(fake.listeners.size).toBe(0);
  });

  it("does nothing on the web, flag or not", async () => {
    vi.stubEnv("VITE_PUSH", "true");
    const fake = createFakePlugin();

    const dispose = await setupPushNotifications({
      plugin: fake.plugin,
      client: null,
      getUserId: async () => "user-1",
      navigate: vi.fn(),
      subscribeToAuth: () => () => {},
    });
    dispose();

    expect(fake.checkPermissions).not.toHaveBeenCalled();
    expect(fake.listeners.size).toBe(0);
  });
});

/** Lets pending microtasks (auth-triggered registrations) settle. */
async function actgap(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Fires an event at the registered auth listener (strict-safe). */
function emitAuth(
  listeners: Array<(event: string) => void>,
  event: string,
): void {
  const listener = listeners[0];
  if (listener === undefined) {
    throw new Error("the auth listener was not registered");
  }
  listener(event);
}
