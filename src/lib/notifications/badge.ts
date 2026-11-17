/**
 * Pure badge logic for the notification bell. Kept out of the component file
 * so react-refresh keeps working and the logic can be tested on its own.
 */

/** Caps the badge at 99+ so it never overflows the bell. */
export function formatUnreadBadge(count: number): string {
  if (count <= 0) {
    return "";
  }
  return count > 99 ? "99+" : String(count);
}
