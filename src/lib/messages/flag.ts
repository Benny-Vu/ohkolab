/**
 * Direct messages are built but not launched (owner decision, 2026-11-19).
 *
 * Everything message-related is gated behind the VITE_DIRECT_MESSAGES build
 * flag, following the same pattern as `VITE_IMAGE_POSTS`: "true" turns the
 * feature on, anything else hides it. With the flag off there is no Messages
 * UI and **no queries to the direct message tables or RPCs**, because their
 * migration is not applied to the live database until the owner decides to
 * launch. Only the owner turns the flag on.
 */

/** True only when VITE_DIRECT_MESSAGES is exactly "true" at build time. */
export function directMessagesEnabled(): boolean {
  return import.meta.env.VITE_DIRECT_MESSAGES === "true";
}
