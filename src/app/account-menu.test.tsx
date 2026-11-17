import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createSignedInAuth, renderAt } from "@/app/test-utils";

function tabNav() {
  return screen.getAllByRole("navigation", { name: "Main" })[1]!;
}

describe("AccountMenu", () => {
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
    expect(tabTrigger).toHaveTextContent("ashketchum");

    await user.click(headerTrigger!);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Ash")).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "Public page" }),
    ).toHaveAttribute("href", "/u/ashketchum");
    expect(
      within(menu).getByRole("menuitem", { name: "Profile" }),
    ).toHaveAttribute("href", "/profile");

    await user.click(within(menu).getByRole("menuitem", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});
