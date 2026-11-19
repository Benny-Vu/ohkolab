import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { TelemetrySwitch } from "@/features/feedback/telemetry-switch";

const CONSENT_KEY = "ohkolab:telemetry";

describe("TelemetrySwitch", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("explains what the switch covers", () => {
    render(<TelemetrySwitch />);
    expect(
      screen.getByText(/share anonymous usage statistics and crash reports/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/turn this off at any time/i)).toBeInTheDocument();
  });

  it("is on by default and turns off in storage when clicked", async () => {
    const user = userEvent.setup();
    render(<TelemetrySwitch />);
    const control = screen.getByRole("switch");
    expect(control).toHaveAttribute("aria-checked", "true");
    await user.click(control);
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem(CONSENT_KEY)).toBe("off");
    await user.click(control);
    expect(control).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(CONSENT_KEY)).toBe("on");
  });

  it("reflects an existing opt-out from storage", () => {
    localStorage.setItem(CONSENT_KEY, "off");
    render(<TelemetrySwitch />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });
});
