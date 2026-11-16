import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ResetPasswordPage } from "@/features/account/reset-password-page";
import { createFakeAuth, renderPage } from "@/features/account/test-utils";
import type { AuthResult } from "@/lib/auth/types";

describe("ResetPasswordPage", () => {
  it("updates the password and navigates home", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ResetPasswordPage />, auth, { path: "/reset-password" });

    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() =>
      expect(screen.getByText("home content")).toBeInTheDocument(),
    );
    const call = auth.calls.find((c) => c.name === "updatePassword");
    expect(call?.args).toEqual(["newpassword1"]);
  });

  it("rejects a short password without calling the action", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ResetPasswordPage />, auth, { path: "/reset-password" });

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(
      screen.getByText("Password must be at least 8 characters."),
    ).toBeInTheDocument();
    expect(auth.calls.map((c) => c.name)).not.toContain("updatePassword");
  });

  it("rejects mismatched passwords", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ResetPasswordPage />, auth, { path: "/reset-password" });

    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "different1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(auth.calls.map((c) => c.name)).not.toContain("updatePassword");
  });

  it("shows the failure message when updating fails", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth(
      {},
      {
        updatePassword: {
          code: "invalid_input",
          message: "Your new password is too weak. Choose a stronger one.",
        },
      },
    );
    renderPage(<ResetPasswordPage />, auth, { path: "/reset-password" });

    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(
      await screen.findByText(
        "Your new password is too weak. Choose a stronger one.",
      ),
    ).toBeInTheDocument();
  });

  it("links back to the sign-in page", () => {
    renderPage(<ResetPasswordPage />, createFakeAuth(), {
      path: "/reset-password",
    });
    expect(
      screen.getByRole("link", { name: "Back to sign in" }),
    ).toHaveAttribute("href", "/login");
  });

  it("shows the guest notice when unconfigured", () => {
    const auth = createFakeAuth({
      isConfigured: false,
      user: null,
      session: null,
      profile: null,
    });
    renderPage(<ResetPasswordPage />, auth, { path: "/reset-password" });

    expect(screen.getByText("Accounts are unavailable")).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(auth.calls).toHaveLength(0);
  });

  it("puts a password-field failure under the new password field", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth(
      {},
      {
        updatePassword: {
          code: "invalid_input",
          message: "Your new password is too weak. Choose a stronger one.",
          field: "password",
        },
      },
    );
    renderPage(<ResetPasswordPage />, auth, { path: "/reset-password" });

    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    const error = await screen.findByText(
      "Your new password is too weak. Choose a stronger one.",
    );
    expect(error).toHaveAttribute("id", "new-password-error");
    const input = screen.getByLabelText("New password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "new-password-error");
  });

  it("marks the confirm field invalid on a mismatch", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    renderPage(<ResetPasswordPage />, auth, { path: "/reset-password" });

    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "different1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    const error = screen.getByText("Passwords do not match.");
    expect(error).toHaveAttribute("id", "confirm-password-error");
    const confirm = screen.getByLabelText("Confirm password");
    expect(confirm).toHaveAttribute("aria-invalid", "true");
    expect(confirm).toHaveAttribute(
      "aria-describedby",
      "confirm-password-error",
    );
    expect(screen.getByLabelText("New password")).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  it("disables the submit button and shows progress while updating", async () => {
    const user = userEvent.setup();
    const auth = createFakeAuth();
    let resolveUpdate!: (value: AuthResult) => void;
    auth.updatePassword = () =>
      new Promise<AuthResult>((resolve) => {
        resolveUpdate = resolve;
      });
    renderPage(<ResetPasswordPage />, auth, { path: "/reset-password" });

    await user.type(screen.getByLabelText("New password"), "newpassword1");
    await user.type(screen.getByLabelText("Confirm password"), "newpassword1");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    const submit = screen.getByRole("button", { name: "Update password" });
    expect(submit).toBeDisabled();
    expect(submit.querySelector(".animate-spin")).not.toBeNull();

    resolveUpdate({ ok: true, data: undefined });
    await waitFor(() =>
      expect(screen.getByText("home content")).toBeInTheDocument(),
    );
  });
});
