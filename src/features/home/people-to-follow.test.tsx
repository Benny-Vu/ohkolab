import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth } from "@/features/account/test-utils";
import { PeopleToFollow } from "@/features/home/people-to-follow";

const suggestionsMocks = vi.hoisted(() => ({
  useFollowSuggestions: vi.fn(),
  FOLLOW_SUGGESTIONS_QUERY_KEY: ["social", "follow-suggestions"],
}));

const mutationsMocks = vi.hoisted(() => ({
  useToggleFollow: vi.fn(),
}));

vi.mock("@/lib/social/suggestions", () => suggestionsMocks);
vi.mock("@/lib/social/mutations", () => mutationsMocks);

const suggestion = {
  id: "user-2",
  username: "brock",
  displayName: "Brock",
  avatarSpecies: "Onix",
  mainFormat: "doubles" as const,
  score: 4,
};

const queryResult = (data: unknown[], extra: Record<string, unknown> = {}) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...extra,
});

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

function renderPeopleToFollow() {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <AuthContext.Provider value={createFakeAuth()}>
            <PeopleToFollow />
          </AuthContext.Provider>
        ),
      },
      {
        path: "/u/:username",
        element: <p>profile page</p>,
      },
    ],
    { initialEntries: ["/"] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("PeopleToFollow", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    suggestionsMocks.useFollowSuggestions.mockReturnValue(queryResult([]));
    mutationsMocks.useToggleFollow.mockReturnValue(mutationResult());
  });

  it("renders nothing when there are no suggestions", () => {
    renderPeopleToFollow();

    expect(screen.queryByText(/people to follow/i)).not.toBeInTheDocument();
  });

  it("renders nothing for signed-out users", () => {
    suggestionsMocks.useFollowSuggestions.mockReturnValue(
      queryResult([suggestion]),
    );
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <AuthContext.Provider
              value={createFakeAuth({
                user: null,
                session: null,
                profile: null,
              })}
            >
              <PeopleToFollow />
            </AuthContext.Provider>
          ),
        },
      ],
      { initialEntries: ["/"] },
    );
    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    );

    expect(screen.queryByText(/people to follow/i)).not.toBeInTheDocument();
  });

  it("lists suggestions with a profile link and their format", async () => {
    suggestionsMocks.useFollowSuggestions.mockReturnValue(
      queryResult([suggestion]),
    );
    renderPeopleToFollow();

    const link = screen.getByRole("link", { name: /brock/i });
    expect(link).toHaveAttribute("href", "/u/brock");
    expect(screen.getByText("Plays doubles")).toBeInTheDocument();
  });

  it("follows the suggested user from the row", async () => {
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useToggleFollow.mockReturnValue(mutationResult(mutateAsync));
    suggestionsMocks.useFollowSuggestions.mockReturnValue(
      queryResult([suggestion]),
    );
    const user = userEvent.setup();
    renderPeopleToFollow();

    await user.click(screen.getByRole("button", { name: /^follow$/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    // The row is removed once the follow goes through (the success toast
    // names the user, so assert on the row itself, not a substring).
    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: /brock/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("hides the row the moment the follow starts and brings it back on failure", async () => {
    let settleFollow!: (value: {
      ok: boolean;
      error?: { code: string; message: string };
    }) => void;
    const mutateAsync = vi.fn(
      () =>
        new Promise((resolve) => {
          settleFollow = resolve;
        }),
    );
    mutationsMocks.useToggleFollow.mockReturnValue(mutationResult(mutateAsync));
    suggestionsMocks.useFollowSuggestions.mockReturnValue(
      queryResult([suggestion]),
    );
    const user = userEvent.setup();
    renderPeopleToFollow();

    await user.click(screen.getByRole("button", { name: /^follow$/i }));

    expect(mutateAsync).toHaveBeenCalled();
    // Optimistic: the row is gone before the server has answered.
    expect(screen.queryByText("Brock")).not.toBeInTheDocument();

    settleFollow({
      ok: false,
      error: { code: "rate_limited", message: "Follow refused." },
    });
    // The refused follow puts the row back, next to the error toast.
    expect(await screen.findByText("Brock")).toBeInTheDocument();
    expect(await screen.findByText(/follow refused/i)).toBeInTheDocument();
  });

  it("shows the failure message when following fails", async () => {
    const mutateAsync = vi.fn(async () => ({
      ok: false,
      error: { code: "rate_limited", message: "Too many follows." },
    }));
    mutationsMocks.useToggleFollow.mockReturnValue(mutationResult(mutateAsync));
    suggestionsMocks.useFollowSuggestions.mockReturnValue(
      queryResult([suggestion]),
    );
    const user = userEvent.setup();
    renderPeopleToFollow();

    await user.click(screen.getByRole("button", { name: /^follow$/i }));

    expect(await screen.findByText(/too many follows/i)).toBeInTheDocument();
    expect(screen.getByText("Brock")).toBeInTheDocument();
  });

  it("dismisses a suggestion and remembers it per user", async () => {
    suggestionsMocks.useFollowSuggestions.mockReturnValue(
      queryResult([
        suggestion,
        {
          ...suggestion,
          id: "user-3",
          username: "misty",
          displayName: "Misty",
        },
      ]),
    );
    const user = userEvent.setup();
    renderPeopleToFollow();

    await user.click(
      screen.getByRole("button", {
        name: /dismiss the suggestion for @brock/i,
      }),
    );

    expect(screen.queryByText("Brock")).not.toBeInTheDocument();
    expect(screen.getByText("Misty")).toBeInTheDocument();

    // The dismissal is remembered: the storage key is per user id ("user-1"
    // from createFakeAuth).
    const raw = localStorage.getItem("ohkolab:dismissed-suggestions:user-1");
    expect(raw).toContain("user-2");
  });

  it("shows an error with retry when the query fails", async () => {
    const refetch = vi.fn();
    suggestionsMocks.useFollowSuggestions.mockReturnValue(
      queryResult([], {
        isError: true,
        error: { code: "unknown", message: "Something went wrong" },
        refetch,
      }),
    );
    const user = userEvent.setup();
    renderPeopleToFollow();

    expect(
      await screen.findByText(/could not load suggestions/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
