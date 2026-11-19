import { beforeEach, describe, expect, it } from "vitest";

import {
  clearRememberedDeviceToken,
  deletePushToken,
  deleteRememberedPushToken,
  knownDeviceToken,
  notificationPath,
  registerPushToken,
  rememberDeviceToken,
} from "@/lib/push/tokens";
import { createFakePushClient } from "@/lib/push/test-client";

describe("notificationPath", () => {
  it("reads the in-app path from the notification payload", () => {
    expect(
      notificationPath({
        notification: { data: { path: "/post/abc" } },
      }),
    ).toBe("/post/abc");
  });

  it("supports every deep-link shape the Edge Function sends", () => {
    for (const path of [
      "/u/misty",
      "/g/vgc-doubles",
      "/messages/conv-1",
      "/notifications",
    ]) {
      expect(notificationPath({ notification: { data: { path } } })).toBe(path);
    }
  });

  it("ignores payloads without a usable path", () => {
    expect(notificationPath(null)).toBeNull();
    expect(notificationPath({})).toBeNull();
    expect(notificationPath({ notification: null })).toBeNull();
    expect(notificationPath({ notification: { data: null } })).toBeNull();
    expect(notificationPath({ notification: { data: {} } })).toBeNull();
    expect(
      notificationPath({ notification: { data: { path: 1 } } }),
    ).toBeNull();
    expect(
      notificationPath({ notification: { data: { path: "" } } }),
    ).toBeNull();
  });

  it("ignores anything that is not an in-app path", () => {
    // No leading slash: a URL or an arbitrary string.
    expect(
      notificationPath({
        notification: { data: { path: "https://evil.example" } },
      }),
    ).toBeNull();
    // Protocol-relative URL: a leading "//" would leave the app.
    expect(
      notificationPath({ notification: { data: { path: "//evil.example" } } }),
    ).toBeNull();
  });
});

describe("registerPushToken", () => {
  it("registers through the RPC, never a table write", async () => {
    const { client, records, rpcCalls } = createFakePushClient();

    const saved = await registerPushToken(client, "fcm-token", "android");

    expect(saved).toBe(true);
    expect(rpcCalls).toEqual([
      {
        fn: "register_push_token",
        args: { p_token: "fcm-token", p_platform: "android" },
      },
    ]);
    expect(records).toEqual([]);
  });

  it("reports a failed RPC", async () => {
    const { client } = createFakePushClient(undefined, () => ({
      data: null,
      error: { message: "nope" },
    }));
    await expect(
      registerPushToken(client, "fcm-token", "android"),
    ).resolves.toBe(false);
  });

  it("does nothing without a client or a token", async () => {
    const { client, rpcCalls } = createFakePushClient();
    await expect(registerPushToken(null, "fcm-token")).resolves.toBe(false);
    await expect(registerPushToken(client, "")).resolves.toBe(false);
    expect(rpcCalls).toEqual([]);
  });
});

describe("deletePushToken", () => {
  it("deletes my own row by token", async () => {
    const { client, records } = createFakePushClient();

    const deleted = await deletePushToken(client, "fcm-token");

    expect(deleted).toBe(true);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      table: "push_tokens",
      upsertValues: null,
    });
    expect(records[0]?.eqFilters).toContainEqual(["token", "fcm-token"]);
  });

  it("reports a failed delete", async () => {
    const { client } = createFakePushClient(() => ({
      data: null,
      error: { message: "nope" },
    }));
    await expect(deletePushToken(client, "fcm-token")).resolves.toBe(false);
  });

  it("does nothing without a client or a token", async () => {
    const { client, records } = createFakePushClient();
    await expect(deletePushToken(null, "fcm-token")).resolves.toBe(false);
    await expect(deletePushToken(client, "")).resolves.toBe(false);
    expect(records).toEqual([]);
  });
});

describe("remembered device token", () => {
  beforeEach(() => {
    clearRememberedDeviceToken();
  });

  it("is null until a registration remembers it", async () => {
    expect(knownDeviceToken()).toBeNull();
    await expect(deleteRememberedPushToken(null)).resolves.toBe(false);
  });

  it("is remembered, then deleted and forgotten", async () => {
    const { client, records } = createFakePushClient();
    rememberDeviceToken("fcm-token");
    expect(knownDeviceToken()).toBe("fcm-token");

    const deleted = await deleteRememberedPushToken(client);

    expect(deleted).toBe(true);
    expect(knownDeviceToken()).toBeNull();
    expect(records).toHaveLength(1);
    expect(records[0]?.eqFilters).toContainEqual(["token", "fcm-token"]);
  });

  it("keeps the token when the delete fails", async () => {
    const { client } = createFakePushClient(() => ({
      data: null,
      error: { message: "nope" },
    }));
    rememberDeviceToken("fcm-token");

    await expect(deleteRememberedPushToken(client)).resolves.toBe(false);
    expect(knownDeviceToken()).toBe("fcm-token");
  });
});
