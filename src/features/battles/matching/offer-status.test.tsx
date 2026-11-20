import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { battlesEn } from "@/lib/i18n/entries/battles";
import { setLocale } from "@/lib/i18n/locale";
import { AuthContext } from "@/lib/auth/use-auth";
import {
  createFakeClient,
  createQueryClient,
  SIGNED_IN_AUTH,
  type ChainRecord,
  type FakeClient,
} from "@/lib/social/test-client";
import { OfferStatus } from "@/features/battles/matching/offer-status";

// The component's strings live in the battles domain, which the test setup
// does not preload (only the routes do in production).
registerEnglishDomain("battles", battlesEn);

/**
 * The responder's own offer state: pending with a withdraw control, accepted
 * with the Room ID and the message thread, and the settled states.
 */

const NOW = "2026-11-22T10:00:00Z";

function myReply(status: string) {
  return {
    id: "reply-1",
    request_id: "req-1",
    responder_id: "user-1",
    status,
    created_at: NOW,
  };
}

function resolveWith({
  replies = [myReply("pending")],
  code = null as string | null,
}: { replies?: unknown[]; code?: string | null } = {}) {
  return (record: ChainRecord) => {
    if (record.table === "battle_replies") {
      return { data: replies, error: null };
    }
    if (record.table === "battle_request_codes") {
      return {
        data: code === null ? null : { request_id: "req-1", code },
        error: null,
      };
    }
    return { data: [], error: null };
  };
}

function renderStatus(fake: FakeClient) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={SIGNED_IN_AUTH}>
        <QueryClientProvider client={createQueryClient()}>
          <OfferStatus requestId="req-1" client={fake.client} />
        </QueryClientProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("OfferStatus", () => {
  let success: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("VITE_BATTLES", "true");
    setLocale("en");
    success = vi.spyOn(toast, "success");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("renders nothing while the viewer has not offered", async () => {
    const fake = createFakeClient({ resolve: resolveWith({ replies: [] }) });
    const view = renderStatus(fake);

    await waitFor(() => expect(view.container.querySelector("div")).toBeNull());
  });

  it("shows a pending offer with a withdraw control", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    renderStatus(fake);

    expect(await screen.findByText("Offer pending")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Withdraw offer" }),
    ).toBeVisible();
  });

  it("withdraws the offer through the data layer", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    renderStatus(fake);

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Withdraw offer" }));

    await waitFor(() => {
      const update = fake.records.find(
        (record) =>
          record.table === "battle_replies" && record.updateValues !== null,
      );
      expect(update?.updateValues).toEqual({ status: "withdrawn" });
      expect(update?.eqFilters).toContainEqual(["id", "reply-1"]);
    });
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Offer withdrawn."),
    );
  });

  it("shows the accepted state with the Room ID and the thread", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const fake = createFakeClient({
      resolve: resolveWith({
        replies: [myReply("accepted")],
        code: "ROOM-1234",
      }),
    });
    renderStatus(fake);

    expect(await screen.findByText("Offer accepted")).toBeVisible();
    // The code read starts only once the offer is known to be accepted.
    expect(await screen.findByText("ROOM-1234")).toBeVisible();
    expect(screen.getByRole("link", { name: "Open messages" })).toHaveAttribute(
      "href",
      "/messages",
    );
    expect(screen.queryByRole("button", { name: "Withdraw offer" })).toBeNull();
  });

  it("shows the declined state", async () => {
    const fake = createFakeClient({
      resolve: resolveWith({ replies: [myReply("declined")] }),
    });
    renderStatus(fake);

    expect(await screen.findByText("Offer declined")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Withdraw offer" })).toBeNull();
  });

  it("shows the withdrawn state", async () => {
    const fake = createFakeClient({
      resolve: resolveWith({ replies: [myReply("withdrawn")] }),
    });
    renderStatus(fake);

    expect(await screen.findByText("Offer withdrawn")).toBeVisible();
  });
});
