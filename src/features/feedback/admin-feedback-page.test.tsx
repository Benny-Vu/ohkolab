import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";

import { AuthContext } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import { AdminFeedbackPage } from "@/features/feedback/admin-feedback-page";
import type { FeedbackRow } from "@/lib/database.types";
import {
  createFakeClient,
  SIGNED_IN_AUTH,
  type FakeClient,
} from "@/lib/social/test-client";

function feedbackRow(
  partial: Partial<FeedbackRow> & { id: string },
): FeedbackRow {
  return {
    user_id: "user-1",
    kind: "bug",
    message: "The damage calc is broken",
    context: null,
    status: "new",
    created_at: "2026-11-19T10:00:00Z",
    handled_by: null,
    handled_at: null,
    ...partial,
  } as FeedbackRow;
}

function renderPage(fake: FakeClient, auth: AuthContextValue = SIGNED_IN_AUTH) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: "/admin/feedback",
        element: (
          <AuthContext.Provider value={auth}>
            <QueryClientProvider client={queryClient}>
              <AdminFeedbackPage client={fake.client} />
            </QueryClientProvider>
          </AuthContext.Provider>
        ),
      },
      {
        path: "/u/:username",
        element: <p>profile</p>,
      },
      {
        path: "*",
        element: <p>not found route</p>,
      },
    ],
    { initialEntries: ["/admin/feedback"] },
  );
  return render(<RouterProvider router={router} />);
}

function moderatorClient(
  overrides: {
    feedbackRows?: FeedbackRow[];
    profile?: Record<string, unknown> | null;
  } = {},
) {
  return createFakeClient({
    rpc: { is_moderator: { data: true, error: null } },
    resolve: (record) => {
      if (record.table === "feedback") {
        return { data: overrides.feedbackRows ?? [], error: null };
      }
      if (record.table === "profiles") {
        return { data: overrides.profile ?? null, error: null };
      }
      return { data: [], error: null };
    },
  });
}

describe("AdminFeedbackPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the unavailable alert when the client is null", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <AuthContext.Provider value={SIGNED_IN_AUTH}>
        <QueryClientProvider client={queryClient}>
          <AdminFeedbackPage client={null} />
        </QueryClientProvider>
      </AuthContext.Provider>,
    );
    expect(screen.getByText("Moderation is unavailable")).toBeInTheDocument();
  });

  it("shows the not-found page for non-moderators", async () => {
    const fake = createFakeClient({
      rpc: { is_moderator: { data: false, error: null } },
    });
    renderPage(fake);
    expect(
      await screen.findByText(/there is nothing at this address/i),
    ).toBeInTheDocument();
  });

  it("lists new feedback with sender details and tabs", async () => {
    const fake = moderatorClient({
      feedbackRows: [feedbackRow({ id: "fb-1" })],
      profile: {
        id: "user-1",
        username: "ash",
        display_name: "Ash",
        avatar_species: "pikachu",
      },
    });
    renderPage(fake);
    expect(
      await screen.findByText("The damage calc is broken"),
    ).toBeInTheDocument();
    expect(await screen.findByText("@ash")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "New" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Seen" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Done" })).toBeInTheDocument();
  });

  it("shows the empty state when there is no feedback", async () => {
    const fake = moderatorClient({ feedbackRows: [] });
    renderPage(fake);
    expect(await screen.findByText("No new feedback.")).toBeInTheDocument();
  });

  it("shows a Sentry link when the context has a crash id", async () => {
    const fake = moderatorClient({
      feedbackRows: [
        feedbackRow({
          id: "fb-2",
          context: { crash_id: "evt-42", page: "/damage" },
        }),
      ],
    });
    renderPage(fake);
    const link = await screen.findByRole("link", {
      name: /view crash in sentry/i,
    });
    expect(link).toHaveAttribute(
      "href",
      "https://sentry.io/organizations/vu-forge/issues/?query=evt-42",
    );
  });

  it("marks feedback seen through set_feedback_status", async () => {
    const fake = moderatorClient({
      feedbackRows: [feedbackRow({ id: "fb-3" })],
    });
    const user = userEvent.setup();
    renderPage(fake);
    await screen.findByText("The damage calc is broken");
    await user.click(screen.getByRole("button", { name: /mark seen/i }));
    await waitFor(() => {
      const call = fake.rpcCalls.find((c) => c.fn === "set_feedback_status");
      expect(call?.args).toEqual({
        feedback_id: "fb-3",
        new_status: "seen",
      });
    });
  });

  it("marks feedback done through set_feedback_status", async () => {
    const fake = moderatorClient({
      feedbackRows: [feedbackRow({ id: "fb-4", status: "seen" })],
    });
    const user = userEvent.setup();
    renderPage(fake);
    await screen.findByText("The damage calc is broken");
    await user.click(screen.getByRole("button", { name: /mark done/i }));
    await waitFor(() => {
      const call = fake.rpcCalls.find((c) => c.fn === "set_feedback_status");
      expect(call?.args).toEqual({
        feedback_id: "fb-4",
        new_status: "done",
      });
    });
  });

  it("shows deleted account when the sender profile is gone", async () => {
    const fake = moderatorClient({
      feedbackRows: [feedbackRow({ id: "fb-5" })],
      profile: null,
    });
    renderPage(fake);
    expect(await screen.findByText("Deleted account")).toBeInTheDocument();
  });
});
