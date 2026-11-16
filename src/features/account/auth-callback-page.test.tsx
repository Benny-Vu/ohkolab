import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthCallbackPage } from "@/features/account/auth-callback-page";
import { createFakeAuth, renderPage } from "@/features/account/test-utils";

describe("AuthCallbackPage", () => {
  it("completes the redirect once and navigates to the returnTo", async () => {
    const auth = createFakeAuth();
    auth.completeAuthRedirect = vi.fn().mockResolvedValue({
      ok: true,
      data: { returnTo: "/profile" },
    });
    renderPage(<AuthCallbackPage />, auth, { path: "/auth/callback" });

    await waitFor(() =>
      expect(screen.getByText("profile content")).toBeInTheDocument(),
    );
    expect(auth.completeAuthRedirect).toHaveBeenCalledTimes(1);
    expect(auth.completeAuthRedirect).toHaveBeenCalledWith(
      window.location.href,
    );
  });

  it("shows the failure message and a link to sign in", async () => {
    const auth = createFakeAuth(
      {},
      {
        completeAuthRedirect: {
          code: "invalid_input",
          message: "That sign-in link has expired. Request a new one.",
        },
      },
    );
    renderPage(<AuthCallbackPage />, auth, { path: "/auth/callback" });

    expect(
      await screen.findByText(
        "That sign-in link has expired. Request a new one.",
      ),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Back to sign in" });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("shows the pending state while the redirect is running", () => {
    const auth = createFakeAuth();
    auth.completeAuthRedirect = () => new Promise(() => undefined);
    renderPage(<AuthCallbackPage />, auth, { path: "/auth/callback" });

    expect(
      screen.getByRole("heading", { name: "Finishing sign-in…" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Back to sign in" }),
    ).not.toBeInTheDocument();
  });
});
