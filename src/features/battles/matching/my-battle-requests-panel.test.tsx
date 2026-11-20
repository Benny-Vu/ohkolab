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
import type { BattleRequestRow } from "@/lib/database.types";
import { MyBattleRequestsPanel } from "@/features/battles/matching/my-battle-requests-panel";

// The panel's strings live in the battles domain, which the test setup does
// not preload (only the routes do in production).
registerEnglishDomain("battles", battlesEn);

/**
 * The author's panel against a fake client: offers render per request, the
 * accept flow's two outcomes toast differently, decline and the open/close
 * control write through, and matched requests show the banner.
 */

const NOW = "2026-11-22T10:00:00Z";

function requestRow(
  partial: Partial<BattleRequestRow> & { id: string },
): BattleRequestRow {
  return {
    author_id: "user-1",
    format: "doubles",
    rules: "Reg M-C, best of 3",
    note: null,
    starts_at: null,
    ends_at: null,
    timezone: null,
    language: "en",
    team_id: null,
    status: "open",
    accepted_reply_id: null,
    played_at: null,
    created_at: NOW,
    updated_at: NOW,
    ...partial,
  } as BattleRequestRow;
}

const OPEN_REQUEST = requestRow({ id: "req-1" });

const PENDING_REPLY = {
  id: "reply-1",
  request_id: "req-1",
  responder_id: "user-2",
  status: "pending",
  created_at: NOW,
};

const DECLINED_REPLY = {
  id: "reply-2",
  request_id: "req-1",
  responder_id: "user-3",
  status: "declined",
  created_at: NOW,
};

const RESPONDER_PROFILE = {
  id: "user-2",
  username: "rika",
  display_name: "Rika",
  avatar_species: "Garchomp",
};

interface ResolveOptions {
  requests?: BattleRequestRow[];
  replies?: unknown[];
  profiles?: unknown[];
}

/** A resolver with the panel's tables pre-filled. */
function resolveWith({
  requests = [OPEN_REQUEST],
  replies = [PENDING_REPLY],
  profiles = [RESPONDER_PROFILE],
}: ResolveOptions = {}) {
  return (record: ChainRecord) => {
    if (record.table === "battle_requests") {
      return { data: requests, error: null };
    }
    if (record.table === "battle_replies") {
      const requestId = record.eqFilters.find(
        ([column]) => column === "request_id",
      )?.[1];
      return {
        data: replies.filter(
          (reply) => (reply as { request_id: string }).request_id === requestId,
        ),
        error: null,
      };
    }
    if (record.table === "profiles") {
      return { data: profiles, error: null };
    }
    return { data: [], error: null };
  };
}

function renderPanel(fake: FakeClient) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={SIGNED_IN_AUTH}>
        <QueryClientProvider client={createQueryClient()}>
          <MyBattleRequestsPanel client={fake.client} />
        </QueryClientProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("MyBattleRequestsPanel", () => {
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

  it("shows the empty state when the author has no requests", async () => {
    const fake = createFakeClient({
      resolve: resolveWith({ requests: [], replies: [] }),
    });
    renderPanel(fake);

    expect(
      await screen.findByText("No battle requests yet. Create one."),
    ).toBeVisible();
  });

  it("lists a request's offers with accept and decline", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    renderPanel(fake);

    expect(await screen.findByText("Rika")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Accept Rika's offer" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Decline Rika's offer" }),
    ).toBeVisible();
  });

  it("says so when an open request has no offers", async () => {
    const fake = createFakeClient({
      resolve: resolveWith({ replies: [] }),
    });
    renderPanel(fake);

    expect(await screen.findByText("No offers yet.")).toBeVisible();
  });

  it("marks older offers as declined without action buttons", async () => {
    const fake = createFakeClient({
      resolve: resolveWith({
        replies: [PENDING_REPLY, DECLINED_REPLY],
        profiles: [
          RESPONDER_PROFILE,
          {
            id: "user-3",
            username: "kenta",
            display_name: "Kenta",
            avatar_species: null,
          },
        ],
      }),
    });
    renderPanel(fake);

    expect(await screen.findByText("Kenta")).toBeVisible();
    expect(screen.getByText("Declined")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Decline Kenta's offer" }),
    ).toBeNull();
  });

  it("toasts and links to the conversation when the DM thread opened", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const fake = createFakeClient({
      resolve: resolveWith(),
      rpc: { accept_battle_reply: { data: "conv-1", error: null } },
    });
    renderPanel(fake);

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: "Accept Rika's offer" }),
      );

    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        "Offer accepted. The conversation is in Messages.",
        expect.objectContaining({
          action: expect.objectContaining({
            label: "Open the conversation",
          }),
        }),
      ),
    );
  });

  it("toasts the code-exchange fallback when no thread could open", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const fake = createFakeClient({
      resolve: resolveWith(),
      rpc: { accept_battle_reply: { data: null, error: null } },
    });
    renderPanel(fake);

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: "Accept Rika's offer" }),
      );

    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        "Offer accepted. Share the Room ID in the request.",
      ),
    );
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("falls back to the code exchange when DMs are off", async () => {
    const fake = createFakeClient({
      resolve: resolveWith(),
      rpc: { accept_battle_reply: { data: "conv-1", error: null } },
    });
    renderPanel(fake);

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: "Accept Rika's offer" }),
      );

    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        "Offer accepted. Share the Room ID in the request.",
      ),
    );
  });

  it("declines an offer through the data layer", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    renderPanel(fake);

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: "Decline Rika's offer" }),
      );

    await waitFor(() => {
      const update = fake.records.find(
        (record) =>
          record.table === "battle_replies" && record.updateValues !== null,
      );
      expect(update?.updateValues).toEqual({ status: "declined" });
      expect(update?.eqFilters).toContainEqual(["id", "reply-1"]);
    });
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Offer declined."),
    );
  });

  it("closes an open request and reopens a closed one", async () => {
    const fake = createFakeClient({
      resolve: resolveWith({
        requests: [
          OPEN_REQUEST,
          requestRow({ id: "req-2", status: "closed", rules: "Reg G" }),
        ],
        replies: [],
      }),
    });
    renderPanel(fake);

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Close request" }));
    await waitFor(() => {
      const update = fake.records.find(
        (record) =>
          record.table === "battle_requests" && record.updateValues !== null,
      );
      expect(update?.updateValues).toEqual({ status: "closed" });
      expect(update?.eqFilters).toContainEqual(["id", "req-1"]);
    });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Reopen request" }));
    await waitFor(() => {
      const update = fake.records
        .filter(
          (record) =>
            record.table === "battle_requests" &&
            record.updateValues?.status === "open",
        )
        .at(-1);
      expect(update?.eqFilters).toContainEqual(["id", "req-2"]);
    });
  });

  it("shows the matched banner for a matched request", async () => {
    const fake = createFakeClient({
      resolve: resolveWith({
        requests: [
          requestRow({
            id: "req-1",
            status: "matched",
            accepted_reply_id: "reply-1",
          }),
        ],
        replies: [{ ...PENDING_REPLY, status: "accepted" }],
      }),
    });
    renderPanel(fake);

    expect(await screen.findByText("Matched with Rika")).toBeVisible();
  });
});
