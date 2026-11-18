import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import { FeedbackDialog } from "@/features/feedback/feedback-dialog";
import {
  createFakeClient,
  SIGNED_IN_AUTH,
  type FakeClient,
} from "@/lib/social/test-client";

// The dialog uses the default supabase client; point it at the fake.
const supabaseHolder = vi.hoisted(() => ({
  client: null as unknown,
}));
vi.mock("@/lib/supabase", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/supabase")>("@/lib/supabase");
  return {
    ...actual,
    get supabase() {
      return supabaseHolder.client;
    },
  };
});

function renderDialog(
  auth: AuthContextValue,
  fake: FakeClient,
  props: {
    defaultKind?: "bug" | "idea" | "other";
    crashId?: string | null;
  } = {},
) {
  supabaseHolder.client = fake.client;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <FeedbackDialog open onOpenChange={vi.fn()} {...props} />
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}

describe("FeedbackDialog", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows the mailto fallback when signed out", () => {
    renderDialog(GUEST_AUTH, createFakeClient());
    const emailLink = screen.getByRole("link", {
      name: /contact@ohkolab\.com/,
    });
    expect(emailLink).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:contact@ohkolab.com"),
    );
  });

  it("shows the form when signed in", () => {
    renderDialog(SIGNED_IN_AUTH, createFakeClient());
    expect(screen.getByText("Send feedback")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("validates the message length", async () => {
    const user = userEvent.setup();
    renderDialog(SIGNED_IN_AUTH, createFakeClient());
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "short");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(
      await screen.findByText(/at least 10 characters/),
    ).toBeInTheDocument();
  });

  it("sends feedback and shows a success toast", async () => {
    const fake = createFakeClient();
    const user = userEvent.setup();
    renderDialog(SIGNED_IN_AUTH, fake);
    await user.type(screen.getByRole("textbox"), "The damage calc is broken");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/feedback was sent/i)).toBeInTheDocument();
    expect(fake.records[0]?.table).toBe("feedback");
  });

  it("shows the rate-limit message when rate limited", async () => {
    const fake = createFakeClient({
      resolve: () => ({ data: null, error: { code: "P0A06" } }),
    });
    const user = userEvent.setup();
    renderDialog(SIGNED_IN_AUTH, fake);
    await user.type(screen.getByRole("textbox"), "The damage calc is broken");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(
      await screen.findByText(/try again in an hour/i),
    ).toBeInTheDocument();
  });
});
