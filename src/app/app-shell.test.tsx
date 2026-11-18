import { act, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { AppLayout } from "@/app/app-layout";
import { Providers } from "@/app/providers";
import { PageLoading } from "@/app/route-pages";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";

describe("app shell during route hydration", () => {
  it("keeps the header and tab bar mounted while a lazy page loads", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <AuthContext.Provider value={GUEST_AUTH}>
              <AppLayout />
            </AuthContext.Provider>
          ),
          children: [
            {
              hydrateFallbackElement: <PageLoading />,
              children: [
                {
                  path: "lazy",
                  lazy: async () => ({
                    Component: () => <p>lazy content</p>,
                  }),
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ["/lazy"] },
    );

    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    );

    // The shell renders synchronously; only the page area shows the fallback.
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "Back to home" }),
    ).toBeInTheDocument();

    await screen.findByText("lazy content");
    expect(
      screen.queryByRole("link", { name: "Back to home" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the shell when a later lazy navigation starts", async () => {
    let resolveLazy: (value: { Component: () => ReactElement }) => void;
    const lazyPromise = new Promise<{ Component: () => ReactElement }>(
      (resolve) => {
        resolveLazy = resolve;
      },
    );

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <AuthContext.Provider value={GUEST_AUTH}>
              <AppLayout />
            </AuthContext.Provider>
          ),
          children: [
            {
              hydrateFallbackElement: <PageLoading />,
              children: [
                { path: "start", element: <p>start content</p> },
                {
                  path: "slow",
                  lazy: () => lazyPromise,
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ["/start"] },
    );

    render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    );

    expect(screen.getByText("start content")).toBeInTheDocument();

    await waitFor(() => {
      router.navigate("/slow");
    });
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("start content")).toBeInTheDocument();

    await act(async () => {
      resolveLazy({ Component: () => <p>slow content</p> });
    });
    await screen.findByText("slow content");
  });
});
