/**
 * Whether the battle board is built into this deploy. The feature's
 * migration (`20261122200000_battle_requests.sql`) is applied separately,
 * with the owner's go-ahead at release — until then the tables may not
 * exist, so every battle hook stays disabled (the `VITE_DIRECT_MESSAGES`
 * pattern). The owner flips the repo variable at release.
 */

export function battlesEnabled(): boolean {
  return import.meta.env.VITE_BATTLES === "true";
}
