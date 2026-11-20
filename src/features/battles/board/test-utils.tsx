/**
 * Test-only helpers for the battle board page: a render at /battles with a
 * fresh query client per test (so cached boards never leak between tests),
 * a memory router with the sibling routes the page links to, and the app's
 * fake auth contexts. Nothing in the app imports this file.
 */

import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach } from "vitest";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

/**
 * Renders the board page at /battles with the given auth context. The
 * sign-in link and profile links lead to placeholder routes.
 */
export function renderBoardPage(element: ReactNode, auth: AuthContextValue) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <AuthContext.Provider value={auth}>
            <Outlet />
          </AuthContext.Provider>
        ),
        children: [
          { path: "battles", element },
          { path: "login", element: <p>login content</p> },
          { path: "u/:username", element: <p>profile content</p> },
        ],
      },
    ],
    { initialEntries: ["/battles"] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}
