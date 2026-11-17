import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth } from "@/features/account/test-utils";
import { Composer } from "@/features/feed/composer";
import { TEAMS_STORAGE_KEY } from "@/lib/team";
import type { Team } from "@/types/team";

const mutationsMocks = vi.hoisted(() => ({
  useCreatePost: vi.fn(),
}));

vi.mock("@/lib/social/mutations", () => mutationsMocks);

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

function seedTeam(name: string): Team {
  const team: Team = {
    id: "team-1",
    name,
    format: "doubles",
    members: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
  localStorage.setItem(
    TEAMS_STORAGE_KEY,
    JSON.stringify({ version: 1, teams: [team] }),
  );
  return team;
}

function renderComposer(auth = createFakeAuth()) {
  return render(
    <Providers>
      <AuthContext.Provider value={auth}>
        <Composer />
      </AuthContext.Provider>
    </Providers>,
  );
}

describe("Composer", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mutationsMocks.useCreatePost.mockReturnValue(mutationResult());
  });

  it("disables the post button until the body is filled", async () => {
    const user = userEvent.setup();
    renderComposer();

    const textarea = screen.getByRole("textbox", { name: "Write a post" });
    const postButton = screen.getByRole("button", { name: /^post$/i });
    expect(postButton).toBeDisabled();

    await user.type(textarea, "Hello world");

    expect(postButton).toBeEnabled();
    expect(screen.getByText("11/2000")).toBeInTheDocument();
  });

  it("submits the post and clears the form", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useCreatePost.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderComposer();

    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "Hello world",
    );
    await user.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        body: "Hello world",
        attachment: null,
        groupId: null,
      }),
    );
    expect(screen.getByRole("textbox", { name: "Write a post" })).toHaveValue(
      "",
    );
  });

  it("attaches a team and sends it with the post", async () => {
    const user = userEvent.setup();
    seedTeam("Champion team");
    const mutateAsync = vi.fn(async () => ({ ok: true, data: undefined }));
    mutationsMocks.useCreatePost.mockReturnValue({
      mutateAsync,
      mutate: vi.fn(),
      isPending: false,
    });
    renderComposer();

    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "Check this team",
    );
    await user.click(screen.getByRole("combobox", { name: "Attach a team" }));
    await user.click(
      await screen.findByRole("option", { name: "Champion team" }),
    );

    expect(
      screen.getByText('Team "Champion team" will be attached to this post.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          body: "Check this team",
          attachment: expect.objectContaining({
            kind: "team",
            name: "Champion team",
          }),
        }),
      ),
    );
  });

  it("shows the error message when posting fails", async () => {
    const user = userEvent.setup();
    mutationsMocks.useCreatePost.mockReturnValue(
      mutationResult(async () => ({
        ok: false,
        error: {
          code: "rate_limited",
          message:
            "You are posting too quickly. Wait a few minutes and try again.",
        },
      })),
    );
    renderComposer();

    await user.type(
      screen.getByRole("textbox", { name: "Write a post" }),
      "Hello world",
    );
    await user.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/you are posting too quickly/i),
      ).toBeInTheDocument(),
    );
  });
});
