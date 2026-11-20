import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFakeClient,
  createQueryClient,
  createWrapper,
  SIGNED_IN_AUTH,
  type ChainRecord,
} from "@/lib/social/test-client";
import { useBattleBoard, useBattleCode } from "@/lib/battles/queries";
import {
  useAcceptBattleOffer,
  useCreateBattleRequest,
} from "@/lib/battles/mutations";
import { NO_BATTLE_FILTER } from "@/lib/battles/logic";
import type { BattleRequestRow } from "@/lib/database.types";

/**
 * The data layer against a fake client: the board query joins authors and
 * teams and drops dead rows; the accept mutation reaches the RPC and hands
 * back the conversation id (or null, the code-exchange fallback).
 */

const REQUEST: BattleRequestRow = {
  id: "req-1",
  author_id: "author-1",
  format: "doubles",
  rules: "Reg M-C, best of 3",
  note: null,
  starts_at: null,
  ends_at: null,
  timezone: null,
  language: "en",
  team_id: "team-1",
  status: "open",
  accepted_reply_id: null,
  played_at: null,
  created_at: "2026-11-22T10:00:00Z",
  updated_at: "2026-11-22T10:00:00Z",
};

/** Resolves each table the board touches with its fixture rows. */
function resolveRecord(record: ChainRecord) {
  if (record.table === "battle_requests") {
    return { data: [REQUEST], error: null };
  }
  if (record.table === "profiles") {
    return {
      data: [
        {
          id: "author-1",
          username: "rika",
          display_name: "Rika",
          avatar_species: "Garchomp",
        },
      ],
      error: null,
    };
  }
  if (record.table === "teams") {
    return {
      data: [
        {
          id: "team-1",
          name: "Rain team",
          format: "doubles",
          is_public: true,
          data: [],
          game_team_id: null,
        },
      ],
      error: null,
    };
  }
  return { data: [], error: null };
}

describe("battle data layer", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_BATTLES", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("the board joins the author and the attached team", async () => {
    const fake = createFakeClient({ resolve: resolveRecord });
    const wrapper = createWrapper(createQueryClient(), SIGNED_IN_AUTH);
    const { result } = renderHook(
      () => useBattleBoard(NO_BATTLE_FILTER, fake.client),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).not.toBeUndefined());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]!.author?.username).toBe("rika");
    expect(result.current.data![0]!.team?.name).toBe("Rain team");
  });

  it("the board fails soft on an error", async () => {
    const fake = createFakeClient({
      resolve: () => ({ data: null, error: { message: "no table" } }),
    });
    const wrapper = createWrapper(createQueryClient(), SIGNED_IN_AUTH);
    const { result } = renderHook(
      () => useBattleBoard(NO_BATTLE_FILTER, fake.client),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).not.toBeUndefined());
    expect(result.current.data).toEqual([]);
  });

  it("the code hook reads the matched pair's code", async () => {
    const fake = createFakeClient({
      resolve: (record) =>
        record.table === "battle_request_codes"
          ? { data: { request_id: "req-1", code: "ROOM-1234" }, error: null }
          : { data: [], error: null },
    });
    const wrapper = createWrapper(createQueryClient(), SIGNED_IN_AUTH);
    const { result } = renderHook(() => useBattleCode("req-1", fake.client), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBe("ROOM-1234"));
  });

  it("creating a request inserts with the signed-in author", async () => {
    const fake = createFakeClient({
      resolve: (record) =>
        record.table === "battle_requests"
          ? { data: [{ id: "new-1" }], error: null }
          : { data: [], error: null },
    });
    const wrapper = createWrapper(createQueryClient(), SIGNED_IN_AUTH);
    const { result } = renderHook(() => useCreateBattleRequest(fake.client), {
      wrapper,
    });

    await act(async () => {
      result.current.mutate({
        format: "doubles",
        rules: "Reg M-C",
        language: "en",
      });
    });

    const insert = fake.records.find((record) => record.insertValues !== null);
    expect(insert?.table).toBe("battle_requests");
    expect(insert?.insertValues).toEqual([
      {
        format: "doubles",
        rules: "Reg M-C",
        language: "en",
        author_id: SIGNED_IN_AUTH.user?.id,
      },
    ]);
  });

  it("accepting an offer reaches the RPC and returns the conversation id", async () => {
    const fake = createFakeClient({
      rpc: { accept_battle_reply: { data: "conv-1", error: null } },
    });
    const wrapper = createWrapper(createQueryClient(), SIGNED_IN_AUTH);
    const { result } = renderHook(() => useAcceptBattleOffer(fake.client), {
      wrapper,
    });

    act(() => {
      result.current.mutate("reply-1");
    });

    await waitFor(() => expect(result.current.data).toBe("conv-1"));
    expect(fake.rpcCalls).toEqual([
      { fn: "accept_battle_reply", args: { reply_id: "reply-1" } },
    ]);
  });

  it("accepting returns null when no DM thread could open", async () => {
    const fake = createFakeClient({
      rpc: { accept_battle_reply: { data: null, error: null } },
    });
    const wrapper = createWrapper(createQueryClient(), SIGNED_IN_AUTH);
    const { result } = renderHook(() => useAcceptBattleOffer(fake.client), {
      wrapper,
    });

    act(() => {
      result.current.mutate("reply-1");
    });

    await waitFor(() => expect(result.current.data).toBeNull());
  });
});
