import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GUEST_AUTH } from "@/lib/auth/use-auth";
import { resetSocialInstallState } from "@/lib/social/availability";

import {
  dismissedSuggestionsKey,
  writeDismissedSuggestion,
} from "@/lib/social/suggestion-dismissals";
import {
  toFollowSuggestion,
  useFollowSuggestions,
  type FollowSuggestionRow,
} from "@/lib/social/suggestions";

import {
  createFakeClient,
  createQueryClient,
  createWrapper,
  SIGNED_IN_AUTH,
} from "@/lib/social/test-client";

let queryClient: ReturnType<typeof createQueryClient>;

beforeEach(() => {
  resetSocialInstallState();
  localStorage.clear();
  queryClient = createQueryClient();
});

afterEach(() => {
  queryClient.clear();
  resetSocialInstallState();
});

function suggestionRow(
  partial: Partial<FollowSuggestionRow> & { id: string },
): FollowSuggestionRow {
  return {
    username: "trainer",
    display_name: "Trainer",
    avatar_species: "Garchomp",
    main_format: "doubles",
    score: 4,
    ...partial,
  };
}

describe("toFollowSuggestion", () => {
  it("maps the public profile fields and narrows the format", () => {
    expect(
      toFollowSuggestion(
        suggestionRow({ id: "user-2", main_format: "singles" }),
      ),
    ).toEqual({
      id: "user-2",
      username: "trainer",
      displayName: "Trainer",
      avatarSpecies: "Garchomp",
      mainFormat: "singles",
      score: 4,
    });
  });

  it("treats an unknown format as none", () => {
    const suggestion = toFollowSuggestion(
      suggestionRow({ id: "user-2", main_format: "triples" }),
    );
    expect(suggestion.mainFormat).toBeNull();
  });
});

describe("useFollowSuggestions", () => {
  it("calls the RPC with the limit and maps the rows", async () => {
    const fake = createFakeClient({
      rpc: {
        suggest_users: {
          data: [
            suggestionRow({ id: "user-2", username: "brock" }),
            suggestionRow({ id: "user-3", username: "misty", score: 1 }),
          ],
          error: null,
        },
      },
    });
    const { result } = renderHook(() => useFollowSuggestions(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fake.rpcCalls).toEqual([
      { fn: "suggest_users", args: { p_limit: 10 } },
    ]);
    expect(result.current.data?.map((row) => row.username)).toEqual([
      "brock",
      "misty",
    ]);
  });

  it("stays empty for signed-out users", async () => {
    const fake = createFakeClient({});
    const { result } = renderHook(() => useFollowSuggestions(fake.client), {
      wrapper: createWrapper(queryClient, GUEST_AUTH),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
    expect(fake.rpcCalls).toEqual([]);
  });

  it("does not run against a null client", async () => {
    const { result } = renderHook(() => useFollowSuggestions(null), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("filters out suggestions the user dismissed", async () => {
    writeDismissedSuggestion(dismissedSuggestionsKey("user-1"), "user-2");
    const fake = createFakeClient({
      rpc: {
        suggest_users: {
          data: [
            suggestionRow({ id: "user-2", username: "brock" }),
            suggestionRow({ id: "user-3", username: "misty" }),
          ],
          error: null,
        },
      },
    });
    const { result } = renderHook(() => useFollowSuggestions(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((row) => row.username)).toEqual(["misty"]);
  });

  it("fails soft while the RPC is missing (not installed)", async () => {
    const fake = createFakeClient({
      rpc: {
        suggest_users: { data: null, error: { code: "42P01" } },
      },
    });
    const { result } = renderHook(() => useFollowSuggestions(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});
