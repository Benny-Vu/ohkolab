import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { createDefaultSet } from "@/data";
import { CalcPage } from "@/features/calc/calc-page";

function renderCalc(state?: unknown) {
  const initialEntries =
    state === undefined ? ["/calc"] : [{ pathname: "/calc", state }];
  const router = createMemoryRouter(
    [{ path: "/calc", element: <CalcPage /> }],
    {
      initialEntries,
    },
  );
  return render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("CalcPage", () => {
  it("shows both sides' moves and the selected result", () => {
    renderCalc();
    expect(
      screen.getByRole("button", { name: /Earthquake/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Garchomp Earthquake/)).toBeInTheDocument();
    expect(screen.getByText("Garchomp moves first")).toBeInTheDocument();
  });

  it("updates the results when a set changes", async () => {
    const user = userEvent.setup();
    renderCalc();
    await user.click(screen.getByRole("tab", { name: "Pokémon 2" }));
    await user.click(screen.getByRole("combobox", { name: "Species" }));
    await user.type(
      screen.getByRole("combobox", { name: "Search Pokémon" }),
      "charizard",
    );
    await user.click(screen.getByText("Charizard"));
    const earthquake = screen.getByRole("button", { name: /Earthquake/ });
    expect(earthquake).toHaveTextContent("0%");
    expect(earthquake).toHaveTextContent("No effect");
    expect(screen.getByText("No moves")).toBeInTheDocument();
  });

  it("shows the full result of a clicked move", async () => {
    const user = userEvent.setup();
    renderCalc();
    await user.click(screen.getByRole("button", { name: /Dragon Claw/ }));
    expect(screen.getByText(/Garchomp Dragon Claw/)).toBeInTheDocument();
    expect(screen.getByText(/Damage:/)).toBeInTheDocument();
    expect(screen.getByText(/Rolls:/)).toBeInTheDocument();
    expect(screen.getByText(/Remaining HP:/)).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: /Dragon Claw/ }));
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText(/Garchomp Earthquake/)).toBeInTheDocument();
    await screen.findByText("Calculator reset");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText(/Garchomp Dragon Claw/)).toBeInTheDocument();
  });

  it("loads a handed-over set from the router state", () => {
    renderCalc({ attacker: createDefaultSet("Charizard") });
    expect(screen.getByRole("combobox", { name: "Species" })).toHaveTextContent(
      "Charizard",
    );
  });
});
