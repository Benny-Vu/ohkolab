import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { NotFoundPage, PageLoading, RouteError } from "@/app/route-pages";

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        children: [
          { index: true, element: <p>home content</p> },
          {
            path: "boom",
            loader: () => {
              throw new Error("kaboom");
            },
            errorElement: <RouteError />,
          },
          { path: "loading", element: <PageLoading /> },
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

describe("NotFoundPage", () => {
  it("explains the miss and links back home", async () => {
    const user = userEvent.setup();
    renderAt("/nope");

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "There is nothing at this address. It may have moved or never existed.",
      ),
    ).toBeInTheDocument();

    const home = screen.getByRole("link", { name: "Back to home" });
    expect(home).toHaveAttribute("href", "/");
    await user.click(home);
    expect(screen.getByText("home content")).toBeInTheDocument();
  });
});

describe("RouteError", () => {
  it("shows the error detail with a retry and a way home", async () => {
    const user = userEvent.setup();
    renderAt("/boom");

    expect(
      await screen.findByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(screen.getByText("kaboom")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reload" }));

    const home = screen.getByRole("link", { name: "Back to home" });
    expect(home).toHaveAttribute("href", "/");
    await user.click(home);
    expect(screen.getByText("home content")).toBeInTheDocument();
  });
});

describe("PageLoading", () => {
  it("marks the page busy while loading and links home", async () => {
    const user = userEvent.setup();
    renderAt("/loading");

    expect(document.querySelector('div[aria-busy="true"]')).toBeInTheDocument();

    const home = screen.getByRole("link", { name: "Back to home" });
    expect(home).toHaveAttribute("href", "/");
    await user.click(home);
    expect(screen.getByText("home content")).toBeInTheDocument();
  });
});
