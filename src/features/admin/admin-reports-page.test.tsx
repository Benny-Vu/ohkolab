import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminReportsPage } from "@/features/admin/admin-reports-page";
import { createFakeAuth, renderPage } from "@/features/account/test-utils";
import type { AppSupabaseClient } from "@/lib/supabase";
import type { CommentRow, ProfileRow, ReportRow } from "@/lib/database.types";

const socialMocks = vi.hoisted(() => ({
  socialAvailability: vi.fn(() => "ready"),
  useIsModerator: vi.fn(),
  useReports: vi.fn(),
  usePost: vi.fn(),
  useHandleReport: vi.fn(),
  useRemoveContent: vi.fn(),
  useSuspendUser: vi.fn(),
}));

vi.mock("@/lib/social", () => socialMocks);

const moderationMocks = vi.hoisted(() => ({
  useSuspendUser: vi.fn(),
}));

vi.mock("@/lib/social/moderation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/social/moderation")>();
  return {
    ...actual,
    useSuspendUser: moderationMocks.useSuspendUser,
  };
});

const queryResult = (data: unknown, extra: Record<string, unknown> = {}) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...extra,
});

const mutationResult = (
  mutateAsync: (...args: never[]) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

function reportRow(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: "report-1",
    reporter_id: "user-reporter",
    target_type: "post",
    target_id: "post-1",
    reason: "spam",
    details: "Too many links.",
    status: "open",
    created_at: "2024-05-01T00:00:00Z",
    handled_by: null,
    handled_at: null,
    ...overrides,
  };
}

function commentRow(overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id: "comment-1",
    post_id: "post-1",
    author_id: "user-author",
    body: "Rude comment",
    created_at: "2024-05-01T00:00:00Z",
    removed_at: null,
    removed_by: null,
    ...overrides,
  };
}

function profileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "user-target",
    username: "target",
    display_name: "Target User",
    avatar_species: "Snorlax",
    bio: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Fake Supabase client for the admin feature's feature-local queries:
 * `comments` and `profiles` answer through select/eq/maybeSingle.
 */
function createFakeClient(
  options: {
    comment?: CommentRow | null;
    profile?: ProfileRow | null;
  } = {},
) {
  const from = (table: string) => {
    if (table === "comments") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: options.comment ?? null, error: null }),
          }),
        }),
      };
    }
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: options.profile ?? null, error: null }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  };
  return { from } as unknown as AppSupabaseClient;
}

function renderReportsPage(client: AppSupabaseClient | null) {
  renderPage(<AdminReportsPage client={client} />, createFakeAuth(), {
    path: "/admin/reports",
    initialEntries: ["/admin/reports"],
  });
}

describe("AdminReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socialMocks.socialAvailability.mockReturnValue("ready");
    socialMocks.useIsModerator.mockReturnValue(queryResult(true));
    socialMocks.useReports.mockReturnValue(queryResult([]));
    socialMocks.usePost.mockReturnValue(queryResult(null));
    socialMocks.useHandleReport.mockReturnValue(mutationResult());
    socialMocks.useRemoveContent.mockReturnValue(mutationResult());
    socialMocks.useSuspendUser.mockReturnValue(mutationResult());
    moderationMocks.useSuspendUser.mockReturnValue(mutationResult());
  });

  it("shows a not-found page for non-moderators", () => {
    socialMocks.useIsModerator.mockReturnValue(queryResult(false));
    renderReportsPage(createFakeClient());

    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("shows a skeleton while moderator status loads", () => {
    socialMocks.useIsModerator.mockReturnValue(
      queryResult(undefined, { isPending: true }),
    );
    renderReportsPage(createFakeClient());

    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it("says moderation is unavailable when social is not configured", () => {
    socialMocks.socialAvailability.mockReturnValue("not-configured");
    renderReportsPage(createFakeClient());

    expect(screen.getByText("Moderation is unavailable")).toBeInTheDocument();
  });

  it("shows the empty state when there are no open reports", () => {
    renderReportsPage(createFakeClient());

    expect(screen.getByText("No open reports.")).toBeInTheDocument();
  });

  it("renders a post report with its content", () => {
    socialMocks.useReports.mockReturnValue(queryResult([reportRow()]));
    socialMocks.usePost.mockReturnValue(
      queryResult({
        id: "post-1",
        author_id: "user-author",
        body: "Buy cheap rare candies",
        attachment: null,
        created_at: "2024-05-01T00:00:00Z",
        updated_at: "2024-05-01T00:00:00Z",
        author_username: "spammy",
        author_display_name: "Spammy",
        author_avatar_species: null,
        like_count: 0,
        comment_count: 0,
        liked_by_me: false,
      }),
    );
    renderReportsPage(createFakeClient());

    expect(screen.getByText("Buy cheap rare candies")).toBeInTheDocument();
    expect(screen.getByText(/by @spammy/)).toBeInTheDocument();
    expect(screen.getByText("spam")).toBeInTheDocument();
    expect(screen.getByText(/Too many links\./)).toBeInTheDocument();
  });

  it("says content not available when the post is gone", () => {
    socialMocks.useReports.mockReturnValue(queryResult([reportRow()]));
    socialMocks.usePost.mockReturnValue(queryResult(null));
    renderReportsPage(createFakeClient());

    expect(screen.getByText("Content not available.")).toBeInTheDocument();
  });

  it("renders a comment report and marks removed comments", async () => {
    socialMocks.useReports.mockReturnValue(
      queryResult([
        reportRow({
          id: "report-comment",
          target_type: "comment",
          target_id: "comment-1",
        }),
      ]),
    );
    renderReportsPage(createFakeClient({ comment: commentRow() }));

    expect(await screen.findByText("Rude comment")).toBeInTheDocument();
  });

  it("says content already removed for removed comments", async () => {
    socialMocks.useReports.mockReturnValue(
      queryResult([
        reportRow({
          id: "report-comment",
          target_type: "comment",
          target_id: "comment-removed",
        }),
      ]),
    );
    renderReportsPage(
      createFakeClient({
        comment: commentRow({
          id: "comment-removed",
          removed_at: "2024-05-02T00:00:00Z",
        }),
      }),
    );

    expect(
      await screen.findByText("Content already removed."),
    ).toBeInTheDocument();
  });

  it("renders a profile report with a link", async () => {
    socialMocks.useReports.mockReturnValue(
      queryResult([
        reportRow({
          id: "report-profile",
          target_type: "profile",
          target_id: "user-target",
        }),
      ]),
    );
    renderReportsPage(createFakeClient({ profile: profileRow() }));

    const link = await screen.findByRole("link", { name: /@target/i });
    expect(link).toHaveAttribute("href", "/u/target");
  });

  it("dismisses a report after confirming", async () => {
    const user = userEvent.setup();
    const handle = vi.fn<
      (input: { reportId: string; status: string }) => Promise<{
        ok: true;
        data: undefined;
      }>
    >(async () => ({ ok: true, data: undefined }));
    socialMocks.useReports.mockReturnValue(queryResult([reportRow()]));
    socialMocks.useHandleReport.mockReturnValue(mutationResult(handle));
    renderReportsPage(createFakeClient());

    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.getByText("Dismiss this report?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dismiss report/i }));

    await waitFor(() => expect(handle).toHaveBeenCalled());
  });

  it("removes content and actions the report after confirming", async () => {
    const user = userEvent.setup();
    const remove = vi.fn(
      async (input: { type: string; id: string; reason: string }) => ({
        ok: true,
        data: undefined,
        input,
      }),
    );
    const handle = vi.fn<
      (input: { reportId: string; status: string }) => Promise<{
        ok: true;
        data: undefined;
      }>
    >(async () => ({ ok: true, data: undefined }));
    socialMocks.useReports.mockReturnValue(queryResult([reportRow()]));
    socialMocks.useRemoveContent.mockReturnValue(
      mutationResult(remove as unknown as (args?: unknown) => Promise<unknown>),
    );
    socialMocks.useHandleReport.mockReturnValue(mutationResult(handle));
    renderReportsPage(createFakeClient());

    await user.click(screen.getByRole("button", { name: /remove content/i }));
    expect(screen.getByText("Remove this post?")).toBeInTheDocument();

    const reason = screen.getByPlaceholderText(/reason for the removal/i);
    await user.type(reason, "Spam links");

    await user.click(screen.getByRole("button", { name: /^remove content$/i }));

    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(remove.mock.calls[0]![0]).toMatchObject({
      reason: "Spam links",
      reportId: "report-1",
    });
    await waitFor(() => expect(handle).toHaveBeenCalled());
  });

  it("suspends a profile target after choosing a duration", async () => {
    const user = userEvent.setup();
    const suspend = vi.fn(
      async (input: { userId: string; until: string; reason: string }) => ({
        ok: true,
        data: undefined,
        input,
      }),
    );
    socialMocks.useReports.mockReturnValue(
      queryResult([
        reportRow({
          id: "report-profile",
          target_type: "profile",
          target_id: "user-target",
        }),
      ]),
    );
    moderationMocks.useSuspendUser.mockReturnValue(
      mutationResult(
        suspend as unknown as (args?: unknown) => Promise<unknown>,
      ),
    );
    renderReportsPage(createFakeClient({ profile: profileRow() }));

    await user.click(screen.getByRole("button", { name: /suspend user/i }));

    const reason = screen.getByPlaceholderText(/reason for the suspension/i);
    await user.type(reason, "Repeated harassment");

    await user.click(screen.getByRole("button", { name: /7 days/i }));

    await waitFor(() => expect(suspend).toHaveBeenCalled());
    const args = suspend.mock.calls[0]![0];
    expect(args.userId).toBe("user-target");
    expect(args.reason).toBe("Repeated harassment");
    expect(new Date(args.until).getTime()).toBeGreaterThan(Date.now());
  });

  it("disables suspend duration buttons until a reason is entered", async () => {
    const user = userEvent.setup();
    socialMocks.useReports.mockReturnValue(
      queryResult([
        reportRow({
          id: "report-profile",
          target_type: "profile",
          target_id: "user-target",
        }),
      ]),
    );
    renderReportsPage(createFakeClient({ profile: profileRow() }));

    await user.click(screen.getByRole("button", { name: /suspend user/i }));

    expect(screen.getByRole("button", { name: /1 day/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /permanent/i })).toBeDisabled();

    const reason = screen.getByPlaceholderText(/reason for the suspension/i);
    await user.type(reason, "Spam");

    expect(screen.getByRole("button", { name: /1 day/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /permanent/i })).toBeEnabled();
  });

  it("offers a permanent duration of about 100 years", async () => {
    const user = userEvent.setup();
    const suspend = vi.fn(async (input: { until: string }) => ({
      ok: true,
      data: undefined,
      input,
    }));
    socialMocks.useReports.mockReturnValue(
      queryResult([
        reportRow({
          id: "report-profile",
          target_type: "profile",
          target_id: "user-target",
        }),
      ]),
    );
    moderationMocks.useSuspendUser.mockReturnValue(
      mutationResult(
        suspend as unknown as (args?: unknown) => Promise<unknown>,
      ),
    );
    renderReportsPage(createFakeClient({ profile: profileRow() }));

    await user.click(screen.getByRole("button", { name: /suspend user/i }));
    const reason = screen.getByPlaceholderText(/reason for the suspension/i);
    await user.type(reason, "Ban evasion");
    await user.click(screen.getByRole("button", { name: /permanent/i }));

    await waitFor(() => expect(suspend).toHaveBeenCalled());
    const until = new Date(suspend.mock.calls[0]![0].until).getTime();
    const years = (until - Date.now()) / (365.25 * 24 * 60 * 60 * 1000);
    expect(years).toBeGreaterThan(99);
    expect(years).toBeLessThan(101);
  });

  it("suspends the post author from a post report", async () => {
    const user = userEvent.setup();
    const suspend = vi.fn(async (input: { userId: string }) => ({
      ok: true,
      data: undefined,
      input,
    }));
    socialMocks.useReports.mockReturnValue(queryResult([reportRow()]));
    socialMocks.usePost.mockReturnValue(
      queryResult({
        id: "post-1",
        author_id: "user-post-author",
        body: "Buy cheap rare candies",
        attachment: null,
        created_at: "2024-05-01T00:00:00Z",
        updated_at: "2024-05-01T00:00:00Z",
        author_username: "spammy",
        author_display_name: "Spammy",
        author_avatar_species: null,
        like_count: 0,
        comment_count: 0,
        liked_by_me: false,
      }),
    );
    moderationMocks.useSuspendUser.mockReturnValue(
      mutationResult(
        suspend as unknown as (args?: unknown) => Promise<unknown>,
      ),
    );
    renderReportsPage(createFakeClient());

    await user.click(screen.getByRole("button", { name: /suspend user/i }));
    const reason = screen.getByPlaceholderText(/reason for the suspension/i);
    await user.type(reason, "Spam");
    await user.click(screen.getByRole("button", { name: /1 day/i }));

    await waitFor(() => expect(suspend).toHaveBeenCalled());
    expect(suspend.mock.calls[0]![0].userId).toBe("user-post-author");
  });

  it("suspends the comment author from a comment report", async () => {
    const user = userEvent.setup();
    const suspend = vi.fn(async (input: { userId: string }) => ({
      ok: true,
      data: undefined,
      input,
    }));
    socialMocks.useReports.mockReturnValue(
      queryResult([
        reportRow({
          id: "report-comment",
          target_type: "comment",
          target_id: "comment-1",
        }),
      ]),
    );
    moderationMocks.useSuspendUser.mockReturnValue(
      mutationResult(
        suspend as unknown as (args?: unknown) => Promise<unknown>,
      ),
    );
    renderReportsPage(createFakeClient({ comment: commentRow() }));

    await user.click(screen.getByRole("button", { name: /suspend user/i }));
    const reason = screen.getByPlaceholderText(/reason for the suspension/i);
    await user.type(reason, "Harassment");
    await user.click(screen.getByRole("button", { name: /30 days/i }));

    await waitFor(() => expect(suspend).toHaveBeenCalled());
    expect(suspend.mock.calls[0]![0].userId).toBe("user-author");
  });

  it("marks the report actioned after a suspension", async () => {
    const user = userEvent.setup();
    const handle = vi.fn<
      (input: { reportId: string; status: string }) => Promise<{
        ok: true;
        data: undefined;
      }>
    >(async () => ({ ok: true, data: undefined }));
    socialMocks.useReports.mockReturnValue(
      queryResult([
        reportRow({
          id: "report-profile",
          target_type: "profile",
          target_id: "user-target",
        }),
      ]),
    );
    socialMocks.useHandleReport.mockReturnValue(mutationResult(handle));
    renderReportsPage(createFakeClient({ profile: profileRow() }));

    await user.click(screen.getByRole("button", { name: /suspend user/i }));
    const reason = screen.getByPlaceholderText(/reason for the suspension/i);
    await user.type(reason, "Spam");
    await user.click(screen.getByRole("button", { name: /1 day/i }));

    await waitFor(() => expect(handle).toHaveBeenCalled());
    expect(handle.mock.calls[0]![0]).toMatchObject({
      reportId: "report-profile",
      status: "actioned",
    });
  });

  it("filters reports by tab status", async () => {
    const user = userEvent.setup();
    socialMocks.useReports.mockReturnValue(queryResult([]));
    renderReportsPage(createFakeClient());

    expect(socialMocks.useReports).toHaveBeenCalledWith(
      "open",
      expect.anything(),
    );

    await user.click(screen.getByRole("tab", { name: /actioned/i }));
    expect(socialMocks.useReports).toHaveBeenCalledWith(
      "actioned",
      expect.anything(),
    );

    await user.click(screen.getByRole("tab", { name: /dismissed/i }));
    expect(socialMocks.useReports).toHaveBeenCalledWith(
      "dismissed",
      expect.anything(),
    );
  });

  it("links to the reported post", async () => {
    socialMocks.useReports.mockReturnValue(queryResult([reportRow()]));
    socialMocks.usePost.mockReturnValue(
      queryResult({
        id: "post-1",
        author_id: "user-author",
        body: "Buy cheap rare candies",
        attachment: null,
        created_at: "2024-05-01T00:00:00Z",
        updated_at: "2024-05-01T00:00:00Z",
        author_username: "spammy",
        author_display_name: "Spammy",
        author_avatar_species: null,
        like_count: 0,
        comment_count: 0,
        liked_by_me: false,
      }),
    );
    renderReportsPage(createFakeClient());

    const link = screen.getByRole("link", { name: /view post/i });
    expect(link).toHaveAttribute("href", "/post/post-1");
  });

  it("links to the post a reported comment belongs to", async () => {
    socialMocks.useReports.mockReturnValue(
      queryResult([
        reportRow({
          id: "report-comment",
          target_type: "comment",
          target_id: "comment-1",
        }),
      ]),
    );
    renderReportsPage(createFakeClient({ comment: commentRow() }));

    const link = await screen.findByRole("link", { name: /view comment/i });
    expect(link).toHaveAttribute("href", "/post/post-1");
  });
});
