import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MessagesPage } from "@/features/messages/messages-page";
import { createFakeAuth, renderAt } from "@/features/messages/test-utils";
import {
  createFakeClient,
  type FakeClientConfig,
} from "@/lib/messages/test-client";

const ME = "user-1";
const OTHER = "user-2";

function listConfig(overrides: FakeClientConfig = {}): FakeClientConfig {
  return {
    resolve: (record) => {
      if (record.table === "conversation_participants") {
        return {
          data: [
            {
              conversation_id: "conv-1",
              user_id: ME,
              last_read_at: "2026-11-19T10:00:00+00:00",
              closed_at: null,
            },
          ],
          error: null,
        };
      }
      if (record.table === "conversations") {
        return {
          data: [
            {
              id: "conv-1",
              user_a: ME,
              user_b: OTHER,
              created_by: ME,
              created_at: "2026-11-18T10:00:00+00:00",
            },
          ],
          error: null,
        };
      }
      if (record.table === "profiles") {
        return {
          data: [
            {
              id: OTHER,
              username: "misty",
              display_name: "Misty",
              avatar_species: "Starmie",
            },
          ],
          error: null,
        };
      }
      if (record.table === "messages") {
        if (record.orFilters.length > 0) {
          return {
            data: [
              {
                id: "m1",
                conversation_id: "conv-1",
                sender_id: OTHER,
                body: "Are you ready?",
                created_at: "2026-11-19T10:30:00+00:00",
                deleted_at: null,
              },
            ],
            error: null,
          };
        }
        return {
          data: [
            {
              id: "m1",
              conversation_id: "conv-1",
              sender_id: OTHER,
              body: "Are you ready?",
              created_at: "2026-11-19T10:30:00+00:00",
              deleted_at: null,
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    },
    ...overrides,
  };
}

describe("MessagesPage with the flag off", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders no list and never touches the client", async () => {
    const fake = createFakeClient(listConfig());
    renderAt(<MessagesPage client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.records).toEqual([]);
    expect(fake.rpcCalls).toEqual([]);
  });
});

describe("MessagesPage with the flag on", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lists conversations with preview and unread marker", async () => {
    const fake = createFakeClient(listConfig());
    renderAt(<MessagesPage client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });

    const row = await screen.findByRole("link", { name: /misty/i });
    expect(row).toHaveAttribute("href", "/messages/conv-1");
    expect(screen.getByText("Misty")).toBeInTheDocument();
    expect(screen.getByText(/Are you ready\?/)).toBeInTheDocument();
    // The unread badge with its screen-reader label.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();
  });

  it("shows the empty state without conversations", async () => {
    const fake = createFakeClient({
      resolve: () => ({ data: [], error: null }),
    });
    renderAt(<MessagesPage client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });
    expect(
      await screen.findByText("No conversations yet."),
    ).toBeInTheDocument();
  });

  it("shows a deleted-message preview without its text", async () => {
    const fake = createFakeClient(
      listConfig({
        resolve: (record) => {
          if (record.table === "conversation_participants") {
            return {
              data: [
                {
                  conversation_id: "conv-1",
                  user_id: ME,
                  last_read_at: "2026-11-19T10:00:00+00:00",
                  closed_at: null,
                },
              ],
              error: null,
            };
          }
          if (record.table === "conversations") {
            return {
              data: [
                {
                  id: "conv-1",
                  user_a: ME,
                  user_b: OTHER,
                  created_by: ME,
                  created_at: "2026-11-18T10:00:00+00:00",
                },
              ],
              error: null,
            };
          }
          if (record.table === "profiles") {
            return {
              data: [
                {
                  id: OTHER,
                  username: "misty",
                  display_name: "Misty",
                  avatar_species: "Starmie",
                },
              ],
              error: null,
            };
          }
          if (record.table === "messages") {
            return {
              data: [
                {
                  id: "gone",
                  conversation_id: "conv-1",
                  sender_id: OTHER,
                  body: "Secret text",
                  created_at: "2026-11-19T10:30:00+00:00",
                  deleted_at: "2026-11-19T10:31:00+00:00",
                },
              ],
              error: null,
            };
          }
          return { data: [], error: null };
        },
      }),
    );
    renderAt(<MessagesPage client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });

    expect(await screen.findByText("Message deleted")).toBeInTheDocument();
    expect(screen.queryByText("Secret text")).not.toBeInTheDocument();
  });
});
