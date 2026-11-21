import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  indexFixture,
  singlesSnapshotFixture,
  snapshotFixture,
} from "@/lib/metagame/fixture";
import { setLocale } from "@/lib/i18n/locale";
import { setBattleFormat } from "@/lib/preferences";
import { MetagamePage } from "@/features/metagame/metagame-page";

function CalcStub() {
  const location = useLocation();
  const state = location.state as { attacker?: { species: string } } | null;
  return (
    <div data-testid="calc-stub">{state?.attacker?.species ?? "no set"}</div>
  );
}

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

function renderMetagame() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: "/meta", element: <MetagamePage /> },
      { path: "/calc", element: <CalcStub /> },
      { path: "/teams/:teamId", element: <div data-testid="team-stub" /> },
    ],
    { initialEntries: ["/meta"] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  setBattleFormat("doubles");
  fetchHandlers.clear();
  fetchHandlers.set("/data/metagame/index.json", indexFixture);
  fetchHandlers.set("/data/metagame/2026-10/doubles.json", snapshotFixture);
  fetchHandlers.set(
    "/data/metagame/2026-09/doubles.json",
    singlesSnapshotFixture("doubles"),
  );
  fetchHandlers.set(
    "/data/metagame/2026-09/singles.json",
    singlesSnapshotFixture("singles"),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MetagamePage", () => {
  it("shows skeletons while loading", async () => {
    mockFetch();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => undefined),
    );
    renderMetagame();
    // The skeleton waits out the anti-flash delay before it appears.
    expect(
      await screen.findByRole("status", { name: "Loading metagame data" }),
    ).toBeVisible();
    expect(document.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("shows an error with retry when the index fails to load", async () => {
    const user = userEvent.setup();
    mockFetch();
    fetchHandlers.delete("/data/metagame/index.json");
    renderMetagame();
    expect(
      await screen.findByText("Could not load metagame data"),
    ).toBeInTheDocument();
    fetchHandlers.set("/data/metagame/index.json", indexFixture);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/rating 1630\+/)).toBeInTheDocument();
  });

  it("shows an error with retry when the snapshot fails to load", async () => {
    const user = userEvent.setup();
    mockFetch();
    fetchHandlers.delete("/data/metagame/2026-10/doubles.json");
    renderMetagame();
    expect(
      await screen.findByText("Could not load metagame data"),
    ).toBeInTheDocument();
    fetchHandlers.set("/data/metagame/2026-10/doubles.json", snapshotFixture);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/rating 1630\+/)).toBeInTheDocument();
  });

  it("shows an empty state when the format has no snapshots", async () => {
    mockFetch();
    fetchHandlers.set("/data/metagame/index.json", {
      ...indexFixture,
      latest: {},
      snapshots: indexFixture.snapshots.filter(
        (snapshot) => snapshot.format === "doubles",
      ),
    });
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Singles" }));
    expect(
      await screen.findByText("No data for this format yet"),
    ).toBeInTheDocument();
  });

  it("renders the ranking table with shares and attribution", async () => {
    mockFetch();
    renderMetagame();
    expect(await screen.findByText(/rating 1630\+/)).toBeInTheDocument();
    expect(screen.getByText(/1,649,648 battles/)).toBeInTheDocument();
    expect(screen.getByText("41.2%")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sneasler/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Rillaboom/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Archaludon/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Speed tiers")).toBeInTheDocument();
  });

  it("keeps the usage share readable on phones by hiding the bar", async () => {
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    const row = screen.getByRole("button", { name: /Sneasler/ }).closest("tr");
    expect(row).not.toBeNull();
    expect(row?.cells[0]).toHaveTextContent("1");
    expect(row).toHaveTextContent("Sneasler");
    expect(row).toHaveTextContent("41.2%");
    expect(row?.querySelector("span[role='img']")).toHaveAttribute(
      "aria-label",
      "Sneasler",
    );
    expect(row?.querySelector("div[role='img']")).toHaveClass(
      "hidden",
      "sm:block",
    );
  });

  it("opens a detail dialog with moves, items and spreads", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    await user.click(screen.getByRole("button", { name: /Sneasler/ }));
    expect(
      await screen.findByText("Rank #1 · 41.2% usage"),
    ).toBeInTheDocument();
    expect(screen.getByText("Close Combat")).toBeInTheDocument();
    expect(screen.getByText("Focus Sash")).toBeInTheDocument();
    expect(screen.getByText("Poison Touch")).toBeInTheDocument();
    expect(screen.getAllByText("Rillaboom").length).toBeGreaterThan(0);
    expect(screen.getByText(/HP 0 \/ Atk 24 \/ Def 0/)).toBeInTheDocument();
  });

  it("hands a set over to the calculator", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    await user.click(screen.getByRole("button", { name: /Sneasler/ }));
    await user.click(screen.getByRole("button", { name: "Open in calc" }));
    await waitFor(() => {
      expect(screen.getByTestId("calc-stub")).toHaveTextContent("Sneasler");
    });
  });

  it("switches months through the select", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    await user.click(screen.getByRole("combobox", { name: "Month" }));
    await user.click(screen.getByRole("option", { name: /September 2026/ }));
    expect(await screen.findByText(/87,848 battles/)).toBeInTheDocument();
  });

  it("switches to the singles snapshot through the format toggle", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    await user.click(screen.getByRole("radio", { name: "Singles" }));
    expect(await screen.findByText(/87,848 battles/)).toBeInTheDocument();
    expect(screen.getAllByText("September 2026").length).toBeGreaterThan(0);
  });

  it("shows the source line once", async () => {
    mockFetch();
    const full =
      "Pokémon Showdown ladder, October 2026, rating 1630+, via smogon.com/stats";
    fetchHandlers.set("/data/metagame/2026-10/doubles.json", {
      ...snapshotFixture,
      source: { ...snapshotFixture.source, label: full },
    });
    renderMetagame();
    expect(await screen.findAllByText(full)).toHaveLength(1);
  });

  it("marks the active format choice", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    expect(screen.getByRole("radio", { name: "Doubles" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Singles" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await user.click(screen.getByRole("radio", { name: "Singles" }));
    await screen.findByText(/87,848 battles/);
    expect(screen.getByRole("radio", { name: "Singles" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Doubles" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("sorts the ranking table by name", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    await user.click(screen.getByRole("button", { name: "Pokémon" }));
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Archaludon");
  });

  it("filters the ranking table by search", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    await user.type(screen.getByLabelText("Search Pokémon"), "sneas");
    expect(
      screen.getByRole("button", { name: /Sneasler/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Archaludon/ }),
    ).not.toBeInTheDocument();
  });

  it("adds a usage set to a new team", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);
    await user.click(screen.getByRole("button", { name: /Sneasler/ }));
    await user.click(screen.getByRole("button", { name: "Add to a team" }));
    expect(await screen.findByTestId("team-stub")).toBeInTheDocument();
  });

  it("switches between the usage and top-teams views", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/rating 1630\+/);

    const tabs = screen.getByRole("tablist", { name: "Metagame" });
    expect(
      within(tabs).getByRole("tab", { name: "Usage", selected: true }),
    ).toBeInTheDocument();

    // The month picker belongs to the usage view only.
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    await user.click(within(tabs).getByRole("tab", { name: "Top teams" }));
    expect(
      within(tabs).getByRole("tab", { name: "Top teams", selected: true }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    // The top-teams view replaces the ranking.
    expect(screen.queryByText("Usage ranking")).not.toBeInTheDocument();

    await user.click(within(tabs).getByRole("tab", { name: "Usage" }));
    expect(await screen.findByText("Usage ranking")).toBeInTheDocument();
  });
});

describe("MetagamePage in Japanese", () => {
  beforeEach(() => {
    setLocale("ja");
  });

  afterEach(() => {
    setLocale("en");
  });

  it("renders the page frame and ranking labels in Japanese", async () => {
    mockFetch();
    renderMetagame();

    expect(await screen.findByText(/1,649,648バトル/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "環境" })).toBeInTheDocument();
    expect(screen.getByText("使用率ランキング")).toBeInTheDocument();
    expect(screen.getByText("レギュレーション")).toBeInTheDocument();
    expect(screen.getByText(/レーティング1630以上/)).toBeInTheDocument();
    expect(await screen.findByText("素早さライン")).toBeInTheDocument();
  });

  it("renders the Pokémon detail dialog in Japanese", async () => {
    const user = userEvent.setup();
    mockFetch();
    renderMetagame();
    await screen.findByText(/1,649,648バトル/);

    // The ranking rows switch to the Japanese species names once the
    // roster's Japanese names finish loading.
    const sneasler = await screen.findByRole("button", {
      name: /オオニューラ/,
    });
    await user.click(sneasler);

    expect(await screen.findByText("順位#1 · 使用率41.2%")).toBeInTheDocument();
    expect(screen.getByText("技")).toBeInTheDocument();
    expect(screen.getByText("もちもの")).toBeInTheDocument();
    expect(screen.getByText("特性")).toBeInTheDocument();
    expect(screen.getByText("同時選出")).toBeInTheDocument();
    expect(screen.getByText("ステータス配分")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "計算機で開く" }),
    ).toBeInTheDocument();

    // Moves, items, abilities, teammates and natures come from the roster.
    expect(screen.getByText("インファイト")).toBeInTheDocument();
    expect(screen.getByText("きあいのタスキ")).toBeInTheDocument();
    expect(screen.getByText("どくしゅ")).toBeInTheDocument();
    expect(screen.getAllByText("ゴリランダー").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ようき").length).toBeGreaterThan(0);
    expect(screen.queryByText("Close Combat")).not.toBeInTheDocument();
  });
});
