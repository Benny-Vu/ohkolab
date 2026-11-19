import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Providers } from "@/app/providers";
import { TeamIdChip } from "@/components/team-id-chip";

function stubClipboard(impl?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: impl },
  });
}

function renderChip(props: { id: string; compact?: boolean }) {
  render(
    <Providers>
      <TeamIdChip {...props} />
    </Providers>,
  );
}

describe("TeamIdChip", () => {
  afterEach(() => {
    stubClipboard(undefined as unknown as (text: string) => Promise<void>);
  });

  it("shows the label and the ID in mono with a copy button", () => {
    stubClipboard(vi.fn(async () => undefined));
    renderChip({ id: "AbCd123456" });
    expect(screen.getByText("Team ID")).toBeInTheDocument();
    expect(screen.getByText("AbCd123456")).toBeInTheDocument();
  });

  it("copies the ID and confirms with a toast", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    stubClipboard(writeText);
    renderChip({ id: "AbCd123456" });

    await user.click(screen.getByRole("button", { name: "Copy team ID" }));

    expect(writeText).toHaveBeenCalledWith("AbCd123456");
    expect(await screen.findByText("Team ID copied")).toBeInTheDocument();
  });

  it("hides the label in compact mode", () => {
    stubClipboard(vi.fn(async () => undefined));
    renderChip({ id: "AbCd123456", compact: true });
    expect(screen.queryByText("Team ID")).not.toBeInTheDocument();
    expect(screen.getByText("AbCd123456")).toBeInTheDocument();
  });
});
