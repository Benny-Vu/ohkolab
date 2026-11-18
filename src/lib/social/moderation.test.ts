import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  APPEAL_MESSAGE_MAX,
  APPEAL_MESSAGE_MIN,
  normalizeAppealMessage,
  useAppealForAction,
  useAppeals,
  useCreateAppeal,
  useHandleAppeal,
  useModerationAction,
  useModerationTargetText,
  useOwnSuspensions,
  validateAppealMessage,
  type CreateAppealInput,
  type HandleAppealInput,
} from "@/lib/social/moderation";
import type { UserSuspensionRow } from "@/lib/database.types";
import { resetSocialInstallState } from "@/lib/social/availability";
import type { SocialResult } from "@/lib/social/errors";
import {
  appealRow,
  createFakeClient,
  createQueryClient,
  createWrapper,
  moderationActionRow,
  SIGNED_IN_AUTH,
  type ChainRecord,
} from "@/lib/social/test-client";

function callsOn(records: ChainRecord[], table: string): ChainRecord[] {
  return records.filter((record) => record.table === table);
}

const SIGNED_OUT_AUTH = { ...SIGNED_IN_AUTH, user: null };

/** Renders a mutation hook and runs it once, returning the SocialResult. */
async function runMutation<TVars>(
  useHook: () => {
    mutateAsync: (vars: TVars) => Promise<SocialResult<undefined>>;
  },
  variables: TVars,
  options: { auth?: typeof SIGNED_IN_AUTH } = {},
): Promise<SocialResult<undefined>> {
  const queryClient = createQueryClient();
  const { result } = renderHook(useHook, {
    wrapper: createWrapper(queryClient, options.auth ?? SIGNED_IN_AUTH),
  });
  return result.current.mutateAsync(variables);
}

describe("validateAppealMessage", () => {
  it("accepts a normal message", () => {
    expect(validateAppealMessage("Please reconsider.")).toBeNull();
  });

  it("rejects an empty message", () => {
    expect(validateAppealMessage("")).toBe(
      "Write a message for the moderators.",
    );
  });

  it("rejects a message over the limit", () => {
    const long = "a".repeat(APPEAL_MESSAGE_MAX + 1);
    expect(validateAppealMessage(long)).toBe(
      `Appeals are limited to ${APPEAL_MESSAGE_MAX} characters.`,
    );
  });

  it("accepts a message exactly at the limit", () => {
    const exact = "a".repeat(APPEAL_MESSAGE_MAX);
    expect(validateAppealMessage(exact)).toBeNull();
  });

  it("has a positive minimum", () => {
    expect(APPEAL_MESSAGE_MIN).toBe(1);
  });
});

describe("normalizeAppealMessage", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeAppealMessage("  hello  ")).toBe("hello");
  });
});

describe("useHandleAppeal", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls handle_appeal with the appeal id and decision", async () => {
    const { client, rpcCalls } = createFakeClient({
      rpc: { handle_appeal: { data: null, error: null } },
    });
    const result = await runMutation(() => useHandleAppeal(client), {
      appealId: "appeal-1",
      decision: "upheld",
    } satisfies HandleAppealInput);
    expect(result.ok).toBe(true);
    expect(rpcCalls).toEqual([
      {
        fn: "handle_appeal",
        args: { target_appeal_id: "appeal-1", decision: "upheld" },
      },
    ]);
  });

  it("passes a reversed decision through", async () => {
    const { client, rpcCalls } = createFakeClient({
      rpc: { handle_appeal: { data: null, error: null } },
    });
    const result = await runMutation(() => useHandleAppeal(client), {
      appealId: "appeal-2",
      decision: "reversed",
    } satisfies HandleAppealInput);
    expect(result.ok).toBe(true);
    expect(rpcCalls[0]?.args?.decision).toBe("reversed");
  });

  it("rejects an unknown decision without calling the rpc", async () => {
    const { client, rpcCalls } = createFakeClient({
      rpc: { handle_appeal: { data: null, error: null } },
    });
    const result = await runMutation(() => useHandleAppeal(client), {
      appealId: "appeal-1",
      decision: "maybe",
    } as unknown as HandleAppealInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_input");
    }
    expect(rpcCalls).toHaveLength(0);
  });

  it("fails when signed out", async () => {
    const { client, rpcCalls } = createFakeClient({
      rpc: { handle_appeal: { data: null, error: null } },
    });
    const result = await runMutation(
      () => useHandleAppeal(client),
      { appealId: "appeal-1", decision: "upheld" } satisfies HandleAppealInput,
      { auth: SIGNED_OUT_AUTH },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not_signed_in");
    }
    expect(rpcCalls).toHaveLength(0);
  });

  it("surfaces rpc errors", async () => {
    const { client } = createFakeClient({
      rpc: {
        handle_appeal: {
          data: null,
          error: { code: "42501", message: "Moderators only." },
        },
      },
    });
    const result = await runMutation(() => useHandleAppeal(client), {
      appealId: "appeal-1",
      decision: "upheld",
    } satisfies HandleAppealInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("forbidden");
    }
  });
});

describe("useCreateAppeal", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("inserts the appeal with the signed-in user as appellant", async () => {
    const { client, records } = createFakeClient({
      tables: { appeals: { data: null, error: null } },
    });
    const result = await runMutation(() => useCreateAppeal(client), {
      moderationActionId: "action-1",
      message: "  Please reconsider.  ",
    } satisfies CreateAppealInput);
    expect(result.ok).toBe(true);
    const appealCalls = callsOn(records, "appeals");
    expect(appealCalls).toHaveLength(1);
    expect(appealCalls[0]!.insertValues).toEqual([
      {
        moderation_action_id: "action-1",
        appellant_id: "user-1",
        message: "Please reconsider.",
      },
    ]);
  });

  it("rejects an empty message", async () => {
    const { client, records } = createFakeClient({
      tables: { appeals: { data: null, error: null } },
    });
    const result = await runMutation(() => useCreateAppeal(client), {
      moderationActionId: "action-1",
      message: "   ",
    } satisfies CreateAppealInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_input");
      expect(result.error.message).toBe("Write a message for the moderators.");
    }
    expect(callsOn(records, "appeals")).toHaveLength(0);
  });

  it("rejects a message over the limit", async () => {
    const { client } = createFakeClient({
      tables: { appeals: { data: null, error: null } },
    });
    const result = await runMutation(() => useCreateAppeal(client), {
      moderationActionId: "action-1",
      message: "a".repeat(APPEAL_MESSAGE_MAX + 1),
    } satisfies CreateAppealInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_input");
    }
  });

  it("fails when signed out", async () => {
    const { client } = createFakeClient({
      tables: { appeals: { data: null, error: null } },
    });
    const result = await runMutation(
      () => useCreateAppeal(client),
      {
        moderationActionId: "action-1",
        message: "Please.",
      } satisfies CreateAppealInput,
      { auth: SIGNED_OUT_AUTH },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not_signed_in");
    }
  });
});

describe("useAppeals", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("loads open appeals with their moderation action and appellant", async () => {
    const action = moderationActionRow({ id: "action-1" });
    const appeal = appealRow({ id: "appeal-1" });
    const appellant = {
      username: "sparky",
      display_name: "Sparky",
      avatar_species: null,
    };
    const row = {
      ...appeal,
      moderation_actions: action,
      appellant: appellant,
    };
    const { client, records } = createFakeClient({
      tables: { appeals: { data: [row], error: null } },
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useAppeals(client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { appeal: appeal, action: action, appellant: appellant },
    ]);
    const appealCalls = callsOn(records, "appeals");
    expect(appealCalls).toHaveLength(1);
    expect(appealCalls[0]!.eqFilters).toContainEqual(["status", "open"]);
    expect(appealCalls[0]!.orders).toEqual([
      ["created_at", { ascending: false }],
    ]);
    expect(appealCalls[0]!.selectColumns).toContain(
      "appellant:profiles!appeals_appellant_id_fkey(username, display_name, avatar_species)",
    );
  });

  it("maps a missing embedded action to null", async () => {
    const appeal = appealRow({ id: "appeal-1" });
    const { client } = createFakeClient({
      tables: {
        appeals: {
          data: [{ ...appeal, moderation_actions: null, appellant: null }],
          error: null,
        },
      },
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useAppeals(client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { appeal, action: null, appellant: null },
    ]);
  });
});

describe("useModerationAction", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("fetches the action by id", async () => {
    const action = moderationActionRow({ id: "action-1" });
    const { client, records } = createFakeClient({
      tables: { moderation_actions: { data: action, error: null } },
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useModerationAction("action-1", client),
      {
        wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(action);
    const actionCalls = callsOn(records, "moderation_actions");
    expect(actionCalls).toHaveLength(1);
    expect(actionCalls[0]!.eqFilters).toContainEqual(["id", "action-1"]);
    expect(actionCalls[0]!.isMaybeSingle).toBe(true);
  });

  it("returns null for a missing action", async () => {
    const { client } = createFakeClient({
      tables: { moderation_actions: { data: null, error: null } },
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useModerationAction("missing", client),
      {
        wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
      },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe("useAppealForAction", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("fetches the appeal by moderation action id", async () => {
    const appeal = appealRow({ id: "appeal-1" });
    const { client, records } = createFakeClient({
      tables: { appeals: { data: appeal, error: null } },
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useAppealForAction("action-1", client),
      { wrapper: createWrapper(queryClient, SIGNED_IN_AUTH) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(appeal);
    const appealCalls = callsOn(records, "appeals");
    expect(appealCalls).toHaveLength(1);
    expect(appealCalls[0]!.eqFilters).toContainEqual([
      "moderation_action_id",
      "action-1",
    ]);
    expect(appealCalls[0]!.isMaybeSingle).toBe(true);
  });
});

describe("useOwnSuspensions", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("loads the signed-in user's suspensions", async () => {
    const suspension: UserSuspensionRow = {
      user_id: "user-1",
      until: "2026-11-25T10:00:00.000Z",
      reason: "Spam",
      created_by: "user-9",
      created_at: "2026-11-18T10:00:00.000Z",
    };
    const { client, records } = createFakeClient({
      tables: { user_suspensions: { data: [suspension], error: null } },
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useOwnSuspensions(client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([suspension]);
    const suspensionCalls = callsOn(records, "user_suspensions");
    expect(suspensionCalls).toHaveLength(1);
    expect(suspensionCalls[0]!.eqFilters).toContainEqual(["user_id", "user-1"]);
    expect(suspensionCalls[0]!.orders).toEqual([
      ["created_at", { ascending: false }],
    ]);
  });
});

describe("useModerationTargetText", () => {
  beforeEach(() => {
    resetSocialInstallState();
  });

  it("fetches a removed post's body", async () => {
    const action = moderationActionRow({
      id: "action-1",
      action: "remove",
      target_type: "post",
      target_id: "post-1",
    });
    const { client, records } = createFakeClient({
      tables: { posts: { data: { body: "Removed post body" }, error: null } },
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useModerationTargetText(action, client),
      { wrapper: createWrapper(queryClient, SIGNED_IN_AUTH) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("Removed post body");
    const postCalls = callsOn(records, "posts");
    expect(postCalls).toHaveLength(1);
    expect(postCalls[0]!.eqFilters).toContainEqual(["id", "post-1"]);
  });

  it("fetches a removed comment's body", async () => {
    const action = moderationActionRow({
      id: "action-1",
      action: "remove",
      target_type: "comment",
      target_id: "comment-1",
    });
    const { client } = createFakeClient({
      tables: {
        comments: { data: { body: "Removed comment body" }, error: null },
      },
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useModerationTargetText(action, client),
      { wrapper: createWrapper(queryClient, SIGNED_IN_AUTH) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("Removed comment body");
  });

  it("returns null when the row is unreadable (RLS)", async () => {
    const action = moderationActionRow({
      id: "action-1",
      action: "remove",
      target_type: "post",
      target_id: "post-1",
    });
    const { client } = createFakeClient({
      tables: { posts: { data: null, error: null } },
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(
      () => useModerationTargetText(action, client),
      { wrapper: createWrapper(queryClient, SIGNED_IN_AUTH) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("does not query for suspend actions", async () => {
    const action = moderationActionRow({
      id: "action-1",
      action: "suspend",
      target_type: "profile",
      target_id: "user-2",
    });
    const { client, records } = createFakeClient({});
    const queryClient = createQueryClient();
    renderHook(() => useModerationTargetText(action, client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(records).toHaveLength(0);
  });
});
