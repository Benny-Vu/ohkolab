import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { ModerationNoticePage } from "@/features/moderation/moderation-notice-page";
import { createFakeAuth } from "@/features/account/test-utils";
import { AuthContext } from "@/lib/auth/use-auth";
import type { AppSupabaseClient } from "@/lib/supabase";
import type {
  AppealRow,
  ModerationActionRow,
  UserSuspensionRow,
} from "@/lib/database.types";

const moderationMocks = vi.hoisted(() => ({
  useModerationAction: vi.fn(),
  useAppealForAction: vi.fn(),
  useCreateAppeal: vi.fn(),
  useOwnSuspensions: vi.fn(),
}));

vi.mock("@/lib/social/moderation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/social/moderation")>();
  return {
    ...actual,
    useModerationAction: moderationMocks.useModerationAction,
    useAppealForAction: moderationMocks.useAppealForAction,
    useCreateAppeal: moderationMocks.useCreateAppeal,
    useOwnSuspensions: moderationMocks.useOwnSuspensions,
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

function actionRow(
  overrides: Partial<ModerationActionRow> = {},
): ModerationActionRow {
  return {
    id: "action-1",
    target_type: "post",
    target_id: "post-1",
    target_user_id: "user-1",
    action: "remove",
    reason: "Spam",
    report_id: null,
    moderator_id: "user-9",
    content_snapshot: null,
    content_kind: null,
    suspension_id: null,
    media_paths: null,
    created_at: "2026-11-18T10:00:00.000Z",
    ...overrides,
  };
}

function appealRow(overrides: Partial<AppealRow> = {}): AppealRow {
  return {
    id: "appeal-1",
    moderation_action_id: "action-1",
    appellant_id: "user-1",
    message: "I disagree with this removal.",
    status: "open",
    created_at: "2026-11-18T10:05:00.000Z",
    handled_by: null,
    handled_at: null,
    ...overrides,
  };
}

function suspensionRow(
  overrides: Partial<UserSuspensionRow> = {},
): UserSuspensionRow {
  return {
    id: "suspension-1",
    user_id: "user-1",
    until: "2026-11-25T10:00:00.000Z",
    reason: "Spam",
    created_by: "user-9",
    created_at: "2026-11-18T10:00:00.000Z",
    ...overrides,
  };
}

const fakeClient = { from: () => null } as unknown as AppSupabaseClient;

function renderNoticePage(actionId = "action-1") {
  const auth = createFakeAuth();
  const router = createMemoryRouter(
    [
      {
        path: "/moderation/:actionId",
        element: (
          <AuthContext.Provider value={auth}>
            <ModerationNoticePage client={fakeClient} />
          </AuthContext.Provider>
        ),
      },
    ],
    { initialEntries: [`/moderation/${actionId}`] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("ModerationNoticePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    moderationMocks.useModerationAction.mockReturnValue(queryResult(null));
    moderationMocks.useAppealForAction.mockReturnValue(queryResult(null));
    moderationMocks.useCreateAppeal.mockReturnValue(mutationResult());
    moderationMocks.useOwnSuspensions.mockReturnValue(queryResult([]));
  });

  it("shows a not-found page when the action is missing", () => {
    renderNoticePage();

    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("shows a skeleton while the action loads", () => {
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(undefined, { isPending: true }),
    );
    renderNoticePage();

    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it("shows the removal reason, date and stored text", () => {
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(
        actionRow({
          content_snapshot: "Removed post body",
          content_kind: "post",
        }),
      ),
    );
    renderNoticePage();

    expect(screen.getAllByText("Your post was removed").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/Spam/)).toBeInTheDocument();
    expect(screen.getByText("Removed content")).toBeInTheDocument();
    expect(screen.getByText(/Removed post body/)).toBeInTheDocument();
  });

  it("hides the removed-content box when there is no snapshot", () => {
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(actionRow()),
    );
    renderNoticePage();

    expect(screen.getAllByText("Your post was removed").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByText("Your post was removed."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Removed content")).not.toBeInTheDocument();
  });

  it("uses the comment wording for comment removals", () => {
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(
        actionRow({ target_type: "comment", target_id: "comment-1" }),
      ),
    );
    renderNoticePage();

    expect(
      screen.getAllByText("Your comment was removed").length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText("Your comment was removed."),
    ).not.toBeInTheDocument();
  });

  it("shows suspension dates for suspend actions", () => {
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(actionRow({ action: "suspend", target_type: "profile" })),
    );
    moderationMocks.useOwnSuspensions.mockReturnValue(
      queryResult([suspensionRow()]),
    );
    renderNoticePage();

    expect(
      screen.getAllByText("Your account was suspended").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Until/)).toBeInTheDocument();
  });

  it("disables the appeal submit button until a message is written", async () => {
    const user = userEvent.setup();
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(actionRow()),
    );
    renderNoticePage();

    const submit = screen.getByRole("button", { name: /submit appeal/i });
    expect(submit).toBeDisabled();

    const message = screen.getByPlaceholderText(
      /why should this decision be reconsidered\?/i,
    );
    await user.type(message, "This was a misunderstanding.");
    expect(submit).toBeEnabled();
  });

  it("submits an appeal", async () => {
    const user = userEvent.setup();
    const create = vi.fn<
      (input: {
        moderationActionId: string;
        message: string;
      }) => Promise<{ ok: true; data: undefined }>
    >(async () => ({ ok: true, data: undefined }));
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(actionRow()),
    );
    moderationMocks.useCreateAppeal.mockReturnValue(mutationResult(create));
    renderNoticePage();

    const message = screen.getByPlaceholderText(
      /why should this decision be reconsidered\?/i,
    );
    await user.type(message, "This was a misunderstanding.");
    await user.click(screen.getByRole("button", { name: /submit appeal/i }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0]![0]).toEqual({
      moderationActionId: "action-1",
      message: "This was a misunderstanding.",
    });
  });

  it("shows the appeal status instead of the form when an appeal exists", () => {
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(actionRow()),
    );
    moderationMocks.useAppealForAction.mockReturnValue(
      queryResult(appealRow()),
    );
    renderNoticePage();

    expect(screen.getByText("Your appeal")).toBeInTheDocument();
    expect(screen.getByText(/Under review/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /submit appeal/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a reversed appeal status", () => {
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(actionRow()),
    );
    moderationMocks.useAppealForAction.mockReturnValue(
      queryResult(appealRow({ status: "reversed" })),
    );
    renderNoticePage();

    expect(screen.getByText("Appeal reversed")).toBeInTheDocument();
  });

  it("does not offer an appeal form for suspensions", () => {
    moderationMocks.useModerationAction.mockReturnValue(
      queryResult(actionRow({ action: "suspend", target_type: "profile" })),
    );
    renderNoticePage();

    expect(
      screen.queryByRole("button", { name: /submit appeal/i }),
    ).not.toBeInTheDocument();
  });
});
