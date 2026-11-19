import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MessageSettingsCard } from "@/features/messages/message-settings-card";
import { createFakeAuth, renderAt } from "@/features/messages/test-utils";
import { createFakeClient } from "@/lib/messages/test-client";

const ME = "user-1";

function settingsClient(who: string) {
  return createFakeClient({
    resolve: (record) => {
      if (record.table === "message_settings") {
        return record.isMaybeSingle
          ? {
              data: { user_id: ME, who_can_message: who, updated_at: "x" },
              error: null,
            }
          : { data: [], error: null };
      }
      return { data: [], error: null };
    },
  });
}

describe("MessageSettingsCard with the flag off", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders nothing and never touches the client", async () => {
    const fake = settingsClient("friends");
    renderAt(<MessageSettingsCard client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.records).toEqual([]);
    expect(screen.queryByText("Who can message me")).not.toBeInTheDocument();
  });
});

describe("MessageSettingsCard with the flag on", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows the current setting", async () => {
    const fake = settingsClient("friends");
    renderAt(<MessageSettingsCard client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });
    // The card title renders at once; the select shows the current value
    // once the settings row arrives.
    expect(await screen.findAllByText("Who can message me")).not.toHaveLength(
      0,
    );
    expect(
      await screen.findByText("Friends (mutual follows)"),
    ).toBeInTheDocument();
  });

  it("updates the setting on the server when the select changes", async () => {
    const fake = settingsClient("friends");
    renderAt(<MessageSettingsCard client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("combobox", { name: "Who can message me" }),
    );
    await user.click(await screen.findByRole("option", { name: "Nobody" }));
    await waitFor(() => {
      const update = fake.records.find(
        (record) => record.table === "message_settings" && record.updateValues,
      );
      expect(update).toBeDefined();
      expect(update!.updateValues).toEqual({ who_can_message: "nobody" });
      expect(update!.eqFilters).toEqual([["user_id", ME]]);
    });
    expect(
      await screen.findByText("Your messaging setting was saved."),
    ).toBeInTheDocument();
  });
});
