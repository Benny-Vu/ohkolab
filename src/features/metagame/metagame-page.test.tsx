import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  indexFixture,
  singlesSnapshotFixture,
  snapshotFixture,
} from "@/lib/metagame/fixture";
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
  it("shows skeletons while loading", () => {
    mockFetch();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => undefined),
    );
    renderMetagame();
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
    await user.click(screen.getByRole("button", { name: "Singles" }));
    expect(
      await screen.findByText("No data for this format yet."),
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
    await user.click(screen.getByRole("button", { name: "Use this set" }));
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
    await user.click(screen.getByRole("button", { name: "Singles" }));
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
    expect(screen.getByRole("button", { name: "Doubles" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Singles" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await user.click(screen.getByRole("button", { name: "Singles" }));
    await screen.findByText(/87,848 battles/);
    expect(screen.getByRole("button", { name: "Singles" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Doubles" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
