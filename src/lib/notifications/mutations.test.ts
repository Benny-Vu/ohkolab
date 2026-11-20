import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { UseMutationResult } from "@tanstack/react-query";

import { GUEST_AUTH } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import type { AppSupabaseClient } from "@/lib/supabase";
import {
  markSocialNotInstalled,
  resetSocialInstallState,
} from "@/lib/social/availability";
import {
  createFakeClient,
  createQueryClient,
  createWrapper,
  expectFailed,
  SIGNED_IN_AUTH,
  type FakeClientConfig,
  type FakeResult,
} from "@/lib/social/test-client";
import type { SocialFailure, SocialResult } from "@/lib/social/errors";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/lib/notifications/mutations";
import type { NotificationItem } from "@/lib/notifications/types";

/**
 * Renders a mutation hook, runs it once and returns the value mutateAsync
 * itself resolved with. Reading result.current.data right after act can be
 * stale in this environment, so the resolution is captured directly.
 */
async function runMutation<TVars>(
  useHook: () => UseMutationResult<
    SocialResult<undefined>,
    SocialFailure,
    TVars
  >,
  variables: TVars,
  options: {
    auth?: AuthContextValue;
    queryClient?: ReturnType<typeof createQueryClient>;
  } = {},
): Promise<SocialResult<undefined>> {
  const queryClient = options.queryClient ?? createQueryClient();
  const { result } = renderHook(useHook, {
    wrapper: createWrapper(queryClient, options.auth ?? SIGNED_IN_AUTH),
  });
  let outcome: SocialResult<undefined> | undefined;
  await act(async () => {
    outcome = await result.current.mutateAsync(variables);
  });
  if (outcome === undefined) {
    throw new Error("the mutation did not resolve");
  }
  return outcome;
}

describe("useMarkNotificationRead", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("stamps read_at on the recipient's notification", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: null } },
    });
    const result = await runMutation(
      () => useMarkNotificationRead(fake.client),
      "n-1",
    );

    expect(result.ok).toBe(true);
    const record = fake.records.at(0);
    expect(record?.table).toBe("notifications");
    expect(record?.isDelete).toBe(false);
    expect(record?.eqFilters).toEqual([
      ["id", "n-1"],
      ["recipient_id", "user-1"],
    ]);
    expect(typeof record?.updateValues?.read_at).toBe("string");
  });

  it("invalidates the notification queries on success", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: null } },
    });
    const queryClient = createQueryClient();
    queryClient.setQueryData(["social", "notifications", "unread-count"], 5);

    await runMutation(() => useMarkNotificationRead(fake.client), "n-1", {
      queryClient,
    });

    expect(
      queryClient.getQueryState(["social", "notifications", "unread-count"])
        ?.isInvalidated,
    ).toBe(true);
  });

  it("fails when signed out", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      () => useMarkNotificationRead(fake.client),
      "n-1",
      { auth: GUEST_AUTH },
    );
    expectFailed(result, "not_signed_in");
  });

  it("fails without a client", async () => {
    const result = await runMutation(
      () => useMarkNotificationRead(null),
      "n-1",
    );
    expectFailed(result, "not_configured");
  });

  it("fails soft once the tables are known to be missing", async () => {
    markSocialNotInstalled();
    const result = await runMutation(
      () => useMarkNotificationRead(null),
      "n-1",
    );
    expectFailed(result, "not_installed");
  });

  it("maps database errors", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: { code: "42501" } } },
    });
    const result = await runMutation(
      () => useMarkNotificationRead(fake.client),
      "n-1",
    );
    expectFailed(result, "forbidden");
  });
});

describe("useMarkAllNotificationsRead", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("stamps read_at on every unread notification of the recipient", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: null } },
    });
    const result = await runMutation(
      () => useMarkAllNotificationsRead(fake.client),
      undefined,
    );

    expect(result.ok).toBe(true);
    const record = fake.records.at(0);
    expect(record?.eqFilters).toEqual([["recipient_id", "user-1"]]);
    expect(record?.isFilters).toEqual([["read_at", null]]);
    expect(typeof record?.updateValues?.read_at).toBe("string");
  });

  it("fails when signed out", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      () => useMarkAllNotificationsRead(fake.client),
      undefined,
      { auth: GUEST_AUTH },
    );
    expectFailed(result, "not_signed_in");
  });
});

describe("useDeleteNotification", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("deletes the recipient's notification", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: null } },
    });
    const result = await runMutation(
      () => useDeleteNotification(fake.client),
      "n-1",
    );

    expect(result.ok).toBe(true);
    const record = fake.records.at(0);
    expect(record?.isDelete).toBe(true);
    expect(record?.updateValues).toBeNull();
    expect(record?.eqFilters).toEqual([
      ["id", "n-1"],
      ["recipient_id", "user-1"],
    ]);
  });

  it("fails when signed out", async () => {
    const fake = createFakeClient();
    const result = await runMutation(
      () => useDeleteNotification(fake.client),
      "n-1",
      { auth: GUEST_AUTH },
    );
    expectFailed(result, "not_signed_in");
  });

  it("maps database errors", async () => {
    const fake = createFakeClient({
      tables: { notifications: { data: null, error: { code: "42501" } } },
    });
    const result = await runMutation(
      () => useDeleteNotification(fake.client),
      "n-1",
    );
    expectFailed(result, "forbidden");
  });
});

/** A notification with just the fields the optimistic writes touch. */
function item(
  partial: Partial<NotificationItem> & { id: string },
): NotificationItem {
  return {
    type: "like",
    postId: null,
    commentId: null,
    groupId: null,
    moderationActionId: null,
    createdAt: "2026-11-18T10:00:00.000Z",
    readAt: null,
    actor: null,
    group: null,
    moderationAction: null,
    ...partial,
  };
}

/**
 * A resolver whose every awaited chain resolves only when the test says so,
 * so the optimistic cache writes can be observed mid-flight.
 */
function deferredChains() {
  const gates: Array<(value: FakeResult) => void> = [];
  const config: FakeClientConfig = {
    resolve: () =>
      new Promise<FakeResult>((resolve) => {
        gates.push(resolve);
      }) as unknown as FakeResult,
  };
  return {
    config,
    async settle(index: number, value: FakeResult): Promise<void> {
      await waitFor(() => expect(gates.length).toBeGreaterThan(index));
      gates[index]!(value);
    },
  };
}

/** Seeds the cached list and unread count the way the page reads them. */
function seedNotifications(
  queryClient: ReturnType<typeof createQueryClient>,
  items: NotificationItem[],
  unread: number,
): void {
  queryClient.setQueryData(["social", "notifications", "list"], {
    pages: [items],
    pageParams: [null],
  });
  queryClient.setQueryData(["social", "notifications", "unread-count"], unread);
}

function readCachedItems(
  queryClient: ReturnType<typeof createQueryClient>,
): NotificationItem[] {
  return (
    queryClient.getQueryData<{
      pages: NotificationItem[][];
    }>(["social", "notifications", "list"])?.pages[0] ?? []
  );
}

/** Runs one mutation against its own query client, mid-flight observable. */
function begin<TVars>(
  useHook: (client?: AppSupabaseClient | null) => {
    mutateAsync: (variables: TVars) => Promise<unknown>;
  },
  variables: TVars,
  queryClient: ReturnType<typeof createQueryClient>,
  client: AppSupabaseClient | null,
) {
  const hook = renderHook(() => useHook(client), {
    wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
  });
  let settled = false;
  act(() => {
    void hook.result.current.mutateAsync(variables).finally(() => {
      settled = true;
    });
  });
  return {
    async done(): Promise<void> {
      await waitFor(() => expect(settled).toBe(true));
    },
  };
}

describe("notification mutations, optimistic writes", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("marks one notification read in the cache before the server answers", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seedNotifications(
      queryClient,
      [
        item({ id: "n-1" }),
        item({ id: "n-2", readAt: "2026-11-18T12:00:00.000Z" }),
      ],
      1,
    );

    const run = begin(useMarkNotificationRead, "n-1", queryClient, fake.client);

    // Read at once, and the bell count dropped with it.
    expect(readCachedItems(queryClient)[0]?.readAt).not.toBeNull();
    expect(readCachedItems(queryClient)[1]?.readAt).toBe(
      "2026-11-18T12:00:00.000Z",
    );
    expect(
      queryClient.getQueryData(["social", "notifications", "unread-count"]),
    ).toBe(0);

    await settle(0, { data: null, error: null });
    await run.done();
    expect(readCachedItems(queryClient)[0]?.readAt).not.toBeNull();
  });

  it("rolls the optimistic read back when the server refuses", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seedNotifications(queryClient, [item({ id: "n-1" })], 1);

    const run = begin(useMarkNotificationRead, "n-1", queryClient, fake.client);

    expect(readCachedItems(queryClient)[0]?.readAt).not.toBeNull();

    await settle(0, { data: null, error: { code: "42501", message: "no" } });
    await run.done();

    // Unread again, and the bell count with it.
    expect(readCachedItems(queryClient)[0]?.readAt).toBeNull();
    expect(
      queryClient.getQueryData(["social", "notifications", "unread-count"]),
    ).toBe(1);
  });

  it("marks every cached notification read at once", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seedNotifications(
      queryClient,
      [item({ id: "n-1" }), item({ id: "n-2" })],
      2,
    );

    const run = begin(
      useMarkAllNotificationsRead,
      undefined,
      queryClient,
      fake.client,
    );

    expect(
      readCachedItems(queryClient).every((entry) => entry.readAt !== null),
    ).toBe(true);
    expect(
      queryClient.getQueryData(["social", "notifications", "unread-count"]),
    ).toBe(0);

    await settle(0, { data: null, error: { code: "42501", message: "no" } });
    await run.done();

    // Refused: everything is unread again.
    expect(
      readCachedItems(queryClient).every((entry) => entry.readAt === null),
    ).toBe(true);
    expect(
      queryClient.getQueryData(["social", "notifications", "unread-count"]),
    ).toBe(2);
  });

  it("removes a deleted notification from the cache and rolls back on refusal", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seedNotifications(
      queryClient,
      [item({ id: "n-1" }), item({ id: "n-2" })],
      2,
    );

    const run = begin(useDeleteNotification, "n-1", queryClient, fake.client);

    expect(readCachedItems(queryClient).map((entry) => entry.id)).toEqual([
      "n-2",
    ]);
    expect(
      queryClient.getQueryData(["social", "notifications", "unread-count"]),
    ).toBe(1);

    await settle(0, { data: null, error: { code: "42501", message: "no" } });
    await run.done();

    expect(readCachedItems(queryClient).map((entry) => entry.id)).toEqual([
      "n-1",
      "n-2",
    ]);
    expect(
      queryClient.getQueryData(["social", "notifications", "unread-count"]),
    ).toBe(2);
  });
});
