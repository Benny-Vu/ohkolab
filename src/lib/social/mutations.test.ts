import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GUEST_AUTH } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import {
  createFakeClient,
  createQueryClient,
  createWrapper,
  feedRow,
  SIGNED_IN_AUTH,
  type FakeClientConfig,
  type FakeResult,
} from "@/lib/social/test-client";
import {
  useCreateComment,
  useDeleteComment,
  useToggleFollow,
} from "@/lib/social/mutations";
import type { SocialComment } from "@/lib/social/queries";

const ME = "user-1";
const OTHER = "user-2";

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
      // The mutation starts on a microtask: wait for the chain to be awaited.
      await waitFor(() => expect(gates.length).toBeGreaterThan(index));
      gates[index]!(value);
    },
  };
}

/** Renders a mutation hook against its own query client and runs it once. */
function runOptimistic<TVars>(
  useHook: () => {
    mutateAsync: (variables: TVars) => Promise<unknown>;
  },
  variables: TVars,
  queryClient: ReturnType<typeof createQueryClient>,
) {
  const hook = renderHook(useHook, {
    wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
  });
  let settled = false;
  act(() => {
    void hook.result.current.mutateAsync(variables).finally(() => {
      settled = true;
    });
  });
  return {
    hook,
    async done(): Promise<void> {
      await waitFor(() => expect(settled).toBe(true));
    },
  };
}

const EXISTING_COMMENT: SocialComment = {
  id: "c-1",
  postId: "post-1",
  authorId: OTHER,
  body: "Nice",
  createdAt: "2026-11-17T10:05:00.000Z",
  author: {
    id: OTHER,
    username: "brock",
    displayName: "Brock",
    avatarSpecies: "Onix",
  },
};

describe("useToggleFollow (optimistic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function seedFollowState(
    queryClient: ReturnType<typeof createQueryClient>,
    following: boolean,
  ): void {
    queryClient.setQueryData(["social", "follow-state", ME, OTHER], following);
    queryClient.setQueryData(["social", "follow-counts", OTHER], {
      followers: 3,
      following: 5,
    });
    queryClient.setQueryData(["social", "follow-counts", ME], {
      followers: 7,
      following: 2,
    });
  }

  it("flips the cached follow state and counts before the server answers", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seedFollowState(queryClient, false);

    const run = runOptimistic(
      () => useToggleFollow(OTHER, fake.client),
      undefined,
      queryClient,
    );

    // Not following yet: the optimistic write follows at once.
    expect(
      queryClient.getQueryData(["social", "follow-state", ME, OTHER]),
    ).toBe(true);
    expect(
      queryClient.getQueryData(["social", "follow-counts", OTHER]),
    ).toEqual({ followers: 4, following: 5 });
    expect(queryClient.getQueryData(["social", "follow-counts", ME])).toEqual({
      followers: 7,
      following: 3,
    });

    // No existing follow → the insert path; both chains succeed.
    await settle(0, { data: null, error: null });
    await settle(1, { data: null, error: null });
    await run.done();
    expect(
      queryClient.getQueryData(["social", "follow-state", ME, OTHER]),
    ).toBe(true);
  });

  it("unfollows optimistically when the cached state says following", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seedFollowState(queryClient, true);

    const run = runOptimistic(
      () => useToggleFollow(OTHER, fake.client),
      undefined,
      queryClient,
    );

    expect(
      queryClient.getQueryData(["social", "follow-state", ME, OTHER]),
    ).toBe(false);
    expect(
      queryClient.getQueryData(["social", "follow-counts", OTHER]),
    ).toEqual({ followers: 2, following: 5 });
    expect(queryClient.getQueryData(["social", "follow-counts", ME])).toEqual({
      followers: 7,
      following: 1,
    });

    // An existing follow row → the delete path.
    await settle(0, {
      data: { follower_id: ME, followee_id: OTHER },
      error: null,
    });
    await settle(1, { data: [], error: null });
    await run.done();
  });

  it("rolls the optimistic flip back when the server refuses", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seedFollowState(queryClient, false);

    const run = runOptimistic(
      () => useToggleFollow(OTHER, fake.client),
      undefined,
      queryClient,
    );

    expect(
      queryClient.getQueryData(["social", "follow-state", ME, OTHER]),
    ).toBe(true);

    await settle(0, { data: null, error: null });
    await settle(1, { data: null, error: { code: "42501", message: "no" } });
    await run.done();

    expect(
      queryClient.getQueryData(["social", "follow-state", ME, OTHER]),
    ).toBe(false);
    expect(
      queryClient.getQueryData(["social", "follow-counts", OTHER]),
    ).toEqual({ followers: 3, following: 5 });
    expect(queryClient.getQueryData(["social", "follow-counts", ME])).toEqual({
      followers: 7,
      following: 2,
    });
  });

  it("writes nothing when there is no cached follow state to flip", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();

    const run = runOptimistic(
      () => useToggleFollow(OTHER, fake.client),
      undefined,
      queryClient,
    );

    // Nothing was cached: no optimistic entry is invented.
    expect(
      queryClient.getQueryData(["social", "follow-state", ME, OTHER]),
    ).toBeUndefined();

    await settle(0, { data: null, error: null });
    await settle(1, { data: null, error: null });
    await run.done();
  });
});

describe("useCreateComment (optimistic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const PROFILE_AUTH: AuthContextValue = {
    ...GUEST_AUTH,
    isConfigured: true,
    user: { id: ME } as unknown as AuthContextValue["user"],
    profile: {
      id: ME,
      username: "tester",
      displayName: "Test User",
      avatarSpecies: "Garchomp",
      bio: null,
      favouriteSpecies: null,
      createdAt: "2026-11-01T00:00:00.000Z",
      isMinor: false,
      isAdmin: false,
    } as unknown as AuthContextValue["profile"],
  };

  function runCommentMutation(
    useHook: () => { mutateAsync: (variables: never) => Promise<unknown> },
    variables: unknown,
    queryClient: ReturnType<typeof createQueryClient>,
  ) {
    const hook = renderHook(useHook, {
      wrapper: createWrapper(queryClient, PROFILE_AUTH),
    });
    let settled = false;
    act(() => {
      void hook.result.current.mutateAsync(variables as never).finally(() => {
        settled = true;
      });
    });
    return {
      async done(): Promise<void> {
        await waitFor(() => expect(settled).toBe(true));
      },
    };
  }

  function seedPostAndComments(
    queryClient: ReturnType<typeof createQueryClient>,
  ): void {
    queryClient.setQueryData(
      ["social", "comments", "post-1"],
      [EXISTING_COMMENT],
    );
    queryClient.setQueryData(
      ["social", "post", "post-1"],
      feedRow({ id: "post-1", comment_count: 1 }),
    );
  }

  it("appends a pending comment and bumps the count before the server answers", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seedPostAndComments(queryClient);

    const run = runCommentMutation(
      () => useCreateComment(fake.client),
      { postId: "post-1", body: "  Great read  " },
      queryClient,
    );

    const cached = queryClient.getQueryData<SocialComment[]>([
      "social",
      "comments",
      "post-1",
    ]);
    expect(cached).toHaveLength(2);
    const optimistic = cached?.[1];
    expect(optimistic).toMatchObject({
      postId: "post-1",
      authorId: ME,
      body: "Great read",
      pending: true,
      author: { id: ME, username: "tester" },
    });
    expect(
      queryClient.getQueryData(["social", "post", "post-1"]),
    ).toMatchObject({ comment_count: 2 });

    await settle(0, {
      data: {
        id: "c-2",
        post_id: "post-1",
        author_id: ME,
        body: "Great read",
        created_at: "2026-11-19T10:00:00.000Z",
        removed_at: null,
        removed_by: null,
      },
      error: null,
    });
    await run.done();
  });

  it("removes the pending comment again when the insert fails", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seedPostAndComments(queryClient);

    const run = runCommentMutation(
      () => useCreateComment(fake.client),
      { postId: "post-1", body: "Great read" },
      queryClient,
    );

    expect(
      queryClient.getQueryData<SocialComment[]>([
        "social",
        "comments",
        "post-1",
      ]),
    ).toHaveLength(2);

    await settle(0, { data: null, error: { code: "42501", message: "no" } });
    await run.done();

    expect(
      queryClient.getQueryData<SocialComment[]>([
        "social",
        "comments",
        "post-1",
      ]),
    ).toEqual([EXISTING_COMMENT]);
    expect(
      queryClient.getQueryData(["social", "post", "post-1"]),
    ).toMatchObject({ comment_count: 1 });
  });

  it("adds nothing when the body is invalid", async () => {
    const fake = createFakeClient();
    const queryClient = createQueryClient();
    seedPostAndComments(queryClient);

    const run = runCommentMutation(
      () => useCreateComment(fake.client),
      { postId: "post-1", body: "   " },
      queryClient,
    );

    await run.done();
    expect(
      queryClient.getQueryData<SocialComment[]>([
        "social",
        "comments",
        "post-1",
      ]),
    ).toEqual([EXISTING_COMMENT]);
  });
});

describe("useDeleteComment (optimistic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function seed(queryClient: ReturnType<typeof createQueryClient>): void {
    queryClient.setQueryData(
      ["social", "comments", "post-1"],
      [EXISTING_COMMENT],
    );
    queryClient.setQueryData(
      ["social", "post", "post-1"],
      feedRow({ id: "post-1", comment_count: 1 }),
    );
  }

  it("removes the comment and its count before the server answers", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seed(queryClient);

    const run = runOptimistic(
      () => useDeleteComment(fake.client),
      { commentId: "c-1", postId: "post-1" },
      queryClient,
    );

    expect(
      queryClient.getQueryData<SocialComment[]>([
        "social",
        "comments",
        "post-1",
      ]),
    ).toEqual([]);
    expect(
      queryClient.getQueryData(["social", "post", "post-1"]),
    ).toMatchObject({ comment_count: 0 });

    await settle(0, { data: [{ id: "c-1" }], error: null });
    await run.done();
  });

  it("puts the comment back when the delete is refused", async () => {
    const { config, settle } = deferredChains();
    const fake = createFakeClient(config);
    const queryClient = createQueryClient();
    seed(queryClient);

    const run = runOptimistic(
      () => useDeleteComment(fake.client),
      { commentId: "c-1", postId: "post-1" },
      queryClient,
    );

    expect(
      queryClient.getQueryData<SocialComment[]>([
        "social",
        "comments",
        "post-1",
      ]),
    ).toEqual([]);

    // A zero-row delete: the database refused the change.
    await settle(0, { data: [], error: null });
    await run.done();

    expect(
      queryClient.getQueryData<SocialComment[]>([
        "social",
        "comments",
        "post-1",
      ]),
    ).toEqual([EXISTING_COMMENT]);
    expect(
      queryClient.getQueryData(["social", "post", "post-1"]),
    ).toMatchObject({ comment_count: 1 });
  });
});
