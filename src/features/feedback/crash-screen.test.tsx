import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthContext } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import { CrashScreen } from "@/features/feedback/crash-screen";
import { SIGNED_IN_AUTH } from "@/lib/social/test-client";

function renderScreen(
  auth: AuthContextValue = SIGNED_IN_AUTH,
  props: {
    crashId?: string | null;
    onReload?: () => void;
    onGoHome?: () => void;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={queryClient}>
        <CrashScreen {...props} />
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}

describe("CrashScreen", () => {
  it("shows the friendly message and actions", () => {
    renderScreen(SIGNED_IN_AUTH, { crashId: "abc123" });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/something broke on our side/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/abc123/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go home" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tell us what happened" }),
    ).toBeInTheDocument();
  });

  it("hides the crash reference when there is no crash id", () => {
    renderScreen();
    expect(screen.queryByText(/crash reference/i)).not.toBeInTheDocument();
  });

  it("calls onReload and onGoHome when provided", async () => {
    const onReload = vi.fn();
    const onGoHome = vi.fn();
    const user = userEvent.setup();
    renderScreen(SIGNED_IN_AUTH, { onReload, onGoHome });
    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Go home" }));
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it("opens the feedback dialog with the bug kind and crash id", async () => {
    const user = userEvent.setup();
    renderScreen(SIGNED_IN_AUTH, { crashId: "evt-42" });
    await user.click(
      screen.getByRole("button", { name: "Tell us what happened" }),
    );
    expect(screen.getByText("Send feedback")).toBeInTheDocument();
    // Bug is preselected in the kind toggle group.
    expect(
      screen.getByRole("radio", { name: /bug/i, checked: true }),
    ).toBeInTheDocument();
    // The crash id is mentioned in the technical-details label.
    expect(screen.getByText(/crash id/i)).toBeInTheDocument();
  });
});
