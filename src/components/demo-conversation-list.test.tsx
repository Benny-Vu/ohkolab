import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { battlesEn } from "@/lib/i18n/entries/battles";
import { setLocale } from "@/lib/i18n/locale";
import { isDemoMode } from "@/lib/demo-mode";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";
import { Providers } from "@/app/providers";
import { DemoConversationList } from "@/components/demo-conversation-list";
import { MessagesPage } from "@/features/messages/messages-page";

// The sample strings live in the battles domain, which the test setup does
// not preload (the component loads it in production, tests register it).
registerEnglishDomain("battles", battlesEn);

/** The demo wiring test lives here (not next to the messages page) because
 * the messages feature belongs to another stream; this file owns the list.
 */
function renderGuest(node: ReactNode) {
  return render(
    <Providers>
      <AuthContext.Provider value={GUEST_AUTH}>{node}</AuthContext.Provider>
    </Providers>,
  );
}

describe("DemoConversationList", () => {
  beforeEach(() => {
    setLocale("en");
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    window.sessionStorage.setItem("ohkolab:demo", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.sessionStorage.clear();
  });

  it("renders sample conversations, each marked as an example", () => {
    renderGuest(<DemoConversationList />);

    expect(screen.getAllByText("Example")).toHaveLength(3);
    expect(screen.getByText("Rika")).toBeVisible();
    expect(
      screen.getByText("Room ID is 4821. Ready when you are."),
    ).toBeVisible();
    expect(screen.getByText("Kenta")).toBeVisible();
    expect(screen.getByText("Mio")).toBeVisible();
  });

  it("renders no buttons or links", () => {
    renderGuest(<DemoConversationList />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders Japanese sample content in the ja locale", () => {
    setLocale("ja");
    renderGuest(<DemoConversationList />);

    expect(screen.getByText("リカ")).toBeVisible();
    expect(
      screen.getByText("ルームIDは4821です。いつでもどうぞ。"),
    ).toBeVisible();
  });

  it("shows in place of the sign-in state on the messages page in demo mode", () => {
    expect(isDemoMode()).toBe(true);
    renderGuest(<MessagesPage />);

    expect(screen.getByText("Rika")).toBeVisible();
    expect(screen.queryByText("Sign in to see your messages.")).toBeNull();
  });

  it("keeps the sign-in state on the messages page outside demo mode", () => {
    window.sessionStorage.removeItem("ohkolab:demo");
    expect(isDemoMode()).toBe(false);
    renderGuest(<MessagesPage />);

    expect(screen.getByText("Sign in to see your messages.")).toBeVisible();
    expect(screen.queryByText("Rika")).toBeNull();
  });
});
