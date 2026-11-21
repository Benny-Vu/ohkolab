import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";

// The unread badge is lazy-loaded from the messages feature (which would
// pull Supabase into this test); a plain stub stands in.
vi.mock("@/features/messages/nav-unread-badge", () => ({
  MessagesNavBadge: () => <span>7</span>,
}));

/**
 * MORE_ITEMS is decided at module load, so each test re-imports the menu
 * fresh (vi.resetModules) under its own flag values.
 */
async function renderMoreMenu(
  at: string,
  variant: "header" | "tab",
  demo = false,
) {
  vi.resetModules();
  const { MoreMenu } = await import("@/app/more-menu");
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <MoreMenu variant={variant} demo={demo} />,
        children: [
          { path: "notes", element: <p>notes content</p> },
          { path: "battles", element: <p>battles content</p> },
          { path: "messages", element: <p>messages content</p> },
        ],
      },
    ],
    { initialEntries: [at] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("MoreMenu", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("opens with the keyboard and lists the flagged destinations as links", async () => {
    vi.stubEnv("VITE_BATTLES", "true");
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const user = userEvent.setup();
    await renderMoreMenu("/", "header");

    const trigger = screen.getByRole("button", { name: /More/ });
    trigger.focus();
    await user.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");

    expect(
      within(menu).getByRole("menuitem", { name: "Notes" }),
    ).toHaveAttribute("href", "/notes");
    expect(
      within(menu).getByRole("menuitem", { name: "Learn" }),
    ).toHaveAttribute("href", "/learn");
    expect(
      within(menu).getByRole("menuitem", { name: "Battles" }),
    ).toHaveAttribute("href", "/battles");
    // The unread badge rides along in the item's accessible name.
    expect(
      within(menu).getByRole("menuitem", { name: /Messages/ }),
    ).toHaveAttribute("href", "/messages");

    // Escape closes the menu and hands focus back to the trigger.
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps Notes and Learn while the flags are off", async () => {
    vi.stubEnv("VITE_BATTLES", "");
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
    const user = userEvent.setup();
    await renderMoreMenu("/", "tab");

    await user.click(screen.getByRole("button", { name: /More/ }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
    expect(
      within(menu).getByRole("menuitem", { name: "Notes" }),
    ).toHaveAttribute("href", "/notes");
    expect(
      within(menu).getByRole("menuitem", { name: "Learn" }),
    ).toHaveAttribute("href", "/learn");
  });

  it("marks the trigger as the active destination on a More page", async () => {
    vi.stubEnv("VITE_BATTLES", "");
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
    await renderMoreMenu("/notes", "header");

    // The header underline is always in the DOM; the active state scales
    // it in.
    expect(screen.getByRole("button", { name: /More/ })).toHaveClass(
      "after:opacity-100",
    );
  });

  it("carries the unread badge on the trigger and the Messages item", async () => {
    vi.stubEnv("VITE_BATTLES", "");
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const user = userEvent.setup();
    await renderMoreMenu("/", "header");

    // The badge chunk is lazy, so it lands after a beat.
    const trigger = screen.getByRole("button", { name: /More/ });
    await within(trigger).findByText("7");
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(
      within(menu).getByRole("menuitem", { name: /Messages/ }),
    ).toHaveTextContent("7");
  });

  it("hides the badge in recording mode", async () => {
    vi.stubEnv("VITE_BATTLES", "");
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const user = userEvent.setup();
    await renderMoreMenu("/", "tab", true);

    const trigger = screen.getByRole("button", { name: /More/ });
    await user.click(trigger);
    expect(trigger).not.toHaveTextContent("7");
    expect((await screen.findByRole("menu")).textContent).not.toContain("7");
  });
});
