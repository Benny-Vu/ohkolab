import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { AppLayout } from "@/app/app-layout";
import { NAV_ITEMS } from "@/app/nav-items";
import { Providers } from "@/app/providers";
import { NotFoundPage } from "@/app/route-pages";

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <p>home content</p> },
          { path: "calc", element: <p>calc content</p> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

describe("AppLayout", () => {
  it("shows every destination in both navigations and marks the current one", () => {
    renderAt("/calc");
    expect(screen.getByText("calc content")).toBeInTheDocument();

    const navs = screen.getAllByRole("navigation", { name: "Main" });
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      for (const item of NAV_ITEMS) {
        expect(
          within(nav).getByRole("link", { name: item.label }),
        ).toHaveAttribute("href", item.to);
      }
      expect(within(nav).getByRole("link", { name: "Calc" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(
        within(nav).getByRole("link", { name: "Home" }),
      ).not.toHaveAttribute("aria-current");
    }
  });

  it("shows the not-found page for unknown addresses", () => {
    renderAt("/nope");
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
  });
});
