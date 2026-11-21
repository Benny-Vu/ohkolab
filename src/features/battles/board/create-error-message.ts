import type { useT } from "@/lib/i18n/t";

/**
 * Maps a raw battle_requests insert error to a friendly bilingual toast
 * string. Shared by the flows that post through the same table and hit
 * the same limits.
 */
export function createErrorMessage(
  raw: string | undefined,
  t: ReturnType<typeof useT>,
): string {
  if (raw?.includes("Too many open battle requests")) {
    return t("battles.errorTooManyOpen");
  }
  return t("battles.errorGeneric");
}
