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
import type { BattleRequestSummary } from "@/lib/battles/logic";
import { MatchedBanner } from "@/features/battles/matching/matched-banner";

// The banner's strings live in the battles domain, which the test setup
// does not preload (only the routes do in production).
registerEnglishDomain("battles", battlesEn);

/**
 * The matched banner against a fake client: the pair renders, the author
 * saves the Room ID, both hints show, and the played state replaces the
 * toggle once played_at is set.
 */

const NOW = "2026-11-22T10:00:00Z";

function matchedRequest(
  partial: Partial<BattleRequestRow> = {},
): BattleRequestRow {
  return {
    id: "req-1",
    author_id: "user-1",
    format: "doubles",
    rules: "Reg M-C, best of 3",
    note: null,
    starts_at: null,
    ends_at: null,
    timezone: null,
    language: "en",
    team_id: null,
    status: "matched",
    accepted_reply_id: "reply-1",
    played_at: null,
    created_at: NOW,
    updated_at: NOW,
    ...partial,
  } as BattleRequestRow;
}

const ACCEPTED_REPLY = {
  id: "reply-1",
  request_id: "req-1",
  responder_id: "user-2",
  status: "accepted",
  created_at: NOW,
};

const RESPONDER_PROFILE = {
  id: "user-2",
  username: "rika",
  display_name: "Rika",
  avatar_species: "Garchomp",
};

function resolveWith({
  code = "ROOM-1234" as string | null,
}: { code?: string | null } = {}) {
  return (record: ChainRecord) => {
    if (record.table === "battle_replies") {
      return { data: [ACCEPTED_REPLY], error: null };
    }
    if (record.table === "profiles") {
      return { data: [RESPONDER_PROFILE], error: null };
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

function summaryOf(request: BattleRequestRow): BattleRequestSummary {
  return { request, author: null, team: null };
}

function renderBanner(fake: FakeClient, request: BattleRequestRow) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={SIGNED_IN_AUTH}>
        <QueryClientProvider client={createQueryClient()}>
          <MatchedBanner summary={summaryOf(request)} client={fake.client} />
        </QueryClientProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe("MatchedBanner", () => {
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

  it("shows the matched pair and the saved code", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    renderBanner(fake, matchedRequest());

    expect(await screen.findByText("Matched with Rika")).toBeVisible();
    expect(screen.getByLabelText("Room ID")).toHaveValue("ROOM-1234");
    expect(screen.getByText("Visible only to the two of you.")).toBeVisible();
    expect(
      screen.getByText(
        "If no message thread could open, share the Room ID here.",
      ),
    ).toBeVisible();
  });

  it("shows an empty code field while none is saved", async () => {
    const fake = createFakeClient({
      resolve: resolveWith({ code: null }),
    });
    renderBanner(fake, matchedRequest());

    const field = await screen.findByLabelText("Room ID");
    // Wait for the reads to settle before asserting the code stayed empty.
    await screen.findByText("Matched with Rika");
    expect(field).toHaveValue("");
    expect(field).toHaveAttribute("placeholder", "Room ID or Trainer ID");
  });

  it("saves the code the author types", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    renderBanner(fake, matchedRequest());

    // Wait for the saved code to land before replacing it, so the clear is
    // not swallowed by the initial empty render.
    const field = await screen.findByLabelText("Room ID");
    await waitFor(() => expect(field).toHaveValue("ROOM-1234"));
    await userEvent.clear(field);
    await userEvent.type(field, "7411");
    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const upsert = fake.records.find(
        (record) => record.upsertValues !== null,
      );
      expect(upsert?.table).toBe("battle_request_codes");
      expect(upsert?.upsertValues).toEqual([
        { request_id: "req-1", code: "7411" },
      ]);
      expect(upsert?.upsertOnConflict).toBe("request_id");
    });
    await waitFor(() => expect(success).toHaveBeenCalledWith("Room ID saved."));
  });

  it("marks the battle played through the RPC", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    renderBanner(fake, matchedRequest());

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Mark as played" }));

    await waitFor(() => {
      expect(fake.rpcCalls).toContainEqual({
        fn: "mark_battle_played",
        args: { request_id: "req-1" },
      });
    });
  });

  it("shows the author's opponent when the responder views it", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    // The signed-in viewer (user-1) is the accepted responder; the author
    // is someone else, so the banner must name the author, not the viewer.
    const request = matchedRequest({ author_id: "user-2" });
    const summary: BattleRequestSummary = {
      request,
      author: {
        id: "user-2",
        username: "kenta",
        display_name: "Kenta",
        avatar_species: null,
      },
      team: null,
    };
    render(
      <MemoryRouter>
        <AuthContext.Provider value={SIGNED_IN_AUTH}>
          <QueryClientProvider client={createQueryClient()}>
            <MatchedBanner summary={summary} client={fake.client} />
          </QueryClientProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Matched with Kenta")).toBeVisible();
  });

  it("shows the played line instead of the toggle once played", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    renderBanner(fake, matchedRequest({ played_at: "2026-11-22T12:00:00Z" }));

    expect(await screen.findByText("Played")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Mark as played" })).toBeNull();
  });

  it("links to the message thread while DMs are enabled", async () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const fake = createFakeClient({ resolve: resolveWith() });
    renderBanner(fake, matchedRequest());

    expect(
      await screen.findByRole("link", { name: "Open messages" }),
    ).toHaveAttribute("href", "/messages");
  });

  it("hides the message link while DMs are off", async () => {
    const fake = createFakeClient({ resolve: resolveWith() });
    renderBanner(fake, matchedRequest());

    await screen.findByText("Matched with Rika");
    expect(screen.queryByRole("link", { name: "Open messages" })).toBeNull();
  });

  it("renders in Japanese", async () => {
    setLocale("ja");
    const fake = createFakeClient({ resolve: resolveWith() });
    renderBanner(fake, matchedRequest());

    expect(await screen.findByText("Rikaとマッチしました")).toBeVisible();
    expect(screen.getByText("マッチ済み")).toBeVisible();
    expect(screen.getByText("対戦済みにする")).toBeVisible();
    expect(screen.getByText("二人だけが見られます。")).toBeVisible();
  });
});
