/**
 * Test-only helpers for the direct message layer: the shared fake Supabase
 * client from `@/test/fake-supabase` (its chain records every query and rpc
 * call, and its Realtime channel support covers the realtime wiring) plus
 * the event-delivery helper the realtime tests use. Nothing in the app
 * imports this file.
 */

export {
  createFakeClient,
  createQueryClient,
  createWrapper,
  expectFailed,
  runMutation,
  SIGNED_IN_AUTH,
} from "@/test/fake-supabase";
export type { FakeClientConfig, FakeResult } from "@/test/fake-supabase";

import type { FakeClient } from "@/test/fake-supabase";

/**
 * Delivers a fake Realtime INSERT to every listener of the named channel, the
 * way the server would. Use the channel name the code passed to
 * `client.channel(...)`.
 */
export function emitFakeMessage(
  fake: FakeClient,
  channelName: string,
  row: Record<string, unknown>,
): void {
  const channel = (
    fake.client as unknown as {
      channel: (name: string) => {
        callbacks: Array<(payload: { new: Record<string, unknown> }) => void>;
      };
    }
  ).channel(channelName);
  for (const callback of channel.callbacks) {
    callback({ new: row });
  }
}
