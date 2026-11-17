import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { Providers } from "@/app/providers";
import { AuthContext } from "@/lib/auth/use-auth";
import { createFakeAuth, type FakeAuth } from "@/features/account/test-utils";
import { NewGroupPage } from "@/features/groups/new-group-page";

const mutationsMocks = vi.hoisted(() => ({
  useCreateGroup: vi.fn(),
}));

vi.mock("@/lib/groups/mutations", () => mutationsMocks);

const mutationResult = (
  mutateAsync: (args?: unknown) => Promise<unknown> = async () => ({
    ok: true,
    data: undefined,
  }),
) => ({ mutateAsync, mutate: vi.fn(), isPending: false });

function renderNewGroupPage(
  auth: FakeAuth = createFakeAuth(),
  initialEntries: string[] = ["/groups/new"],
) {
  const router = createMemoryRouter(
    [
      {
        path: "/groups/new",
        element: (
          <AuthContext.Provider value={auth}>
            <NewGroupPage />
          </AuthContext.Provider>
        ),
      },
      {
        path: "/g/:slug",
        element: <p>group page</p>,
      },
      {
        path: "/login",
        element: <p>login page</p>,
      },
    ],
    { initialEntries },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("NewGroupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationsMocks.useCreateGroup.mockReturnValue(mutationResult());
  });

  it("shows a sign-in prompt for guests", () => {
    renderNewGroupPage(
      createFakeAuth({ user: null, session: null, profile: null }),
    );

    expect(screen.getByText(/sign in to create a group/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create group/i }),
    ).not.toBeInTheDocument();
  });

  it("derives the slug from the name until the slug is edited", async () => {
    const user = userEvent.setup();
    renderNewGroupPage();

    await user.type(screen.getByLabelText("Name"), "Elite Four Fans!");

    expect(screen.getByLabelText("Address")).toHaveValue("elite-four-fans");
  });

  it("keeps a manually edited slug when the name changes", async () => {
    const user = userEvent.setup();
    renderNewGroupPage();

    await user.type(screen.getByLabelText("Name"), "Elite Four");
    const slug = screen.getByLabelText("Address");
    await user.clear(slug);
    await user.type(slug, "custom-slug");
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Another Name");

    expect(slug).toHaveValue("custom-slug");
  });

  it("creates the group and navigates to it", async () => {
    const mutateAsync = vi.fn(async () => ({
      ok: true,
      data: { id: "g1", slug: "elite-four-fans" },
    }));
    mutationsMocks.useCreateGroup.mockReturnValue(mutationResult(mutateAsync));
    const user = userEvent.setup();
    renderNewGroupPage();

    await user.type(screen.getByLabelText("Name"), "Elite Four Fans");
    await user.click(screen.getByRole("button", { name: /create group/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        name: "Elite Four Fans",
        slug: "elite-four-fans",
        description: "",
        visibility: "public",
      }),
    );
    expect(await screen.findByText("group page")).toBeInTheDocument();
  });

  it("shows the error message when creation fails", async () => {
    const mutateAsync = vi.fn(async () => ({
      ok: false,
      error: { code: "rate_limited", message: "Too many groups today." },
    }));
    mutationsMocks.useCreateGroup.mockReturnValue(mutationResult(mutateAsync));
    const user = userEvent.setup();
    renderNewGroupPage();

    await user.type(screen.getByLabelText("Name"), "Elite Four Fans");
    await user.click(screen.getByRole("button", { name: /create group/i }));

    expect(
      await screen.findByText("Too many groups today."),
    ).toBeInTheDocument();
    expect(screen.queryByText("group page")).not.toBeInTheDocument();
  });

  it("disables submission until the name and slug are valid", async () => {
    const user = userEvent.setup();
    renderNewGroupPage();

    const submit = screen.getByRole("button", { name: /create group/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("Name"), "Elite Four Fans");
    await waitFor(() => expect(submit).toBeEnabled());
  });

  it("shows a validation error for a short slug", async () => {
    const user = userEvent.setup();
    renderNewGroupPage();

    await user.type(screen.getByLabelText("Name"), "Elite Four Fans");
    const slug = screen.getByLabelText("Address");
    await user.clear(slug);
    await user.type(slug, "ab");

    expect(
      screen.getByRole("button", { name: /create group/i }),
    ).toBeDisabled();
  });
});
