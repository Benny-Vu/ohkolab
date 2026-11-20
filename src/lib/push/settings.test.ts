import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PUSH_SETTINGS,
  normalizePushSettings,
  readPushSettings,
  usePushSettings,
  useUpdatePushSettings,
  writePushSettings,
  type PushSettings,
} from "@/lib/push/settings";
import { createFakePushClient } from "@/lib/push/test-client";
import {
  createQueryClient,
  createWrapper,
  SIGNED_IN_AUTH,
} from "@/lib/messages/test-client";

type Bridge = {
  isNativePlatform?: () => boolean;
};

const globalWithBridge = globalThis as { Capacitor?: Bridge };

const SETTINGS_ROW = {
  user_id: "user-1",
  enabled: true,
  likes: true,
  comments: false,
  follows: true,
  groups: false,
  messages: true,
};

function nativeOn(): void {
  vi.stubEnv("VITE_PUSH", "true");
  globalWithBridge.Capacitor = { isNativePlatform: () => true };
}

afterEach(() => {
  delete globalWithBridge.Capacitor;
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("normalizePushSettings", () => {
  it("means everything-on for a missing row", () => {
    expect(normalizePushSettings(null)).toEqual(DEFAULT_PUSH_SETTINGS);
    expect(normalizePushSettings(undefined)).toEqual(DEFAULT_PUSH_SETTINGS);
  });

  it("keeps the booleans of a full row", () => {
    expect(normalizePushSettings(SETTINGS_ROW)).toEqual({
      enabled: true,
      likes: true,
      comments: false,
      follows: true,
      groups: false,
      messages: true,
    });
  });

  it("defaults the fields a malformed row is missing", () => {
    expect(normalizePushSettings({ enabled: false, likes: "yes" })).toEqual({
      ...DEFAULT_PUSH_SETTINGS,
      enabled: false,
    });
  });
});

describe("readPushSettings", () => {
  it("reads my row", async () => {
    const { client, records } = createFakePushClient((record) => {
      if (record.table === "push_settings" && record.isMaybeSingle) {
        return { data: SETTINGS_ROW, error: null };
      }
      return { data: null, error: null };
    });

    const settings = await readPushSettings(client, "user-1");

    expect(settings.comments).toBe(false);
    expect(records[0]).toMatchObject({ table: "push_settings" });
    expect(records[0]?.eqFilters).toContainEqual(["user_id", "user-1"]);
  });

  it("falls back to everything-on without a row or on a failed read", async () => {
    const missing = createFakePushClient(() => ({ data: null, error: null }));
    await expect(readPushSettings(missing.client, "user-1")).resolves.toEqual(
      DEFAULT_PUSH_SETTINGS,
    );

    const failing = createFakePushClient(() => ({
      data: null,
      error: { message: "nope" },
    }));
    await expect(readPushSettings(failing.client, "user-1")).resolves.toEqual(
      DEFAULT_PUSH_SETTINGS,
    );

    await expect(readPushSettings(null, "user-1")).resolves.toEqual(
      DEFAULT_PUSH_SETTINGS,
    );
  });
});

describe("writePushSettings", () => {
  it("upserts the full settings row", async () => {
    const { client, records } = createFakePushClient();
    const next: PushSettings = { ...DEFAULT_PUSH_SETTINGS, likes: false };

    const saved = await writePushSettings(client, "user-1", next);

    expect(saved).toBe(true);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ table: "push_settings" });
    expect(records[0]?.upsertValues).toMatchObject({
      user_id: "user-1",
      enabled: true,
      likes: false,
      comments: true,
      follows: true,
      groups: true,
      messages: true,
    });
  });

  it("reports failures and refuses to write without a client", async () => {
    const failing = createFakePushClient(() => ({
      data: null,
      error: { message: "nope" },
    }));
    await expect(
      writePushSettings(failing.client, "user-1", DEFAULT_PUSH_SETTINGS),
    ).resolves.toBe(false);
    await expect(
      writePushSettings(null, "user-1", DEFAULT_PUSH_SETTINGS),
    ).resolves.toBe(false);
  });
});

describe("usePushSettings", () => {
  it("queries only when push is available", async () => {
    // Flag off: the hook stays disabled, nothing is queried.
    vi.stubEnv("VITE_PUSH", "");
    const offline = createFakePushClient();
    const offlineHook = renderHook(() => usePushSettings(offline.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });
    await actgap();
    expect(offline.records).toEqual([]);
    expect(offlineHook.result.current.data).toBeUndefined();
    offlineHook.unmount();
  });

  it("resolves my settings when push is available", async () => {
    nativeOn();
    const fake = createFakePushClient((record) => {
      if (record.table === "push_settings" && record.isMaybeSingle) {
        return { data: SETTINGS_ROW, error: null };
      }
      return { data: null, error: null };
    });

    const { result } = renderHook(() => usePushSettings(fake.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.comments).toBe(false);
    expect(result.current.data?.groups).toBe(false);
  });
});

describe("useUpdatePushSettings", () => {
  it("writes the settings when push is available", async () => {
    nativeOn();
    const fake = createFakePushClient();

    const { result } = renderHook(() => useUpdatePushSettings(fake.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });

    result.current.mutate({ ...DEFAULT_PUSH_SETTINGS, follows: false });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toBe(true);
    expect(fake.records[0]?.upsertValues).toMatchObject({
      user_id: "user-1",
      follows: false,
    });
  });

  it("refuses to write when push is unavailable", async () => {
    vi.stubEnv("VITE_PUSH", "");
    const fake = createFakePushClient();

    const { result } = renderHook(() => useUpdatePushSettings(fake.client), {
      wrapper: createWrapper(createQueryClient(), SIGNED_IN_AUTH),
    });

    result.current.mutate(DEFAULT_PUSH_SETTINGS);
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toBe(false);
    expect(fake.records).toEqual([]);
  });

  it("flips the cached settings before the write settles, and rolls back on failure", async () => {
    nativeOn();
    // The upsert only resolves when the test says so.
    let settle!: (result: { data: unknown; error: unknown }) => void;
    const gate = new Promise<{ data: unknown; error: unknown }>((resolve) => {
      settle = resolve;
    });
    const fake = createFakePushClient(
      () => gate as unknown as { data: unknown; error: unknown },
    );
    const queryClient = createQueryClient();
    const initial = { ...DEFAULT_PUSH_SETTINGS };
    queryClient.setQueryData(["push", "settings", "user-1"], initial);

    const { result } = renderHook(() => useUpdatePushSettings(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    let settled = false;
    act(() => {
      void result.current
        .mutateAsync({ ...initial, follows: false })
        .finally(() => {
          settled = true;
        });
    });

    // The switch reads the cache: it has flipped already.
    expect(
      queryClient.getQueryData<PushSettings>(["push", "settings", "user-1"])
        ?.follows,
    ).toBe(false);

    // The write fails: the switch flips back.
    settle({ data: null, error: { code: "42501", message: "no" } });
    await waitFor(() => expect(settled).toBe(true));
    expect(
      queryClient.getQueryData<PushSettings>(["push", "settings", "user-1"])
        ?.follows,
    ).toBe(true);
  });

  it("keeps the optimistic settings when the write succeeds", async () => {
    nativeOn();
    const fake = createFakePushClient();
    const queryClient = createQueryClient();
    const initial = { ...DEFAULT_PUSH_SETTINGS };
    queryClient.setQueryData(["push", "settings", "user-1"], initial);

    const { result } = renderHook(() => useUpdatePushSettings(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    let settled = false;
    act(() => {
      void result.current
        .mutateAsync({ ...initial, follows: false })
        .finally(() => {
          settled = true;
        });
    });
    await waitFor(() => expect(settled).toBe(true));

    expect(
      queryClient.getQueryData<PushSettings>(["push", "settings", "user-1"])
        ?.follows,
    ).toBe(false);
  });
});

/** Lets a disabled query settle so the assertions run after the effect. */
async function actgap(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
