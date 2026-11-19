import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThreadPage } from "@/features/messages/thread-page";
import { createFakeAuth, renderAt } from "@/features/messages/test-utils";
import {
  createFakeClient,
  type FakeClientConfig,
} from "@/lib/messages/test-client";

const ME = "user-1";
const OTHER = "user-2";

const CONVERSATION = {
  id: "conv-1",
  user_a: ME,
  user_b: OTHER,
  created_by: ME,
  created_at: "2026-11-18T10:00:00+00:00",
};

const MY_PARTICIPATION = {
  conversation_id: "conv-1",
  user_id: ME,
  last_read_at: "2026-11-19T10:00:00+00:00",
  closed_at: null,
};

const OTHER_PROFILE = {
  id: OTHER,
  username: "misty",
  display_name: "Misty",
  avatar_species: "Starmie",
};

const THREAD = [
  {
    id: "m1",
    conversation_id: "conv-1",
    sender_id: OTHER,
    body: "Hello there",
    created_at: "2026-11-19T10:30:00+00:00",
    deleted_at: null,
  },
  {
    id: "m2",
    conversation_id: "conv-1",
    sender_id: ME,
    body: "General Kenobi",
    created_at: "2026-11-19T10:31:00+00:00",
    deleted_at: null,
  },
];

interface ThreadOverrides {
  /** What a messages insert resolves with. */
  insertResult?: { data?: unknown; error?: unknown };
  participant?: typeof MY_PARTICIPATION | null;
}

function threadConfig(overrides: ThreadOverrides = {}): FakeClientConfig {
  const insertResult =
    overrides.insertResult ??
    ({
      data: {
        id: "m-new",
        conversation_id: "conv-1",
        sender_id: ME,
        body: "",
        created_at: "2026-11-19T11:00:00+00:00",
        deleted_at: null,
      },
      error: null,
    } as { data?: unknown; error?: unknown });
  return {
    resolve: (record) => {
      if (record.table === "conversations") {
        return { data: CONVERSATION, error: null };
      }
      if (record.table === "conversation_participants") {
        if (record.isMaybeSingle) {
          return {
            data:
              overrides.participant === undefined
                ? MY_PARTICIPATION
                : overrides.participant,
            error: null,
          };
        }
        return { data: [MY_PARTICIPATION], error: null };
      }
      if (record.table === "profiles") {
        return { data: OTHER_PROFILE, error: null };
      }
      if (record.table === "messages") {
        if (record.insertValues) {
          const value = record.insertValues[0] as Record<string, unknown>;
          if (insertResult.error) {
            return { data: null, error: insertResult.error };
          }
          return {
            data: {
              id: "m-new",
              conversation_id: value.conversation_id,
              sender_id: value.sender_id,
              body: value.body,
              created_at: "2026-11-19T11:00:00+00:00",
              deleted_at: null,
            },
            error: null,
          };
        }
        return { data: THREAD, error: null };
      }
      return { data: [], error: null };
    },
    rpc: {
      report_message: { data: "report-1", error: null },
    },
  };
}

function renderThread(config: FakeClientConfig) {
  const fake = createFakeClient(config);
  renderAt(<ThreadPage client={fake.client} />, createFakeAuth(), {
    path: "/messages/:id",
    initialEntries: ["/messages/conv-1"],
  });
  return fake;
}

describe("ThreadPage with the flag off", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders nothing live and never touches the client", async () => {
    const fake = createFakeClient(threadConfig());
    renderAt(<ThreadPage client={fake.client} />, createFakeAuth(), {
      path: "/messages/:id",
      initialEntries: ["/messages/conv-1"],
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.records).toEqual([]);
    expect(fake.rpcCalls).toEqual([]);
    expect(fake.channels).toEqual([]);
  });
});

describe("ThreadPage with the flag on", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the thread, marking my own and the other's messages", async () => {
    renderThread(threadConfig());
    expect(await screen.findByText("Hello there")).toBeInTheDocument();
    expect(screen.getByText("General Kenobi")).toBeInTheDocument();
    // The report button exists only on the other player's message.
    expect(
      screen.getByRole("button", { name: "Report this message" }),
    ).toBeInTheDocument();
  });

  it("hides soft-deleted messages", async () => {
    const config = threadConfig();
    config.resolve = (record) => {
      if (record.table === "messages" && !record.insertValues) {
        return {
          data: [
            ...THREAD,
            {
              id: "gone",
              conversation_id: "conv-1",
              sender_id: OTHER,
              body: "Secret",
              created_at: "2026-11-19T10:32:00+00:00",
              deleted_at: "2026-11-19T10:33:00+00:00",
            },
          ],
          error: null,
        };
      }
      return threadConfig().resolve!(record);
    };
    renderThread(config);
    expect(await screen.findByText("Hello there")).toBeInTheDocument();
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("marks the conversation read when the other player's message is unread", async () => {
    const fake = renderThread(threadConfig());
    await screen.findByText("Hello there");
    await waitFor(() => {
      const update = fake.records.find(
        (record) =>
          record.table === "conversation_participants" && record.updateValues,
      );
      expect(update).toBeDefined();
      expect(update!.updateValues!.last_read_at).toBeDefined();
    });
  });

  it("sends a message through the composer and clears it", async () => {
    const user = userEvent.setup();
    const fake = renderThread(threadConfig());
    const composer = await screen.findByRole("textbox", {
      name: "Write a message",
    });
    await user.type(composer, "A new message");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => {
      const insert = fake.records.find((record) => record.insertValues);
      expect(insert).toBeDefined();
      expect(insert!.insertValues![0]).toMatchObject({
        conversation_id: "conv-1",
        sender_id: ME,
        body: "A new message",
      });
    });
    await waitFor(() => {
      expect(
        (
          screen.getByRole("textbox", {
            name: "Write a message",
          }) as HTMLInputElement
        ).value,
      ).toBe("");
    });
  });

  it("shows the neutral closed notice on a rule failure, without the composer", async () => {
    const user = userEvent.setup();
    renderThread(
      threadConfig({
        insertResult: { data: null, error: { code: "42501", message: "no" } },
      }),
    );
    const composer = await screen.findByRole("textbox", {
      name: "Write a message",
    });
    await user.type(composer, "Hello?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    // The notice appears as the page state (and again in the toast).
    await waitFor(async () => {
      expect(
        await screen.findAllByText("This conversation is no longer available."),
      ).not.toHaveLength(0);
    });
    expect(
      screen.queryByRole("textbox", { name: "Write a message" }),
    ).not.toBeInTheDocument();
  });

  it("shows the friendly rate-limit message on P0A09", async () => {
    const user = userEvent.setup();
    renderThread(
      threadConfig({
        insertResult: { data: null, error: { code: "P0A09", message: "fast" } },
      }),
    );
    const composer = await screen.findByRole("textbox", {
      name: "Write a message",
    });
    await user.type(composer, "Spam");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(
      await screen.findByText(
        "You are posting too quickly. Wait a few minutes and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the unavailable notice for a conversation I cannot see", async () => {
    const config = threadConfig();
    config.resolve = (record) => {
      if (record.table === "conversations") {
        return { data: null, error: null };
      }
      return threadConfig().resolve!(record);
    };
    renderThread(config);
    expect(
      await screen.findByText("This conversation is no longer available."),
    ).toBeInTheDocument();
  });

  it("reports a message with a reason through the RPC", async () => {
    const user = userEvent.setup();
    const fake = renderThread(threadConfig());
    await screen.findByText("Hello there");
    await user.click(
      screen.getByRole("button", { name: "Report this message" }),
    );
    // The dialog's title is "Report {target}" with the message label.
    expect(await screen.findByText("Report message")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Report reason" }));
    await user.click(await screen.findByRole("option", { name: "Spam" }));
    await user.click(screen.getByRole("button", { name: "Submit report" }));
    await waitFor(() => {
      expect(fake.rpcCalls).toContainEqual({
        fn: "report_message",
        args: { message_id: "m1", reason: "spam" },
      });
    });
  });
});
