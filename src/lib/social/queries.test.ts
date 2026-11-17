import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { AuthContextValue } from "@/lib/auth/types";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";
import type { CommentRow, FeedPostRow, ReportRow } from "@/lib/database.types";
import {
  isSocialNotInstalled,
  resetSocialInstallState,
} from "@/lib/social/availability";
import {
  useAuthorPosts,
  useBlocks,
  useComments,
  useFeed,
  useFollowCounts,
  useFollowers,
  useFollowing,
  useFollowState,
  useIsModerator,
  usePost,
  useReports,
} from "@/lib/social/queries";
import type { AppSupabaseClient } from "@/lib/supabase";

/** One recorded builder call, e.g. eq("author_id", "u1"). */
interface RecordedOp {
  method: string;
  args: unknown[];
}

/** One from(...) chain, with every builder call in order. */
interface RecordedQuery {
  table: string;
  ops: RecordedOp[];
}

interface FakeResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

/** Decides the { data, error, count } a chain resolves with. */
type Resolver = (query: RecordedQuery) => FakeResult;

interface FakeClient {
  client: AppSupabaseClient;
  queries: RecordedQuery[];
  rpcCalls: Array<{ fn: string; args: unknown }>;
}

/**
 * A stand-in for the typed Supabase client. Every builder method returns the
 * same thenable node, so chains can be awaited at any point; maybeSingle and
 * single resolve like the real client.
 */
function createFakeClient(
  resolve: Resolver,
  rpc: FakeResult = { data: null, error: null },
): FakeClient {
  const queries: RecordedQuery[] = [];
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];

  function createNode(query: RecordedQuery): Record<string, unknown> {
    const node: Record<string, unknown> = {};
    for (const method of [
      "select",
      "eq",
      "or",
      "in",
      "order",
      "limit",
      "insert",
      "update",
      "delete",
    ]) {
      node[method] = (...args: unknown[]) => {
        query.ops.push({ method, args });
        return node;
      };
    }
    node["maybeSingle"] = () => Promise.resolve(resolve(query));
    node["single"] = () => Promise.resolve(resolve(query));
    node["then"] = (
      onFulfilled?: (value: FakeResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resolve(query)).then(onFulfilled, onRejected);
    return node;
  }

  const client = {
    from(table: string) {
      const query: RecordedQuery = { table, ops: [] };
      queries.push(query);
      return createNode(query);
    },
    rpc(fn: string, args?: unknown) {
      rpcCalls.push({ fn, args });
      return Promise.resolve(rpc);
    },
  };

  return { client: client as unknown as AppSupabaseClient, queries, rpcCalls };
}

/** A resolver that answers by table name. */
function byTable(map: Record<string, FakeResult>): Resolver {
  return (query) => map[query.table] ?? { data: null, error: null };
}

/** The args of every call of one builder method on one table, in order. */
function callsOn(fake: FakeClient, table: string, method: string): unknown[][] {
  return fake.queries
    .filter((query) => query.table === table)
    .flatMap((query) =>
      query.ops.filter((op) => op.method === method).map((op) => op.args),
    );
}

const SIGNED_IN_AUTH: AuthContextValue = {
  ...GUEST_AUTH,
  isConfigured: true,
  user: { id: "user-1" } as unknown as AuthContextValue["user"],
};

function createWrapper(
  queryClient: QueryClient,
  auth: AuthContextValue = GUEST_AUTH,
) {
  return ({ children }: { children?: ReactNode }) =>
    createElement(
      AuthContext.Provider,
      { value: auth },
      createElement(QueryClientProvider, { client: queryClient }, children),
    );
}

function feedRow(partial: Partial<FeedPostRow> & { id: string }): FeedPostRow {
  return {
    author_id: "author-1",
    body: "Hello",
    attachment: null,
    created_at: "2026-11-17T10:00:00.000Z",
    updated_at: "2026-11-17T10:00:00.000Z",
    author_username: "trainer",
    author_display_name: "Trainer",
    author_avatar_species: "Pikachu",
    like_count: 0,
    comment_count: 0,
    liked_by_me: false,
    ...partial,
  };
}

function commentRow(partial: Partial<CommentRow> & { id: string }): CommentRow {
  return {
    post_id: "p1",
    author_id: "a1",
    body: "Comment",
    created_at: "2026-11-17T10:00:00.000Z",
    removed_at: null,
    removed_by: null,
    ...partial,
  };
}

function reportRow(partial: Partial<ReportRow> & { id: string }): ReportRow {
  return {
    reporter_id: "user-1",
    target_type: "post",
    target_id: "p1",
    reason: "spam",
    details: null,
    status: "open",
    created_at: "2026-11-17T10:00:00.000Z",
    handled_by: null,
    handled_at: null,
    ...partial,
  };
}

let queryClient: QueryClient;

beforeEach(() => {
  resetSocialInstallState();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

afterEach(() => {
  queryClient.clear();
  resetSocialInstallState();
});

describe("useFeed", () => {
  it("loads the latest feed for guests", async () => {
    const rows = [feedRow({ id: "p1" }), feedRow({ id: "p2" })];
    const fake = createFakeClient(
      byTable({ feed_posts: { data: rows, error: null } }),
    );
    const { result } = renderHook(() => useFeed("latest", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toEqual([rows]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("keyset-paginates with a (created_at, id) cursor", async () => {
    const rows = Array.from({ length: 20 }, (_, index) =>
      feedRow({
        id: `p${index}`,
        created_at: `2026-11-17T10:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    const fake = createFakeClient(
      byTable({ feed_posts: { data: rows, error: null } }),
    );
    const { result } = renderHook(() => useFeed("latest", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(true);
    // Read data before fetching: with tracked props the observer only
    // re-renders when a previously-read prop changes, and real feed
    // components read data on every render.
    expect(result.current.data?.pages.length).toBe(1);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));

    expect(result.current.data?.pageParams).toEqual([
      null,
      { createdAt: "2026-11-17T10:19:00.000Z", id: "p19" },
    ]);
    expect(callsOn(fake, "feed_posts", "or")).toEqual([
      [
        "created_at.lt.2026-11-17T10:19:00.000Z,and(created_at.eq.2026-11-17T10:19:00.000Z,id.lt.p19)",
      ],
    ]);
  });

  it("loads the following feed from the follow graph", async () => {
    const rows = [feedRow({ id: "p1", author_id: "author-1" })];
    const fake = createFakeClient((query) => {
      if (query.table === "follows") {
        return {
          data: [{ followee_id: "author-1" }, { followee_id: "author-2" }],
          error: null,
        };
      }
      return { data: rows, error: null };
    });
    const { result } = renderHook(() => useFeed("following", fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toEqual([rows]);
    expect(callsOn(fake, "follows", "eq")).toEqual([["follower_id", "user-1"]]);
    expect(callsOn(fake, "feed_posts", "in")).toEqual([
      ["author_id", ["author-1", "author-2"]],
    ]);
  });

  it("shows an empty following feed when the user follows no one", async () => {
    const fake = createFakeClient(
      byTable({ follows: { data: [], error: null } }),
    );
    const { result } = renderHook(() => useFeed("following", fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toEqual([[]]);
    expect(callsOn(fake, "feed_posts", "in")).toEqual([]);
  });

  it("stays idle for guests on the following feed", () => {
    const fake = createFakeClient(byTable({}));
    const { result } = renderHook(() => useFeed("following", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fake.queries).toHaveLength(0);
  });

  it("stays idle without a client", () => {
    const { result } = renderHook(() => useFeed("latest", null), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  it("fails soft and caches the missing-tables case", async () => {
    const fake = createFakeClient(
      byTable({
        feed_posts: {
          data: null,
          error: { code: "42P01", message: "missing" },
        },
      }),
    );
    const { result } = renderHook(() => useFeed("latest", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toEqual([[]]);
    expect(result.current.error).toBeNull();
    expect(isSocialNotInstalled()).toBe(true);

    const postFake = createFakeClient(byTable({}));
    const { result: post } = renderHook(() => usePost("p1", postFake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(post.current.isSuccess).toBe(true));

    expect(post.current.data).toBeNull();
    expect(postFake.queries).toHaveLength(0);

    const commentsFake = createFakeClient(byTable({}));
    const { result: comments } = renderHook(
      () => useComments("p1", commentsFake.client),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(comments.current.isSuccess).toBe(true));

    expect(comments.current.data).toEqual([]);
    expect(commentsFake.queries).toHaveLength(0);
  });

  it("surfaces mapped failures for other read errors", async () => {
    const fake = createFakeClient(
      byTable({
        feed_posts: { data: null, error: { code: "42501", message: "denied" } },
      }),
    );
    const { result } = renderHook(() => useFeed("latest", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual({
      code: "forbidden",
      message: "You cannot do that.",
    });
  });
});

describe("useAuthorPosts", () => {
  it("loads one author's posts", async () => {
    const rows = [feedRow({ id: "p1", author_id: "author-1" })];
    const fake = createFakeClient(
      byTable({ feed_posts: { data: rows, error: null } }),
    );
    const { result } = renderHook(
      () => useAuthorPosts("author-1", fake.client),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toEqual([rows]);
    expect(callsOn(fake, "feed_posts", "eq")).toEqual([
      ["author_id", "author-1"],
    ]);
  });
});

describe("usePost", () => {
  it("loads a single post", async () => {
    const row = feedRow({ id: "p1" });
    const fake = createFakeClient(
      byTable({ feed_posts: { data: row, error: null } }),
    );
    const { result } = renderHook(() => usePost("p1", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(row);
  });

  it("treats a missing post as null", async () => {
    const fake = createFakeClient(
      byTable({ feed_posts: { data: null, error: null } }),
    );
    const { result } = renderHook(() => usePost("missing", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });
});

describe("useComments", () => {
  it("resolves comment authors and keeps unknown authors null", async () => {
    const comments = [
      commentRow({ id: "c1", author_id: "a1", body: "First" }),
      commentRow({ id: "c2", author_id: "a2", body: "Second" }),
    ];
    const fake = createFakeClient((query) => {
      if (query.table === "comments") {
        return { data: comments, error: null };
      }
      return {
        data: [
          {
            id: "a1",
            username: "alice",
            display_name: "Alice",
            avatar_species: "Pikachu",
          },
        ],
        error: null,
      };
    });
    const { result } = renderHook(() => useComments("p1", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        id: "c1",
        postId: "p1",
        authorId: "a1",
        body: "First",
        createdAt: "2026-11-17T10:00:00.000Z",
        author: {
          id: "a1",
          username: "alice",
          displayName: "Alice",
          avatarSpecies: "Pikachu",
        },
      },
      {
        id: "c2",
        postId: "p1",
        authorId: "a2",
        body: "Second",
        createdAt: "2026-11-17T10:00:00.000Z",
        author: null,
      },
    ]);
    expect(callsOn(fake, "profiles", "in")).toEqual([["id", ["a1", "a2"]]]);
  });
});

describe("useFollowState", () => {
  it("is true when the viewer follows the user", async () => {
    const fake = createFakeClient(
      byTable({ follows: { data: { follower_id: "user-1" }, error: null } }),
    );
    const { result } = renderHook(() => useFollowState("user-2", fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(true);
  });

  it("is false when the viewer does not follow the user", async () => {
    const fake = createFakeClient(
      byTable({ follows: { data: null, error: null } }),
    );
    const { result } = renderHook(() => useFollowState("user-2", fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(false);
  });
});

describe("useFollowCounts", () => {
  it("counts followers and following", async () => {
    const fake = createFakeClient((query) => {
      const columns = query.ops
        .filter((op) => op.method === "eq")
        .map((op) => op.args[0]);
      if (columns.includes("followee_id")) {
        return { data: null, error: null, count: 3 };
      }
      return { data: null, error: null, count: 5 };
    });
    const { result } = renderHook(
      () => useFollowCounts("user-2", fake.client),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ followers: 3, following: 5 });
  });
});

describe("useFollowers", () => {
  it("lists followers and drops profiles that no longer exist", async () => {
    const fake = createFakeClient((query) => {
      if (query.table === "follows") {
        return {
          data: [
            {
              follower_id: "u1",
              followee_id: "user-2",
              created_at: "2026-11-17T10:00:00.000Z",
            },
            {
              follower_id: "u3",
              followee_id: "user-2",
              created_at: "2026-11-17T09:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      return {
        data: [
          {
            id: "u1",
            username: "alice",
            display_name: "Alice",
            avatar_species: "Pikachu",
          },
        ],
        error: null,
      };
    });
    const { result } = renderHook(() => useFollowers("user-2", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        id: "u1",
        username: "alice",
        displayName: "Alice",
        avatarSpecies: "Pikachu",
      },
    ]);
    expect(callsOn(fake, "follows", "eq")).toEqual([["followee_id", "user-2"]]);
  });
});

describe("useFollowing", () => {
  it("lists the users the user follows", async () => {
    const fake = createFakeClient((query) => {
      if (query.table === "follows") {
        return {
          data: [
            {
              follower_id: "user-2",
              followee_id: "u1",
              created_at: "2026-11-17T10:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      return {
        data: [
          {
            id: "u1",
            username: "alice",
            display_name: "Alice",
            avatar_species: "Pikachu",
          },
        ],
        error: null,
      };
    });
    const { result } = renderHook(() => useFollowing("user-2", fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      {
        id: "u1",
        username: "alice",
        displayName: "Alice",
        avatarSpecies: "Pikachu",
      },
    ]);
    expect(callsOn(fake, "follows", "eq")).toEqual([["follower_id", "user-2"]]);
  });
});

describe("useBlocks", () => {
  it("lists the ids the viewer has blocked", async () => {
    const fake = createFakeClient(
      byTable({
        blocks: {
          data: [{ blocked_id: "b1" }, { blocked_id: "b2" }],
          error: null,
        },
      }),
    );
    const { result } = renderHook(() => useBlocks(fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(["b1", "b2"]);
    expect(callsOn(fake, "blocks", "eq")).toEqual([["blocker_id", "user-1"]]);
  });
});

describe("useIsModerator", () => {
  it("reads the moderator flag through rpc", async () => {
    const fake = createFakeClient(byTable({}), { data: true, error: null });
    const { result } = renderHook(() => useIsModerator(fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(true);
    expect(fake.rpcCalls.map((call) => call.fn)).toEqual(["is_moderator"]);
  });

  it("is false for regular users", async () => {
    const fake = createFakeClient(byTable({}), { data: false, error: null });
    const { result } = renderHook(() => useIsModerator(fake.client), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(false);
  });
});

describe("useReports", () => {
  it("lists reports with the given status", async () => {
    const rows = [reportRow({ id: "r1", status: "open" })];
    const fake = createFakeClient(
      byTable({ reports: { data: rows, error: null } }),
    );
    const { result } = renderHook(() => useReports("open", fake.client), {
      wrapper: createWrapper(queryClient, SIGNED_IN_AUTH),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(rows);
    expect(callsOn(fake, "reports", "eq")).toEqual([["status", "open"]]);
  });
});
