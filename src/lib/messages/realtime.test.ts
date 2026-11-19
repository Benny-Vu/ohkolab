import { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFakeClient,
  createWrapper,
  emitFakeMessage,
  SIGNED_IN_AUTH,
} from "@/lib/messages/test-client";
import { useThread } from "@/lib/messages/queries";
import { useThreadRealtime } from "@/lib/messages/realtime";

const CONV = "conv-1";
const OTHER = "user-2";

/** Renders the thread query together with the realtime hook, like the page. */
function renderThread(fake: ReturnType<typeof createFakeClient>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = createWrapper(queryClient, SIGNED_IN_AUTH);
  const thread = renderHook(() => useThread(CONV, fake.client), { wrapper });
  const realtime = renderHook(() => useThreadRealtime(CONV, fake.client), {
    wrapper,
  });
  return { queryClient, thread, realtime };
}

describe("thread realtime with the flag off", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates no channel", () => {
    const fake = createFakeClient();
    renderThread(fake);
    expect(fake.channels).toEqual([]);
    expect(fake.records).toEqual([]);
  });
});

describe("thread realtime with the flag on", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_DIRECT_MESSAGES", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("subscribes to inserts filtered to the conversation", () => {
    const fake = createFakeClient({
      resolve: () => ({ data: [], error: null }),
    });
    const { realtime } = renderThread(fake);
    expect(fake.channels).toHaveLength(1);
    expect(fake.channels[0]!.subscribed).toBe(true);
    expect(fake.channels[0]!.events).toContain("postgres_changes");
    expect(fake.channels[0]!.filters).toContain(`conversation_id=eq.${CONV}`);
    realtime.unmount();
    expect(fake.channels[0]!.removed).toBe(true);
  });

  it("appends an incoming message to the thread cache", async () => {
    const fake = createFakeClient({
      resolve: (record) =>
        record.table === "messages" && record.selectColumns
          ? {
              data: [
                {
                  id: "m1",
                  conversation_id: CONV,
                  sender_id: OTHER,
                  body: "Hello",
                  created_at: "2026-11-19T10:00:00+00:00",
                  deleted_at: null,
                },
              ],
              error: null,
            }
          : { data: [], error: null },
    });
    const { thread } = renderThread(fake);
    await waitFor(() => expect(thread.result.current.data).toBeDefined());

    emitFakeMessage(fake, `messages:${CONV}`, {
      id: "m2",
      conversation_id: CONV,
      sender_id: OTHER,
      body: "Live one",
      created_at: "2026-11-19T10:01:00+00:00",
      deleted_at: null,
    });
    await waitFor(() =>
      expect(thread.result.current.data?.map((row) => row.id)).toEqual([
        "m1",
        "m2",
      ]),
    );
  });
});
