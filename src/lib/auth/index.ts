/**
 * Accounts: the public surface other features import.
 *
 * - `useAuth()` for the session, user, profile, loading flag and actions.
 * - `AuthProvider` is mounted once in `src/app/providers.tsx`.
 * - The validation helpers and limits are shared by forms and the database.
 */
export { AuthProvider } from "@/lib/auth/auth-provider";
export { useAuth } from "@/lib/auth/use-auth";
export {
  AUTH_CALLBACK_PATH,
  getAuthCallbackUrl,
  RESET_PASSWORD_PATH,
  sanitizeReturnTo,
} from "@/lib/auth/redirects";
export {
  OAUTH_PROVIDER_LABELS,
  type AuthContextValue,
  type AuthErrorCode,
  type AuthFailure,
  type AuthResult,
  type OAuthProvider,
  type Profile,
  type ProfileChanges,
  type RedirectOutcome,
  type Session,
  type SignUpInput,
  type SignUpOutcome,
  type User,
} from "@/lib/auth/types";
export {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  normalizeUsername,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_RULES,
  validateBio,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  validateUsername,
} from "@/lib/auth/validation";
