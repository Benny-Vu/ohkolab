import { describe, expect, it, vi } from "vitest";

import { getPushPlugin } from "@/lib/push/plugin";

// A stand-in for the Capacitor plugin proxy: every property is a method,
// and `then` rejects exactly like the native bridge does for a method the
// plugin doesn't implement.
const calls: string[] = [];
const proxy = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "then") {
        return () => {
          throw new Error('"PushNotifications.then()" is not implemented');
        };
      }
      return (...args: unknown[]) => {
        calls.push(String(prop));
        if (prop === "checkPermissions") {
          return Promise.resolve({ receive: "prompt" });
        }
        if (prop === "addListener") {
          return Promise.resolve({ remove: () => args });
        }
        return Promise.resolve();
      };
    },
  },
);

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: proxy,
}));

describe("getPushPlugin", () => {
  it("resolves even though the plugin proxy answers `then`", async () => {
    const plugin = await getPushPlugin();
    await expect(plugin.checkPermissions()).resolves.toEqual({
      receive: "prompt",
    });
  });

  it("forwards every method to the native plugin", async () => {
    calls.length = 0;
    const plugin = await getPushPlugin();
    await plugin.requestPermissions();
    await plugin.register();
    await plugin.addListener("registration", () => {});
    await plugin.removeAllListeners();
    expect(calls).toEqual([
      "requestPermissions",
      "register",
      "addListener",
      "removeAllListeners",
    ]);
  });
});
