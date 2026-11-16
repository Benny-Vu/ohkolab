import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginPage } from "@/features/account/login-page";
import { createFakeAuth, renderPage } from "@/features/account/test-utils";
import type { AuthContextValue } from "@/lib/auth/types";

describe("LoginPage", () => {
  it("redirects away when already signed in", () => {
    renderPage(<LoginPage />, createFakeAuth(), { path: "/login" });
    expect(screen.getByText("home content")).toBeInTheDocument();
  });

  it("shows the sign-in and sign-up tabs for a guest", () => {
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, { path: "/login" });
    expect(screen.getByRole("tab", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sign up" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Discord" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Forgot password?" }),
    ).toBeInTheDocument();
  });

  it("signs in with email and password and navigates to returnTo", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, {
      path: "/login",
      initialEntries: ["/login?returnTo=/profile"],
    });

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "pikachu123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByText("profile content")).toBeInTheDocument(),
    );
    expect(auth.calls.map((c) => c.name)).toContain("signInWithPassword");
    const call = auth.calls.find((c) => c.name === "signInWithPassword");
    expect(call?.args).toEqual(["ash@example.com", "pikachu123"]);
  });

  it("shows field errors for an invalid email and short password", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(auth.calls.map((c) => c.name)).not.toContain("signInWithPassword");
  });

  it("shows the failure message from the action", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth(
      { user: null, session: null, profile: null },
      {
        signInWithPassword: {
          code: "invalid_input",
          message: "Wrong email or password.",
        },
      },
    );
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "pikachu123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Wrong email or password."),
    ).toBeInTheDocument();
  });

  it("puts a field failure under the field it belongs to", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth(
      { user: null, session: null, profile: null },
      {
        signInWithPassword: {
          code: "invalid_input",
          message: "Enter a valid email address.",
          field: "email",
        },
      },
    );
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "pikachu123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
  });

  it("signs up, requires the terms checkbox and navigates on success", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, {
      path: "/login",
      initialEntries: ["/login?returnTo=/profile"],
    });

    await user.click(screen.getByRole("tab", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "misty@example.com");
    await user.type(screen.getByLabelText("Password"), "staryu12345");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      screen.getByText(
        "Confirm that you are 13 or older and accept the terms to create an account.",
      ),
    ).toBeInTheDocument();
    expect(auth.calls.map((c) => c.name)).not.toContain("signUp");

    await user.click(
      screen.getByLabelText("I am 13 or older and accept the terms"),
    );
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(screen.getByText("profile content")).toBeInTheDocument(),
    );
    const call = auth.calls.find((c) => c.name === "signUp");
    expect(call?.args).toEqual([
      {
        email: "misty@example.com",
        password: "staryu12345",
        acceptedTerms: true,
      },
    ]);
  });

  it("shows check-your-email when sign-up needs email confirmation", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth(
      { user: null, session: null, profile: null },
      {},
    );
    auth.signUp = vi.fn().mockResolvedValue({
      ok: true,
      data: { needsEmailConfirmation: true },
    });
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.click(screen.getByRole("tab", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "misty@example.com");
    await user.type(screen.getByLabelText("Password"), "staryu12345");
    await user.click(
      screen.getByLabelText("I am 13 or older and accept the terms"),
    );
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Confirm your account")).toBeInTheDocument();
    expect(screen.getByText(/misty@example.com/)).toBeInTheDocument();
  });

  it("sends a password reset email", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));

    expect(await screen.findByText("Reset link sent")).toBeInTheDocument();
    const call = auth.calls.find((c) => c.name === "requestPasswordReset");
    expect(call?.args).toEqual(["ash@example.com"]);
  });

  it("starts provider sign-in with the sanitized returnTo", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, {
      path: "/login",
      initialEntries: ["/login?returnTo=/profile"],
    });

    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() => {
      const call = auth.calls.find((c) => c.name === "signInWithProvider");
      expect(call?.args).toEqual(["google", "/profile"]);
    });
  });

  it("shows the provider failure message", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth(
      { user: null, session: null, profile: null },
      {
        signInWithProvider: {
          code: "invalid_input",
          message:
            "Google sign-in is not available yet. Use another way to sign in for now.",
        },
      },
    );
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(
      await screen.findByText(
        "Google sign-in is not available yet. Use another way to sign in for now.",
      ),
    ).toBeInTheDocument();
  });

  it("ignores an unsafe returnTo", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, {
      path: "/login",
      initialEntries: ["/login?returnTo=https://evil.example"],
    });

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "pikachu123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByText("home content")).toBeInTheDocument(),
    );
  });

  it("renders while loading without redirecting", () => {
    const auth = createFakeAuth({
      loading: true,
      user: null,
      session: null,
      profile: null,
    } as Partial<AuthContextValue>);
    renderPage(<LoginPage />, auth, { path: "/login" });
    expect(screen.getByRole("tab", { name: "Sign in" })).toBeInTheDocument();
  });
});
