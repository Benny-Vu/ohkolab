import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { createDefaultSet } from "@/data";
import { CalcPage } from "@/features/calc/calc-page";
import { setLocale } from "@/lib/i18n/locale";

const DIRECTION_ARROW = "\u2192";

function renderCalc(state?: unknown) {
  const initialEntries =
    state === undefined ? ["/calc"] : [{ pathname: "/calc", state }];
  const router = createMemoryRouter(
    [{ path: "/calc", element: <CalcPage /> }],
    { initialEntries },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

async function openResults(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Earthquake/ }));
  const dialog = await screen.findByRole("dialog");
  return within(dialog);
}

describe("CalcPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows both sides' moves and the selected result", async () => {
    const user = userEvent.setup();
    renderCalc();

    const dialog = await openResults(user);

    expect(dialog.getByText("Earthquake")).toBeInTheDocument();
    expect(
      dialog.getByRole("button", { name: /Dragon Claw/ }),
    ).toBeInTheDocument();
    expect(dialog.getByText(/Garchomp Earthquake/)).toBeInTheDocument();
    expect(dialog.getByText("Garchomp moves first")).toBeInTheDocument();

    await user.click(
      dialog.getByRole("tab", {
        name: `Incineroar ${DIRECTION_ARROW} Garchomp`,
      }),
    );

    expect(dialog.getByText("Flare Blitz")).toBeInTheDocument();
  });

  it("updates the results when a set changes", async () => {
    const user = userEvent.setup();
    renderCalc();

    await user.click(screen.getByRole("radio", { name: "Defender" }));
    await user.click(screen.getByRole("combobox", { name: "Species" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search Pok\u00e9mon" }),
      "charizard",
    );
    await user.click(screen.getByText("Charizard"));

    const bar = screen.getByRole("button", { name: /Earthquake/ });
    expect(bar).toHaveTextContent("0%");
    expect(bar).toHaveTextContent("No effect");

    const dialog = await openResults(user);
    await user.click(
      dialog.getByRole("tab", {
        name: `Charizard ${DIRECTION_ARROW} Garchomp`,
      }),
    );

    expect(dialog.getByText("No moves")).toBeInTheDocument();
  });

  it("shows the full result of a clicked move", async () => {
    const user = userEvent.setup();
    renderCalc();

    const dialog = await openResults(user);
    await user.click(dialog.getByRole("button", { name: /Dragon Claw/ }));

    expect(dialog.getByText(/Garchomp Dragon Claw/)).toBeInTheDocument();
    expect(dialog.getByText(/Damage:/)).toBeInTheDocument();
    expect(dialog.getByText(/Rolls:/)).toBeInTheDocument();
    expect(dialog.getByText(/Remaining HP:/)).toBeInTheDocument();
  });

  it("swaps the two sides", async () => {
    const user = userEvent.setup();
    renderCalc();

    await user.click(screen.getByRole("button", { name: "Swap sides" }));

    expect(screen.getByRole("combobox", { name: "Species" })).toHaveTextContent(
      "Incineroar",
    );
  });

  it("resets and undoes through the toast", async () => {
    const user = userEvent.setup();
    renderCalc();

    const dialog = await openResults(user);
    await user.click(dialog.getByRole("button", { name: /Dragon Claw/ }));
    await user.click(dialog.getByRole("button", { name: "Close" }));

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(
      screen.getByRole("button", { name: /Earthquake/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Calculator reset")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(
      screen.getByRole("button", { name: /Dragon Claw/ }),
    ).toBeInTheDocument();
  });

  it("loads a handed-over set from the router state", () => {
    renderCalc({ attacker: createDefaultSet("Charizard") });

    expect(screen.getByRole("combobox", { name: "Species" })).toHaveTextContent(
      "Charizard",
    );
  });

  it("shows the selected move's result in the sticky bar", () => {
    renderCalc();

    const bar = screen.getByRole("button", { name: /Earthquake/ });

    expect(bar).toHaveTextContent("Earthquake");
    expect(bar).toHaveTextContent("%");
  });

  it("shortens the KO label in the sticky bar but not in the results", async () => {
    const user = userEvent.setup();
    renderCalc();

    const bar = screen.getByRole("button", { name: /Earthquake/ });
    expect(bar).toHaveTextContent("2HKO");
    expect(bar).not.toHaveTextContent("GUARANTEED");

    const dialog = await openResults(user);
    expect(dialog.getByText("GUARANTEED 2HKO")).toBeInTheDocument();
  });

  it("flips the speed verdict under Trick Room", async () => {
    const user = userEvent.setup();
    renderCalc();

    const dialog = await openResults(user);
    expect(dialog.getByText("Garchomp moves first")).toBeInTheDocument();

    await user.click(dialog.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("radio", { name: "Field" }));
    await user.click(screen.getByRole("button", { name: "More conditions" }));
    await user.click(screen.getByRole("switch", { name: "Trick Room" }));

    const reopened = await openResults(user);
    expect(reopened.getByText("Incineroar moves first")).toBeInTheDocument();
    expect(reopened.getByText("Trick Room")).toBeInTheDocument();
  });

  it("renders full move names without truncation", async () => {
    const user = userEvent.setup();
    renderCalc();

    const dialog = await openResults(user);

    expect(dialog.getByText("Earthquake")).toBeInTheDocument();
    expect(dialog.getByText("Dragon Claw")).toBeInTheDocument();
    expect(dialog.getByText("Rock Slide")).toBeInTheDocument();
    expect(dialog.getByText("Protect")).toBeInTheDocument();
  });

  it("replaces every native select with the shared picker", async () => {
    const user = userEvent.setup();
    renderCalc();

    expect(document.querySelector("select")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Field" }));

    expect(document.querySelector("select")).toBeNull();

    await openResults(user);

    expect(document.querySelector("select")).toBeNull();
  });
});

describe("CalcPage in Japanese", () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale("ja");
  });

  afterEach(() => {
    setLocale("en");
  });

  it("renders the page frame and section labels in Japanese", () => {
    renderCalc();

    expect(
      screen.getByRole("heading", { name: "ダメージ計算" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "攻撃側" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "防御側" })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "フィールド" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "リセット" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "攻守入れ替え" }),
    ).toBeInTheDocument();
  });

  it("renders the field panel in Japanese", async () => {
    const user = userEvent.setup();
    renderCalc();

    await user.click(screen.getByRole("radio", { name: "フィールド" }));

    expect(
      screen.getByRole("heading", { name: "フィールド" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "シングル" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "ダブル" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "天候" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "フィールド" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "その他の条件" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ダブル専用")).toBeInTheDocument();

    // The condition names come from the Japanese roster, not the dictionary.
    expect((await screen.findAllByText("リフレクター")).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("まきびし").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "その他の条件" }));
    expect(await screen.findByText("じゅうりょく")).toBeInTheDocument();
    expect(screen.getByText("トリックルーム")).toBeInTheDocument();
  });

  it("renders the matchup, moves and type badges with Japanese names", async () => {
    const user = userEvent.setup();
    renderCalc();

    // The chips switch to the Japanese species names once the chunk loads.
    expect((await screen.findAllByText("ガブリアス")).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("ガオガエン").length).toBeGreaterThan(0);
    expect(screen.queryByText("Garchomp")).not.toBeInTheDocument();
    expect(screen.queryByText("Incineroar")).not.toBeInTheDocument();

    // The sticky bar names the selected move in Japanese.
    const bar = await screen.findByRole("button", { name: /じしん/ });
    expect(bar).toHaveTextContent("じしん");

    await user.click(bar);
    const dialog = await screen.findByRole("dialog");
    const results = within(dialog);

    // Move names and type badges render in Japanese in the results.
    expect(results.getByText("じしん")).toBeInTheDocument();
    expect(results.getByText("ドラゴンクロー")).toBeInTheDocument();
    expect(results.getByText("じめん")).toBeInTheDocument();
    expect(results.getByText("ドラゴン")).toBeInTheDocument();
  });

  it("renders the speed verdict and its modifier words in Japanese", async () => {
    const user = userEvent.setup();
    renderCalc();

    const dialog = await openResults(user);
    expect(dialog.getByText("Garchompが先に動きます")).toBeInTheDocument();

    await user.click(dialog.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("radio", { name: "フィールド" }));
    await user.click(screen.getByRole("switch", { name: "攻撃側 Tailwind" }));
    await user.click(screen.getByRole("button", { name: "その他の条件" }));
    await user.click(screen.getByRole("switch", { name: "Trick Room" }));

    const reopened = await openResults(user);
    expect(reopened.getByText(/Garchomp 338 \(おいかぜ\)/)).toBeInTheDocument();
    expect(reopened.getByText("Incineroarが先に動きます")).toBeInTheDocument();
    expect(reopened.getByText("トリックルーム")).toBeInTheDocument();
  });
});
