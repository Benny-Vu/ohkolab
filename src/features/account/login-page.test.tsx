import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "@/features/account/login-page";
import { createFakeAuth, renderPage } from "@/features/account/test-utils";
import type { AuthContextValue, AuthResult } from "@/lib/auth/types";
import { resetTurnstileLoadForTests } from "@/lib/turnstile/script";
import type { TurnstileRenderOptions } from "@/lib/turnstile/types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetTurnstileLoadForTests();
});

/** A fake `window.turnstile` the test can solve and expire by hand. */
function stubTurnstile() {
  const handles: TurnstileRenderOptions[] = [];
  const reset = vi.fn();
  vi.stubGlobal("turnstile", {
    render: vi.fn(
      (_container: HTMLElement, options: TurnstileRenderOptions) => {
        handles.push(options);
        return `widget-${handles.length}`;
      },
    ),
    reset,
    remove: vi.fn(),
  });
  return {
    handles,
    reset,
    solve: (token: string) => handles.at(-1)?.callback?.(token),
    expire: () => handles.at(-1)?.["expired-callback"]?.(),
  };
}

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
        "Confirm that you are 16 or older and accept the terms to create an account.",
      ),
    ).toBeInTheDocument();
    expect(auth.calls.map((c) => c.name)).not.toContain("signUp");

    await user.click(
      screen.getByLabelText(
        "I am 16 or older and accept the terms and privacy policy",
      ),
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
      screen.getByLabelText(
        "I am 16 or older and accept the terms and privacy policy",
      ),
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

  it("shows the guest notice instead of the form when unconfigured", () => {
    const auth = createFakeAuth({
      isConfigured: false,
      user: null,
      session: null,
      profile: null,
    });
    renderPage(<LoginPage />, auth, { path: "/login" });

    expect(screen.getByText("Accounts are unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Accounts are not available in this build/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(auth.calls).toHaveLength(0);
  });

  it("marks an invalid email and links its error to the input", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const emailInput = screen.getByLabelText("Email");
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    expect(emailInput).toHaveAttribute(
      "aria-describedby",
      "signin-email-error",
    );
    expect(screen.getByText("Enter a valid email address.")).toHaveAttribute(
      "id",
      "signin-email-error",
    );
  });

  it("links the sign-up checkbox text to the terms and privacy pages", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.click(screen.getByRole("tab", { name: "Sign up" }));

    expect(screen.getByRole("link", { name: "terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(
      screen.getByRole("link", { name: "privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("marks the terms checkbox invalid when sign-up is missing it", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.click(screen.getByRole("tab", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "misty@example.com");
    await user.type(screen.getByLabelText("Password"), "staryu12345");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    const checkbox = screen.getByLabelText(
      "I am 16 or older and accept the terms and privacy policy",
    );
    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAttribute("aria-describedby", "signup-terms-error");
    expect(
      screen.getByText(
        "Confirm that you are 16 or older and accept the terms to create an account.",
      ),
    ).toHaveAttribute("id", "signup-terms-error");
  });

  it("links a form-level failure to the submit button", async () => {
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

    const error = await screen.findByText("Wrong email or password.");
    expect(error).toHaveAttribute("id", "signin-form-error");
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveAttribute(
      "aria-describedby",
      "signin-form-error",
    );
  });

  it("disables the form and shows progress while signing in", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    let resolveSignIn!: (value: AuthResult) => void;
    auth.signInWithPassword = () =>
      new Promise<AuthResult>((resolve) => {
        resolveSignIn = resolve;
      });
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "pikachu123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const submit = screen.getByRole("button", { name: "Sign in" });
    expect(submit).toBeDisabled();
    expect(submit.querySelector(".animate-spin")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Forgot password?" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Continue with Discord" }),
    ).toBeDisabled();

    resolveSignIn({ ok: true, data: undefined });
    await waitFor(() =>
      expect(screen.getByText("home content")).toBeInTheDocument(),
    );
  });
});

describe("LoginPage with Turnstile (VITE_TURNSTILE_SITE_KEY set)", () => {
  const guest = () =>
    createFakeAuth({ user: null, session: null, profile: null });

  it("renders the widget and holds the submit until it is solved", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    const turnstile = stubTurnstile();
    renderPage(<LoginPage />, guest(), { path: "/login" });

    const submit = screen.getByRole("button", { name: "Sign in" });
    expect(submit).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Forgot password?" }),
    ).toBeDisabled();

    await waitFor(() => expect(turnstile.handles).toHaveLength(1));
    const handle = turnstile.handles[0];
    if (!handle) throw new Error("the widget has not rendered yet");
    expect(handle.sitekey).toBe("site-key-x");
    turnstile.solve("token-123");

    await waitFor(() => expect(submit).toBeEnabled());
  });

  it("sends the solved token with the sign-in request", async () => {
    const user = userEvent.setup();
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    const turnstile = stubTurnstile();
    const auth = guest();
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "pikachu123");
    turnstile.solve("token-123");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByText("home content")).toBeInTheDocument(),
    );
    expect(
      auth.calls.find((c) => c.name === "signInWithPassword")?.args,
    ).toEqual(["ash@example.com", "pikachu123", "token-123"]);
  });

  it("re-disables the submit when the token expires", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    const turnstile = stubTurnstile();
    renderPage(<LoginPage />, guest(), { path: "/login" });

    const submit = screen.getByRole("button", { name: "Sign in" });
    await waitFor(() => expect(turnstile.handles).toHaveLength(1));
    turnstile.solve("token-123");
    await waitFor(() => expect(submit).toBeEnabled());

    turnstile.expire();

    await waitFor(() => expect(submit).toBeDisabled());
  });

  it("demands a fresh token after a failed sign-in", async () => {
    const user = userEvent.setup();
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    const turnstile = stubTurnstile();
    const auth = createFakeAuth(
      { user: null, session: null, profile: null },
      {
        signInWithPassword: {
          code: "invalid_credentials",
          message: "Wrong email or password.",
        },
      },
    );
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "pikachu123");
    turnstile.solve("token-123");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Wrong email or password."),
    ).toBeInTheDocument();
    await waitFor(() => expect(turnstile.reset).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("sends the solved token with the sign-up request", async () => {
    const user = userEvent.setup();
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    const turnstile = stubTurnstile();
    const auth = guest();
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.click(screen.getByRole("tab", { name: "Sign up" }));
    await user.type(screen.getByLabelText("Email"), "misty@example.com");
    await user.type(screen.getByLabelText("Password"), "staryu12345");
    await user.click(
      screen.getByLabelText(
        "I am 16 or older and accept the terms and privacy policy",
      ),
    );
    turnstile.solve("token-456");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign up" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() =>
      expect(screen.getByText("home content")).toBeInTheDocument(),
    );
    expect(auth.calls.find((c) => c.name === "signUp")?.args).toEqual([
      {
        email: "misty@example.com",
        password: "staryu12345",
        acceptedTerms: true,
        captchaToken: "token-456",
      },
    ]);
  });

  it("sends the solved token with the password reset request", async () => {
    const user = userEvent.setup();
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "site-key-x");
    const turnstile = stubTurnstile();
    const auth = guest();
    renderPage(<LoginPage />, auth, { path: "/login" });

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    turnstile.solve("token-789");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Forgot password?" }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));

    expect(await screen.findByText("Reset link sent")).toBeInTheDocument();
    expect(
      auth.calls.find((c) => c.name === "requestPasswordReset")?.args,
    ).toEqual(["ash@example.com", "token-789"]);
  });
});

describe("LoginPage without a Turnstile site key", () => {
  it("renders no widget and signs in without a token", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth({ user: null, session: null, profile: null });
    renderPage(<LoginPage />, auth, { path: "/login" });

    // No script is fetched and the submit is not held back.
    expect(document.querySelector("script[data-ohkolab-turnstile]")).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();

    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "pikachu123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByText("home content")).toBeInTheDocument(),
    );
    expect(
      auth.calls.find((c) => c.name === "signInWithPassword")?.args,
    ).toEqual(["ash@example.com", "pikachu123"]);
  });
});
