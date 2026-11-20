/**
 * Accounts: the public surface other features import.
 *
 * - `useAuth()` for the session, user, profile, loading flag and actions.
 * - `AuthProvider` is mounted once in `src/app/providers.tsx`.
 * - The validation helpers and limits live in their own modules and are
 *   imported from there directly.
 */
export { AuthProvider } from "@/lib/auth/auth-provider";
export { useAuth } from "@/lib/auth/use-auth";
