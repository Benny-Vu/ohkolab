import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MessagesNavBadge } from "@/features/messages/nav-unread-badge";
import { createFakeAuth, renderAt } from "@/features/messages/test-utils";
import { createFakeClient } from "@/lib/messages/test-client";
import type { AuthContextValue } from "@/lib/auth/types";

const ME = "user-1";

function badgeClient(unreadCount: number) {
  const unreadRows = Array.from({ length: unreadCount }, (_, index) => ({
    id: `m${index}`,
    conversation_id: "conv-1",
    sender_id: "user-2",
    body: "Hello",
    created_at: "2026-11-19T10:30:00+00:00",
    deleted_at: null,
  }));
  return createFakeClient({
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
      if (record.table === "messages" && record.orFilters.length > 0) {
        return { data: unreadRows, error: null };
      }
      return { data: [], error: null };
    },
  });
}

describe("MessagesNavBadge with the flag off", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders nothing and never touches the client", async () => {
    const fake = badgeClient(3);
    renderAt(<MessagesNavBadge client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fake.records).toEqual([]);
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("renders nothing for a guest", () => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
    const fake = badgeClient(3);
    const guest = {
      ...createFakeAuth(),
      user: null,
      session: null,
      profile: null,
    } as unknown as AuthContextValue;
    renderAt(<MessagesNavBadge client={fake.client} />, guest, {
      path: "/messages",
    });
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });
});

describe("MessagesNavBadge with the flag on", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows the unread count with its screen-reader label", async () => {
    const fake = badgeClient(3);
    renderAt(<MessagesNavBadge client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("Unread")).toBeInTheDocument();
  });

  it("renders nothing when there is nothing unread", async () => {
    const fake = badgeClient(0);
    renderAt(<MessagesNavBadge client={fake.client} />, createFakeAuth(), {
      path: "/messages",
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.queryByText("Unread")).not.toBeInTheDocument();
  });
});
