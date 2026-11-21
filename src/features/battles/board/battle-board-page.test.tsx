import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BattleBoardPage } from "@/features/battles/board/battle-board-page";
import { renderBoardPage } from "@/features/battles/board/test-utils";
import { GUEST_AUTH } from "@/lib/auth/use-auth";
import {
  createFakeClient,
  SIGNED_IN_AUTH,
  type ChainRecord,
  type FakeClientConfig,
  type FakeResult,
} from "@/lib/social/test-client";
import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { battlesEn } from "@/lib/i18n/entries/battles";
import { setLocale } from "@/lib/i18n/locale";
import type { BattleRequestRow } from "@/lib/database.types";

/**
 * The battle board page against a fake client: the list and its filters, the
 * create form's validation and payload, the offer and report flows, the
 * signed-out view with recording mode, and one Japanese-mode render. The
 * setup file registers the community and tools domains (the report strings
 * and the team preview label); the battles domain is registered here.
 */

registerEnglishDomain("battles", battlesEn);

const REQUEST_DOUBLES: BattleRequestRow = {
  id: "req-1",
  author_id: "author-1",
  format: "doubles",
  rules: "Reg M-C, best of 3",
  note: "Bring your A team.",
  starts_at: null,
  ends_at: null,
  timezone: null,
  language: "en",
  team_id: "team-1",
  status: "open",
  accepted_reply_id: null,
  played_at: null,
  created_at: "2026-11-20T10:00:00Z",
  updated_at: "2026-11-20T10:00:00Z",
};

const REQUEST_SINGLES: BattleRequestRow = {
  ...REQUEST_DOUBLES,
  id: "req-2",
  author_id: "author-2",
  format: "singles",
  rules: "Ladder prep",
  note: null,
  team_id: null,
  language: "ja",
  starts_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
};

/**
 * The page runs several battle_requests reads through the same fake (the
 * board, "my requests", "my matches"), separated only by their `.eq()`
 * filters — so the fake honours the filters the way Postgres would.
 */
function filterRows(
  rows: BattleRequestRow[],
  record: ChainRecord,
): BattleRequestRow[] {
  return rows.filter((row) =>
    record.eqFilters.every(
      ([column, value]) => row[column as keyof BattleRequestRow] === value,
    ),
  );
}

/** Resolves each table the board touches with its fixture rows. */
function boardConfig(overrides: FakeClientConfig = {}): FakeClientConfig {
  return {
    resolve: (record): FakeResult => {
      if (record.table === "battle_requests") {
        if (record.insertValues !== null) {
          return { data: [{ id: "new-1" }], error: null };
        }
        return {
          data: filterRows([REQUEST_DOUBLES, REQUEST_SINGLES], record),
          error: null,
        };
      }
      if (record.table === "profiles") {
        return {
          data: [
            {
              id: "author-1",
              username: "rika",
              display_name: "Rika",
              avatar_species: "Garchomp",
            },
            {
              id: "author-2",
              username: "kenta",
              display_name: "Kenta",
              avatar_species: null,
            },
          ],
          error: null,
        };
      }
      if (record.table === "teams") {
        return {
          data: [
            {
              id: "team-1",
              name: "Rain team",
              format: "doubles",
              is_public: true,
              data: [],
              game_team_id: null,
            },
          ],
          error: null,
        };
      }
      if (record.table === "battle_replies") {
        return { data: [], error: null };
      }
      return { data: [], error: null };
    },
    ...overrides,
  };
}

function renderBoard(config: FakeClientConfig = boardConfig()) {
  const fake = createFakeClient(config);
  renderBoardPage(<BattleBoardPage client={fake.client} />, SIGNED_IN_AUTH);
  return fake;
}

describe("BattleBoardPage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_BATTLES", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lists requests with author, badges, rules, note and team", async () => {
    renderBoard();

    expect(
      await screen.findByRole("heading", { name: "Battles" }),
    ).toBeInTheDocument();
    // The list lands when the board query resolves.
    await screen.findByText("Reg M-C, best of 3");
    // The whole name block (display name + handle) is the link.
    const author = screen.getByRole("link", { name: /Rika/ });
    expect(author).toHaveTextContent("@rika");
    expect(author).toHaveAttribute("href", "/u/rika");
    expect(screen.getByText("Reg M-C, best of 3")).toBeInTheDocument();
    expect(screen.getByText("Bring your A team.")).toBeInTheDocument();
    expect(screen.getByText("Rain team")).toBeInTheDocument();
    expect(screen.getAllByText("Doubles").length).toBeGreaterThan(0);
    expect(screen.getByText("Ladder prep")).toBeInTheDocument();
  });

  it("filters the list by format and language", async () => {
    const user = userEvent.setup();
    renderBoard();
    await screen.findByText("Reg M-C, best of 3");
    expect(screen.getByText("Ladder prep")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Singles" }));

    await waitFor(() => {
      expect(screen.getByText("Ladder prep")).toBeInTheDocument();
      expect(screen.queryByText("Reg M-C, best of 3")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("radio", { name: "English" }));

    await waitFor(() => {
      expect(screen.queryByText("Ladder prep")).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(/no battle requests match these filters/i),
    ).toBeInTheDocument();

    await user.click(
      within(
        screen.getByRole("radiogroup", { name: "Format filter" }),
      ).getByRole("radio", { name: "All" }),
    );
    await user.click(
      within(
        screen.getByRole("radiogroup", { name: "Language filter" }),
      ).getByRole("radio", { name: "All" }),
    );
    await screen.findByText("Ladder prep");
  });

  it("offers to battle on someone else's request", async () => {
    const fake = renderBoard();
    const user = userEvent.setup();

    const offers = await screen.findAllByRole("button", {
      name: "Offer to battle",
    });
    expect(offers).toHaveLength(2);
    await user.click(offers[0]!);

    await waitFor(() => {
      const insert = fake.records.find(
        (record) =>
          record.table === "battle_replies" && record.insertValues !== null,
      );
      expect(insert?.insertValues).toEqual([
        { request_id: "req-1", responder_id: "user-1" },
      ]);
    });
  });

  it("maps the duplicate offer error to a friendly toast", async () => {
    renderBoard({
      resolve: (record): FakeResult => {
        if (record.table === "battle_replies" && record.insertValues !== null) {
          return {
            data: null,
            error: {
              message:
                'duplicate key value violates unique constraint "battle_replies_request_id_responder_id_key"',
            },
          };
        }
        return boardConfig().resolve!(record);
      },
    });
    const user = userEvent.setup();

    await user.click(
      (await screen.findAllByRole("button", { name: "Offer to battle" }))[0]!,
    );

    expect(
      await screen.findByText("You already offered on this request."),
    ).toBeInTheDocument();
  });

  it("hides the offer button and report menu on the author's own request", async () => {
    const fake = createFakeClient(
      boardConfig({
        resolve: (record): FakeResult => {
          if (record.table === "battle_requests") {
            return {
              data: filterRows(
                [{ ...REQUEST_DOUBLES, author_id: "user-1" }, REQUEST_SINGLES],
                record,
              ),
              error: null,
            };
          }
          return boardConfig().resolve!(record);
        },
      }),
    );
    renderBoardPage(<BattleBoardPage client={fake.client} />, SIGNED_IN_AUTH);

    // The viewer's own request also appears in the "My battle requests"
    // panel, so the rules text shows twice: once on the board, once there.
    await waitFor(() =>
      expect(screen.getAllByText("Reg M-C, best of 3")).toHaveLength(2),
    );
    // Only the other author's card keeps its offer button.
    expect(
      screen.getAllByRole("button", { name: "Offer to battle" }),
    ).toHaveLength(1);
  });

  it("files a report through the overflow menu dialog", async () => {
    const fake = renderBoard();
    const user = userEvent.setup();

    await user.click(
      (await screen.findAllByRole("button", { name: "Report" }))[0]!,
    );
    await user.click(await screen.findByRole("menuitem", { name: "Report" }));

    await user.click(screen.getByRole("combobox", { name: /reason/i }));
    await user.click(await screen.findByRole("option", { name: "Spam" }));
    await user.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() => {
      const insert = fake.records.find(
        (record) => record.table === "reports" && record.insertValues !== null,
      );
      expect(insert?.insertValues).toEqual([
        {
          reporter_id: "user-1",
          target_type: "battle_request",
          target_id: "req-1",
          reason: "spam",
        },
      ]);
    });
  });

  it("validates the create form and posts the request", async () => {
    const fake = renderBoard();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /new battle request/i }),
    );

    // Rules are required: submitting empty shows the field error, no insert.
    await user.click(screen.getByRole("button", { name: /post request/i }));
    expect(
      screen.getByText("Write the rules for this match."),
    ).toBeInTheDocument();
    expect(
      fake.records.filter((record) => record.insertValues !== null),
    ).toEqual([]);

    // The window order is validated too.
    fireEvent.change(screen.getByLabelText("Starts"), {
      target: { value: "2026-11-22T15:00" },
    });
    fireEvent.change(screen.getByLabelText("Ends"), {
      target: { value: "2026-11-22T14:00" },
    });
    await user.type(screen.getByLabelText("Rules"), "Reg M-C");
    await user.click(screen.getByRole("button", { name: /post request/i }));
    expect(
      screen.getByText("The end time must come after the start time."),
    ).toBeInTheDocument();

    // A clean window posts: format defaults from the app preference
    // (doubles), the language from the site locale, the time zone from the
    // browser, and the signed-in user is attached by the mutation.
    fireEvent.change(screen.getByLabelText("Ends"), {
      target: { value: "2026-11-22T16:00" },
    });
    await user.click(screen.getByRole("button", { name: /post request/i }));

    await waitFor(() => {
      const insert = fake.records.find(
        (record) =>
          record.table === "battle_requests" && record.insertValues !== null,
      );
      expect(insert?.insertValues).toEqual([
        {
          format: "doubles",
          rules: "Reg M-C",
          note: null,
          starts_at: new Date("2026-11-22T15:00").toISOString(),
          ends_at: new Date("2026-11-22T16:00").toISOString(),
          timezone: expect.any(String),
          language: "en",
          team_id: null,
          author_id: "user-1",
        },
      ]);
    });
  });

  it("shows the sign-in card, and the demo list in recording mode", async () => {
    renderBoardPage(
      <BattleBoardPage client={createFakeClient(boardConfig()).client} />,
      GUEST_AUTH,
    );

    const signIn = screen.getByRole("link", { name: /sign in/i });
    expect(signIn).toHaveAttribute("href", "/login?returnTo=/battles");
    // No sample content without demo mode.
    expect(screen.queryByText("@rikachu")).not.toBeInTheDocument();

    window.sessionStorage.setItem("ohkolab:demo", "1");
    renderBoardPage(
      <BattleBoardPage client={createFakeClient(boardConfig()).client} />,
      GUEST_AUTH,
    );

    expect(screen.getAllByText("Example")).toHaveLength(3);
    expect(screen.getByText("@rikachu")).toBeInTheDocument();
    expect(screen.getByText("Reg M-C, best of 3")).toBeInTheDocument();
    // Render-only: the sample cards carry no offer buttons.
    expect(
      screen.queryByRole("button", { name: "Offer to battle" }),
    ).not.toBeInTheDocument();
  });

  it("renders in Japanese", async () => {
    setLocale("ja");
    try {
      renderBoardPage(
        <BattleBoardPage client={createFakeClient(boardConfig()).client} />,
        SIGNED_IN_AUTH,
      );

      expect(
        await screen.findByRole("heading", { name: "対戦" }),
      ).toBeInTheDocument();
      await screen.findByText("Reg M-C, best of 3");
      expect(screen.getAllByText("ダブル").length).toBeGreaterThan(0);
      expect(
        (await screen.findAllByRole("button", { name: "対戦を申し込む" }))
          .length,
      ).toBeGreaterThan(0);
      // The time window is labelled as the viewer's own clock.
      expect(screen.getByText(/（あなたの時間）$/)).toBeInTheDocument();
    } finally {
      setLocale("en");
    }
  });
});
