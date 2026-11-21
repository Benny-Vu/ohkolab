import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, GUEST_AUTH } from "@/lib/auth/use-auth";
import type { AuthContextValue } from "@/lib/auth/types";
import { setLocale } from "@/lib/i18n/locale";
import { indexFixture, snapshotFixture } from "@/lib/metagame/fixture";
import type { TopTeamMember, TopTeamsFile } from "@/lib/top-teams/types";
import { TopTeamsView } from "@/features/metagame/top-teams/top-teams-view";

/** A signed-in visitor, for the actions that need an account. */
const SIGNED_IN_AUTH = {
  ...GUEST_AUTH,
  isConfigured: true,
  user: { id: "user-1" },
} as unknown as AuthContextValue;

function member(
  species: string,
  item: string | null,
  ability: string,
  nature: string,
  tera: string | null,
  moves: string[],
): TopTeamMember {
  return { species, item, ability, nature, tera, moves };
}

/** Six members the doubles usage snapshot has spreads for. */
const CHAMPION_MEMBERS: TopTeamMember[] = [
  member("Sneasler", "Focus Sash", "Poison Touch", "Jolly", "Fighting", [
    "Close Combat",
    "Dire Claw",
    "Protect",
    "Swords Dance",
  ]),
  member("Rillaboom", "Focus Sash", "Grassy Surge", "Adamant", "Grass", [
    "Fake Out",
    "U-turn",
    "Protect",
    "Knock Off",
  ]),
  member("Incineroar", "Sitrus Berry", "Intimidate", "Careful", "Fire", [
    "Fake Out",
    "Knock Off",
    "Parting Shot",
    "Flare Blitz",
  ]),
  member("Kingambit", "Leftovers", "Supreme Overlord", "Adamant", "Dark", [
    "Swords Dance",
    "Knock Off",
    "Protect",
    "Close Combat",
  ]),
  member("Charizard-Mega-Y", "Charizardite Y", "Drought", "Timid", "Fire", [
    "Heat Wave",
    "Overheat",
    "Protect",
    "Fire Blast",
  ]),
  member("Archaludon", "Assault Vest", "Stamina", "Modest", "Dragon", [
    "Draco Meteor",
    "Snarl",
    "Protect",
    "Flash Cannon",
  ]),
];

function team(overrides: Partial<TopTeamsFile["teams"][number]>) {
  return {
    eventId: "naosaki-2026",
    event: "Naosaki Regionals",
    date: "2026-10-18",
    format: "M-C",
    players: 128,
    placing: 1,
    record: { wins: 6, losses: 0, ties: 0 },
    sourceUrl: "https://play.limitlesstcg.com/tournaments/naosaki-2026",
    members: CHAMPION_MEMBERS,
    ...overrides,
  };
}

/** Two events across two formats, three teams; matches the parse contract. */
const topTeamsFixture: TopTeamsFile = {
  generatedAt: "2026-11-18T06:00:00.000Z",
  source: "limitless",
  teams: [
    team({ placing: 1, record: { wins: 6, losses: 0, ties: 0 } }),
    team({
      placing: 2,
      record: { wins: 5, losses: 1, ties: 1 },
    }),
    team({
      eventId: "kanto-special-2026",
      event: "Kanto Special",
      date: "2026-09-06",
      format: "M-B",
      players: 64,
      record: { wins: 5, losses: 1, ties: 0 },
      sourceUrl: "https://play.limitlesstcg.com/tournaments/kanto-special-2026",
    }),
  ],
};

const fetchHandlers = new Map<string, unknown>();

function mockFetch() {
  vi.spyOn(globalThis, "fetch").mockImplementation((async (
    input: RequestInfo | URL,
  ) => {
    const path = typeof input === "string" ? input : input.toString();
    const data = fetchHandlers.get(path);
    if (data === undefined) {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch);
}

function stubClipboard(impl?: (text: string) => Promise<unknown>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: impl },
  });
}

function renderView(auth: AuthContextValue = GUEST_AUTH) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: "/", element: <TopTeamsView /> },
      { path: "/calc/battle", element: <div data-testid="battle-stub" /> },
      { path: "/teams/:teamId", element: <div data-testid="team-stub" /> },
    ],
    { initialEntries: ["/"] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <TooltipProvider delayDuration={200}>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return queryClient;
}

/** Opens the first Naosaki card's detail dialog. */
async function openFirstCard(user: ReturnType<typeof userEvent.setup>) {
  const cards = await screen.findAllByRole("button", {
    name: /Naosaki Regionals/,
  });
  const first = cards[0];
  if (!first) throw new Error("no team card found");
  await user.click(first);
  await screen.findByText("SP not published, common spread assumed.");
}

/** Waits until the doubles usage snapshot has landed (the sets borrow it). */
async function waitForUsage(queryClient: QueryClient) {
  await waitFor(() =>
    expect(
      queryClient.getQueryData([
        "metagame",
        "snapshot",
        "doubles",
        indexFixture.latest.doubles,
      ]),
    ).toBeTruthy(),
  );
}

beforeEach(() => {
  localStorage.clear();
  stubClipboard(vi.fn(async () => undefined));
  fetchHandlers.clear();
  fetchHandlers.set("/data/top-teams/teams.json", topTeamsFixture);
  fetchHandlers.set("/data/metagame/index.json", indexFixture);
  fetchHandlers.set("/data/metagame/2026-10/doubles.json", snapshotFixture);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TopTeamsView", () => {
  it("shows an error with retry when the file fails to load", async () => {
    const user = userEvent.setup();
    mockFetch();
    fetchHandlers.delete("/data/top-teams/teams.json");
    renderView();
    expect(
      await screen.findByText("Could not load the top teams."),
    ).toBeInTheDocument();
    fetchHandlers.set("/data/top-teams/teams.json", topTeamsFixture);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      (await screen.findAllByRole("button", { name: /Naosaki Regionals/ }))
        .length,
    ).toBeGreaterThan(0);
  });

  it("shows the empty state when the snapshot has no teams", async () => {
    mockFetch();
    fetchHandlers.set("/data/top-teams/teams.json", {
      ...topTeamsFixture,
      teams: [],
    });
    renderView();
    expect(
      await screen.findByText("No tournament teams in the snapshot yet."),
    ).toBeInTheDocument();
  });

  it("renders the cards in pages and grows on demand", async () => {
    const user = userEvent.setup();
    mockFetch();
    // Fifteen M-C teams: page one shows twelve, the button reveals the rest.
    fetchHandlers.set("/data/top-teams/teams.json", {
      ...topTeamsFixture,
      teams: Array.from({ length: 15 }, (_, index) =>
        team({ eventId: `bulk-${index}` }),
      ),
    });
    renderView();
    expect(
      await screen.findAllByRole("button", { name: /Naosaki Regionals/ }),
    ).toHaveLength(12);
    await user.click(screen.getByRole("button", { name: "Show more" }));
    expect(
      await screen.findAllByRole("button", { name: /Naosaki Regionals/ }),
    ).toHaveLength(15);
    // Everything visible: the button is gone.
    expect(
      screen.queryByRole("button", { name: "Show more" }),
    ).not.toBeInTheDocument();
  });

  it("renders the cards with event, placing, date, record and players", async () => {
    mockFetch();
    renderView();
    expect(
      await screen.findAllByRole("button", { name: /Naosaki Regionals/ }),
    ).toHaveLength(2);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("5W 1L 1T")).toBeInTheDocument();
    expect(screen.getByText("6W 0L")).toBeInTheDocument();
    expect(screen.getAllByText(/Oct 18, 2026/)).toHaveLength(2);
    expect(screen.getAllByText("128 players")).toHaveLength(2);
    // Two format chips plus the filter's own "M-C" button.
    expect(screen.getAllByText("M-C")).toHaveLength(3);
  });

  it("attributes Limitless once under the list", async () => {
    mockFetch();
    renderView();
    await screen.findAllByRole("button", { name: /Naosaki Regionals/ });
    expect(screen.getAllByText("Tournament data from Limitless.")).toHaveLength(
      1,
    );
  });

  it("defaults to the latest format and can switch or show all", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderView();
    await screen.findAllByRole("button", { name: /Naosaki Regionals/ });
    // Default: M-C only, so the M-B event is not listed yet.
    expect(screen.queryByText("Kanto Special")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(await screen.findByText("Kanto Special")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Naosaki/ })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "M-B" }));
    expect(await screen.findByText("Kanto Special")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Naosaki Regionals/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the detail dialog with members, tera, honesty line and source", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderView();
    await openFirstCard(user);
    expect(screen.getByText("Naosaki Regionals — #1")).toBeInTheDocument();
    // The per-member lines carry the published Tera type as a chip.
    expect(screen.getByText("Fighting")).toBeInTheDocument();
    expect(
      screen.getByText("Close Combat / Dire Claw / Protect / Swords Dance"),
    ).toBeInTheDocument();
    const source = screen.getByRole("link", { name: "View on Limitless" });
    expect(source).toHaveAttribute(
      "href",
      "https://play.limitlesstcg.com/tournaments/naosaki-2026",
    );
    expect(source).toHaveAttribute("target", "_blank");
  });

  it("hides the save action for a guest", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderView();
    await openFirstCard(user);
    expect(
      screen.queryByRole("button", { name: "Save to my teams" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send to battle mode" }),
    ).toBeInTheDocument();
  });

  it("copies the Showdown paste with the borrowed SP spread", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async (text: string) => text);
    stubClipboard(writeText);
    mockFetch();
    const queryClient = renderView();
    await openFirstCard(user);
    await waitForUsage(queryClient);
    await user.click(
      screen.getByRole("button", { name: "Copy as Showdown paste" }),
    );
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const paste = writeText.mock.calls[0]?.[0] ?? "";
    // The member's own lines: item, ability, nature, moves.
    expect(paste).toContain("Sneasler @ Focus Sash");
    expect(paste).toContain("Ability: Poison Touch");
    expect(paste).toContain("Jolly Nature");
    expect(paste).toContain("- Close Combat");
    // The SP the sheet does not publish, borrowed from the usage data.
    expect(paste).toContain("EVs: 24 Atk / 32 Spe");
    expect(
      await screen.findByText(/Team copied as a Showdown paste/),
    ).toBeInTheDocument();
  });

  it("saves the team for a signed-in user and opens it", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderView(SIGNED_IN_AUTH);
    await openFirstCard(user);
    await user.click(screen.getByRole("button", { name: "Save to my teams" }));
    expect(await screen.findByTestId("team-stub")).toBeInTheDocument();
    expect((await screen.findAllByText("Team saved.")).length).toBeGreaterThan(
      0,
    );
    const stored = JSON.parse(
      localStorage.getItem("ohkolab:teams") ?? '{"teams":[]}',
    ) as { teams: { name?: string; format?: string }[] };
    expect(stored.teams).toHaveLength(1);
    expect(stored.teams[0]?.name).toBe("Naosaki Regionals #1");
    expect(stored.teams[0]?.format).toBe("doubles");
  });

  it("sends the team to battle mode by saving it first", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderView();
    await openFirstCard(user);
    await user.click(
      screen.getByRole("button", { name: "Send to battle mode" }),
    );
    expect(await screen.findByTestId("battle-stub")).toBeInTheDocument();
    const stored = JSON.parse(
      localStorage.getItem("ohkolab:teams") ?? '{"teams":[]}',
    ) as { teams: { name?: string }[] };
    expect(stored.teams).toHaveLength(1);
    expect(stored.teams[0]?.name).toBe("Naosaki Regionals #1");
  });

  it("renders in Japanese", async () => {
    mockFetch();
    setLocale("ja");
    try {
      renderView();
      expect(
        await screen.findByText("大会データはLimitless提供。"),
      ).toBeInTheDocument();
      expect(await screen.findByText("#1位")).toBeInTheDocument();
      // The card meta lines localize too.
      expect(await screen.findAllByText("128人参加")).toHaveLength(2);
    } finally {
      setLocale("en");
    }
  });
});
