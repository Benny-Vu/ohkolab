import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { AdminAppealsPage } from "@/features/admin/admin-appeals-page";
import { createFakeAuth } from "@/features/account/test-utils";
import { AuthContext } from "@/lib/auth/use-auth";
import type { AppSupabaseClient } from "@/lib/supabase";
import type { AppealRow, ModerationActionRow } from "@/lib/database.types";
import type { AppealAppellant } from "@/lib/social/moderation";

const socialMocks = vi.hoisted(() => ({
  socialAvailability: vi.fn(() => "ready"),
  useIsModerator: vi.fn(),
  useAppeals: vi.fn(),
  useHandleAppeal: vi.fn(),
}));

vi.mock("@/lib/social", () => socialMocks);

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

function appealRow(overrides: Partial<AppealRow> = {}): AppealRow {
  return {
    id: "appeal-1",
    moderation_action_id: "action-1",
    appellant_id: "user-2",
    message: "I disagree with this removal.",
    status: "open",
    created_at: "2026-11-18T10:05:00.000Z",
    handled_by: null,
    handled_at: null,
    ...overrides,
  };
}

function actionRow(
  overrides: Partial<ModerationActionRow> = {},
): ModerationActionRow {
  return {
    id: "action-1",
    target_type: "post",
    target_id: "post-1",
    target_user_id: "user-2",
    action: "remove",
    reason: "Spam",
    report_id: null,
    moderator_id: "user-1",
    content_snapshot: null,
    content_kind: null,
    suspension_id: null,
    created_at: "2026-11-18T10:00:00.000Z",
    ...overrides,
  };
}

function appellantRow(
  overrides: Partial<AppealAppellant> = {},
): AppealAppellant {
  return {
    username: "sparky",
    display_name: "Sparky",
    avatar_species: null,
    ...overrides,
  };
}

function renderAppealsPage(client: AppSupabaseClient | null) {
  const auth = createFakeAuth();
  const router = createMemoryRouter(
    [
      {
        path: "/admin/appeals",
        element: (
          <AuthContext.Provider value={auth}>
            <AdminAppealsPage client={client} />
          </AuthContext.Provider>
        ),
      },
    ],
    { initialEntries: ["/admin/appeals"] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

const fakeClient = { from: () => null } as unknown as AppSupabaseClient;

describe("AdminAppealsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socialMocks.socialAvailability.mockReturnValue("ready");
    socialMocks.useIsModerator.mockReturnValue(queryResult(true));
    socialMocks.useAppeals.mockReturnValue(queryResult([]));
    socialMocks.useHandleAppeal.mockReturnValue(mutationResult());
  });

  it("shows a not-found page for non-moderators", () => {
    socialMocks.useIsModerator.mockReturnValue(queryResult(false));
    renderAppealsPage(fakeClient);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("shows a skeleton while moderator status loads", () => {
    socialMocks.useIsModerator.mockReturnValue(
      queryResult(undefined, { isPending: true }),
    );
    renderAppealsPage(fakeClient);

    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it("says moderation is unavailable when social is not configured", () => {
    socialMocks.socialAvailability.mockReturnValue("not-configured");
    renderAppealsPage(fakeClient);

    expect(screen.getByText("Moderation is unavailable")).toBeInTheDocument();
  });

  it("shows the empty state when there are no open appeals", () => {
    renderAppealsPage(fakeClient);

    expect(screen.getByText("No open appeals.")).toBeInTheDocument();
  });

  it("renders an appeal with its action and message", () => {
    const appeal = appealRow();
    const action = actionRow({
      content_snapshot: "Removed post body",
      content_kind: "post",
    });
    socialMocks.useAppeals.mockReturnValue(
      queryResult([{ appeal, action, appellant: appellantRow() }]),
    );
    renderAppealsPage(fakeClient);

    expect(screen.getByText("Removed post")).toBeInTheDocument();
    expect(screen.getByText(/Spam/)).toBeInTheDocument();
    expect(screen.getByText(/Removed post body/)).toBeInTheDocument();
    expect(
      screen.getByText(/I disagree with this removal\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^uphold$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^reverse$/i }),
    ).toBeInTheDocument();
  });

  it("hides the original content when there is no snapshot", () => {
    socialMocks.useAppeals.mockReturnValue(
      queryResult([
        {
          appeal: appealRow(),
          action: actionRow(),
          appellant: appellantRow(),
        },
      ]),
    );
    renderAppealsPage(fakeClient);

    expect(screen.queryByText(/Original content:/)).not.toBeInTheDocument();
  });

  it("shows the appellant with a link to their profile", () => {
    socialMocks.useAppeals.mockReturnValue(
      queryResult([
        {
          appeal: appealRow(),
          action: actionRow(),
          appellant: appellantRow(),
        },
      ]),
    );
    renderAppealsPage(fakeClient);

    expect(screen.getByText("Sparky")).toBeInTheDocument();
    expect(screen.getByText("@sparky")).toBeInTheDocument();
    const profileLink = screen.getAllByRole("link", {
      name: /sparky/i,
    })[0]!;
    expect(profileLink).toHaveAttribute("href", "/u/sparky");
  });

  it("links to the removed post when the action removed a post", () => {
    socialMocks.useAppeals.mockReturnValue(
      queryResult([
        {
          appeal: appealRow(),
          action: actionRow(),
          appellant: appellantRow(),
        },
      ]),
    );
    renderAppealsPage(fakeClient);

    expect(screen.getByRole("link", { name: /view post/i })).toHaveAttribute(
      "href",
      "/post/post-1",
    );
  });

  it("handles a missing appellant gracefully", () => {
    socialMocks.useAppeals.mockReturnValue(
      queryResult([
        { appeal: appealRow(), action: actionRow(), appellant: null },
      ]),
    );
    renderAppealsPage(fakeClient);

    expect(
      screen.getByText(/appellant's profile is no longer available/i),
    ).toBeInTheDocument();
  });

  it("upholds an appeal", async () => {
    const user = userEvent.setup();
    const handle = vi.fn<
      (input: { appealId: string; decision: string }) => Promise<{
        ok: true;
        data: undefined;
      }>
    >(async () => ({ ok: true, data: undefined }));
    socialMocks.useAppeals.mockReturnValue(
      queryResult([
        {
          appeal: appealRow(),
          action: actionRow(),
          appellant: appellantRow(),
        },
      ]),
    );
    socialMocks.useHandleAppeal.mockReturnValue(mutationResult(handle));
    renderAppealsPage(fakeClient);

    await user.click(screen.getByRole("button", { name: /^uphold$/i }));

    await waitFor(() => expect(handle).toHaveBeenCalled());
    expect(handle.mock.calls[0]![0]).toEqual({
      appealId: "appeal-1",
      decision: "upheld",
    });
  });

  it("reverses an appeal", async () => {
    const user = userEvent.setup();
    const handle = vi.fn<
      (input: { appealId: string; decision: string }) => Promise<{
        ok: true;
        data: undefined;
      }>
    >(async () => ({ ok: true, data: undefined }));
    socialMocks.useAppeals.mockReturnValue(
      queryResult([
        {
          appeal: appealRow(),
          action: actionRow(),
          appellant: appellantRow(),
        },
      ]),
    );
    socialMocks.useHandleAppeal.mockReturnValue(mutationResult(handle));
    renderAppealsPage(fakeClient);

    await user.click(screen.getByRole("button", { name: /^reverse$/i }));

    await waitFor(() => expect(handle).toHaveBeenCalled());
    expect(handle.mock.calls[0]![0]).toEqual({
      appealId: "appeal-1",
      decision: "reversed",
    });
  });

  it("shows a placeholder when the action is missing", () => {
    socialMocks.useAppeals.mockReturnValue(
      queryResult([
        { appeal: appealRow(), action: null, appellant: appellantRow() },
      ]),
    );
    renderAppealsPage(fakeClient);

    expect(
      screen.getByText(/original moderation action is no longer available/i),
    ).toBeInTheDocument();
  });

  it("labels suspension actions", () => {
    socialMocks.useAppeals.mockReturnValue(
      queryResult([
        {
          appeal: appealRow(),
          action: actionRow({ action: "suspend", target_type: "profile" }),
          appellant: appellantRow(),
        },
      ]),
    );
    renderAppealsPage(fakeClient);

    expect(screen.getByText("Suspension")).toBeInTheDocument();
  });
});
