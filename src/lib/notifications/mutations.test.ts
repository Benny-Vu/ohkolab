import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { UseMutationResult } from "@tanstack/react-query";

import { GUEST_AUTH } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
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
} from "@/lib/social/test-client";
import type { SocialFailure, SocialResult } from "@/lib/social/errors";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/lib/notifications/mutations";

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
