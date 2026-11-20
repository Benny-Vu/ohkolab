import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { DemoTeamGrid } from "@/components/demo-team-grid";

describe("DemoTeamGrid", () => {
  it("renders sample teams with names, formats and example tags", () => {
    render(
      <Providers>
        <DemoTeamGrid />
      </Providers>,
    );

    expect(screen.getAllByText("Example")).toHaveLength(2);
    expect(screen.getByText("Rain ride")).toBeInTheDocument();
    expect(screen.getByText("Trick room core")).toBeInTheDocument();
    expect(screen.getByText("Doubles")).toBeInTheDocument();
    expect(screen.getByText("Singles")).toBeInTheDocument();
  });

  it("renders no links or buttons — nothing is clickable", () => {
    render(
      <Providers>
        <DemoTeamGrid />
      </Providers>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
