import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PractiseNowButton } from "@/features/battles/board/practise-now-button";
import { renderBoardPage } from "@/features/battles/board/test-utils";
import {
  createFakeClient,
  SIGNED_IN_AUTH,
  type FakeClientConfig,
  type FakeResult,
} from "@/lib/social/test-client";
import { registerEnglishDomain } from "@/lib/i18n/en-loader";
import { battlesEn } from "@/lib/i18n/entries/battles";

/**
 * The one-tap "Practise now" flow: the confirm step, the payload it posts
 * (a one-hour window around the moment of the tap, in the user's current
 * format, with the localized casual rules), the success toast, and the
 * friendly cap error.
 */

registerEnglishDomain("battles", battlesEn);

const PRACTISE_WINDOW_MS = 60 * 60 * 1000;

/** A fake that accepts inserts and answers nothing else. */
function practiseConfig(
  insert: FakeResult = { data: [{ id: "new-1" }], error: null },
): FakeClientConfig {
  return {
    resolve: (record): FakeResult => {
      if (record.table === "battle_requests" && record.insertValues !== null) {
        return insert;
      }
      return { data: [], error: null };
    },
  };
}

describe("PractiseNowButton", () => {
  it("confirms, posts a one-hour practise request and toasts", async () => {
    const fake = createFakeClient(practiseConfig());
    renderBoardPage(<PractiseNowButton client={fake.client} />, SIGNED_IN_AUTH);
    const user = userEvent.setup();
    const beforeTap = Date.now();

    // The confirm step: nothing is posted from the tap alone.
    await user.click(screen.getByRole("button", { name: "Practise now" }));
    expect(
      screen.getByRole("heading", { name: "Post a practise request?" }),
    ).toBeInTheDocument();
    expect(
      fake.records.filter((record) => record.insertValues !== null),
    ).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Post request" }));

    await waitFor(() => {
      const insert = fake.records.find(
        (record) =>
          record.table === "battle_requests" && record.insertValues !== null,
      );
      expect(insert?.insertValues).toEqual([
        {
          format: "doubles", // the app preference's default
          rules: "Casual · now",
          note: null,
          starts_at: expect.any(String),
          ends_at: expect.any(String),
          timezone: expect.any(String),
          language: "en",
          team_id: null,
          author_id: "user-1",
        },
      ]);
      const [posted] = insert!.insertValues as Array<
        | {
            starts_at: string;
            ends_at: string;
          }
        | undefined
      >;
      const starts = new Date(posted!.starts_at).getTime();
      const ends = new Date(posted!.ends_at).getTime();
      // The window opens at the tap and runs exactly one hour.
      expect(starts).toBeGreaterThanOrEqual(beforeTap);
      expect(starts).toBeLessThanOrEqual(Date.now());
      expect(ends - starts).toBe(PRACTISE_WINDOW_MS);
    });

    expect(await screen.findByText("Battle request posted.")).toBeVisible();
  });

  it("maps the open-request cap to the friendly toast", async () => {
    const fake = createFakeClient(
      practiseConfig({
        data: null,
        error: { message: "Too many open battle requests" },
      }),
    );
    renderBoardPage(<PractiseNowButton client={fake.client} />, SIGNED_IN_AUTH);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Practise now" }));
    await user.click(screen.getByRole("button", { name: "Post request" }));

    expect(
      await screen.findByText(
        "Too many open battle requests. Close one first, or wait for a match.",
      ),
    ).toBeVisible();
  });
});
