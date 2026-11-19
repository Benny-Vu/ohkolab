/**
 * Test-only helpers for the direct message pages: a render with a fresh
 * query client per test (so cached threads never leak between tests), a
 * memory router with the messages routes, and the shared fake auth from the
 * account feature's test utils. Nothing in the app imports this file.
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
import { createFakeAuth } from "@/features/account/test-utils";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

export { createFakeAuth };

export interface RenderAtOptions {
  /** The route path the element is mounted at, e.g. "/messages/:id". */
  path: string;
  initialEntries?: string[];
}

/**
 * Renders a page at its route with a fresh query client and the given auth
 * context. Sibling routes render placeholder text, so navigation can be
 * asserted.
 */
export function renderAt(
  element: ReactNode,
  auth: AuthContextValue,
  options: RenderAtOptions,
) {
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
          {
            path: "messages",
            element:
              options.path === "/messages" ? (
                element
              ) : (
                <p>messages list content</p>
              ),
          },
          {
            path: "messages/:id",
            element:
              options.path === "/messages/:id" ? (
                element
              ) : (
                <p>thread content</p>
              ),
          },
          { path: "u/:username", element: <p>profile content</p> },
          { path: "", element: <p>home content</p> },
        ],
      },
    ],
    { initialEntries: options.initialEntries ?? [options.path] },
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
