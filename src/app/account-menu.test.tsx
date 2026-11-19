import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSignedInAuth, renderAt } from "@/app/test-utils";

const moderatorMocks = vi.hoisted(() => ({
  useIsModerator: vi.fn(),
}));

vi.mock("@/lib/social/moderator-status", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/social/moderator-status")>();
  return {
    ...actual,
    useIsModerator: moderatorMocks.useIsModerator,
  };
});

const queryResult = (data: unknown) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
});

function tabNav() {
  return screen.getAllByRole("navigation", { name: "Main" })[1]!;
}

describe("AccountMenu", () => {
  beforeEach(() => {
    moderatorMocks.useIsModerator.mockReturnValue(queryResult(false));
  });

  it("offers sign-in in the header and on the tab bar when signed out", () => {
    renderAt("/");

    const headerSignIn = within(screen.getByRole("banner")).getByRole("link", {
      name: "Sign in",
    });
    expect(headerSignIn).toHaveAttribute("href", "/login");

    const tabSignIn = within(tabNav()).getByRole("link", {
      name: "Sign in",
    });
    expect(tabSignIn).toHaveAttribute("href", "/login");

    expect(
      screen.queryByRole("button", { name: "Account menu" }),
    ).not.toBeInTheDocument();
  });

  it("shows the avatar and a menu of account destinations when signed in", async () => {
    const auth = createSignedInAuth();
    renderAt("/", auth);
    const user = userEvent.setup();

    expect(screen.getAllByRole("img", { name: "Pikachu" })).toHaveLength(2);

    const [headerTrigger, tabTrigger] = screen.getAllByRole("button", {
      name: "Account menu",
    });
    expect(tabTrigger).toHaveTextContent("Profile");

    await user.click(headerTrigger!);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Ash")).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "Public page" }),
    ).toHaveAttribute("href", "/u/ashketchum");
    expect(
      within(menu).getByRole("menuitem", { name: "Profile" }),
    ).toHaveAttribute("href", "/profile");
    expect(
      within(menu).getByRole("menuitem", { name: "Groups" }),
    ).toHaveAttribute("href", "/groups");
    expect(
      within(menu).queryByRole("menuitem", { name: "Reports" }),
    ).not.toBeInTheDocument();

    await user.click(within(menu).getByRole("menuitem", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("shows moderation destinations for moderators", async () => {
    moderatorMocks.useIsModerator.mockReturnValue(queryResult(true));
    renderAt("/", createSignedInAuth());
    const user = userEvent.setup();

    await user.click(
      screen.getAllByRole("button", { name: "Account menu" })[0]!,
    );
    const menu = await screen.findByRole("menu");
    expect(
      within(menu).getByRole("menuitem", { name: "Reports" }),
    ).toHaveAttribute("href", "/admin/reports");
    expect(
      within(menu).getByRole("menuitem", { name: "Moderation" }),
    ).toHaveAttribute("href", "/admin/appeals");
  });
});
