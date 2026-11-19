import { LoaderCircleIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuthFailure, Profile } from "@/lib/auth/types";
import { useAuth } from "@/lib/auth/use-auth";
import {
  DISPLAY_NAME_MAX_LENGTH,
  usernameRules,
  normalizeOptionalText,
  normalizeUsername,
  validateAvatarSpecies,
  validateDisplayName,
  validateUsername,
} from "@/lib/auth/validation";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { track } from "@/lib/telemetry/analytics";

import { needsOnboarding } from "@/features/account/onboarding";
import { useT } from "@/lib/i18n/t";
import { directMessagesEnabled } from "@/lib/messages/flag";

// The species picker pulls the full dex; load it only when the dialog opens.
const SpeciesPicker = lazy(() =>
  import("@/components/pokemon-editor/species-picker").then((m) => ({
    default: m.SpeciesPicker,
  })),
);
// The birth date field only exists while VITE_DIRECT_MESSAGES is on; it
// loads lazily so flag-off builds never download it.
const BirthDateField = lazy(() =>
  import("@/features/account/birth-date-fields").then((m) => ({
    default: m.BirthDateField,
  })),
);

type Availability = "idle" | "available" | "taken" | "error";

type FieldErrors = Partial<
  Record<"username" | "displayName" | "avatarSpecies", string>
>;

/** Asks `profiles` whether the username is already claimed. Null = unknown. */
async function isUsernameTaken(
  client: AppSupabaseClient,
  username: string,
): Promise<boolean | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (error) return null;
  return data !== null;
}

const TAKEN_MESSAGE_KEY = "auth.errUsernameTaken" as const;

export interface OnboardingDialogProps {
  /**
   * The client used for the live username check. Defaults to the shared
   * client; tests pass a fake.
   */
  client?: AppSupabaseClient | null;
}

/**
 * First-run profile setup: shown while the signed-in player still has a
 * generated `trainer_…` username. Skippable; it comes back on the next
 * visit until a username is chosen. The lead mounts it once in the layout.
 */
export function OnboardingDialog({ client = supabase }: OnboardingDialogProps) {
  const auth = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const profile = auth.profile;
  const needed = !dismissed && !auth.loading && needsOnboarding(profile);

  if (!needed || !profile) return null;

  return (
    <OnboardingForm
      key={profile.id}
      profile={profile}
      client={client}
      onDone={() => setDismissed(true)}
    />
  );
}

/** The dialog body. Mounted only once the profile is present, so the
 * optional fields can start from the profile values. */
function OnboardingForm({
  profile,
  client,
  onDone,
}: {
  profile: Profile;
  client: AppSupabaseClient | null;
  onDone: () => void;
}) {
  const auth = useAuth();
  const t = useT();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [avatarSpecies, setAvatarSpecies] = useState<string | null>(
    profile.avatarSpecies,
  );
  const [availability, setAvailability] = useState<Availability>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<AuthFailure | null>(null);
  const [pending, setPending] = useState(false);

  const normalized = normalizeUsername(username);
  const checkable =
    !!client &&
    normalized !== "" &&
    normalized !== profile.username &&
    validateUsername(normalized) === null;

  // Live availability check, debounced, only for valid new usernames.
  // "checking" is derived (checkable + no result yet), never stored.
  useEffect(() => {
    if (!checkable) return;
    const timer = setTimeout(() => {
      void isUsernameTaken(client!, normalized).then((taken) => {
        setAvailability(
          taken === null ? "error" : taken ? "taken" : "available",
        );
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [checkable, client, normalized]);

  // The check only runs while the username is checkable; otherwise the
  // status is derived, not stored.
  const status: Availability | "checking" = checkable
    ? availability === "idle"
      ? "checking"
      : availability
    : "idle";

  const skip = () => {
    track("onboarding_skipped");
    onDone();
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const nextDisplayName = normalizeOptionalText(displayName);
    const errors: FieldErrors = {};
    if (normalized === profile.username) {
      errors.username = t("auth.errUsernameNew");
    } else {
      const usernameError = validateUsername(normalized);
      if (usernameError) errors.username = usernameError;
    }
    const displayNameError = validateDisplayName(nextDisplayName);
    if (displayNameError) errors.displayName = displayNameError;
    const avatarError = validateAvatarSpecies(avatarSpecies);
    if (avatarError) errors.avatarSpecies = avatarError;
    setFieldErrors(errors);
    setFormError(null);
    if (errors.username || errors.displayName || errors.avatarSpecies) return;

    setPending(true);
    const result = await auth.updateProfile({
      username: normalized,
      displayName: nextDisplayName,
      avatarSpecies,
      bio: profile.bio,
    });
    setPending(false);
    if (result.ok) {
      track("onboarding_completed");
      toast.success(t("profile.savedToast"));
      onDone();
    } else if (result.error.field) {
      setFieldErrors((prev) => ({
        ...prev,
        [result.error.field as keyof FieldErrors]: result.error.message,
      }));
    } else {
      setFormError(result.error);
    }
  };

  const usernameStatus = fieldErrors.username ? (
    <p
      id="onboarding-username-status"
      className="text-sm text-destructive"
      role="alert"
    >
      {fieldErrors.username}
    </p>
  ) : status === "taken" ? (
    <p
      id="onboarding-username-status"
      className="text-sm text-destructive"
      role="alert"
    >
      {t(TAKEN_MESSAGE_KEY)}
    </p>
  ) : status === "checking" ? (
    <p
      id="onboarding-username-status"
      className="text-sm text-muted-foreground"
    >
      {t("onboarding.checking")}
    </p>
  ) : status === "available" ? (
    <p id="onboarding-username-status" className="text-sm text-success">
      {t("onboarding.available")}
    </p>
  ) : null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) skip();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("onboarding.title")}</DialogTitle>
          <DialogDescription>{t("onboarding.description")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSave} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="onboarding-username">
              {t("profile.usernameLabel")}
            </Label>
            <Input
              id="onboarding-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
              aria-invalid={
                fieldErrors.username || status === "taken" ? true : undefined
              }
              aria-describedby="onboarding-username-status"
            />
            {usernameStatus}
            <p className="text-xs text-muted-foreground">{usernameRules()}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="onboarding-display-name">
              {t("profile.displayNameLabel")}
            </Label>
            <Input
              id="onboarding-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              aria-invalid={fieldErrors.displayName ? true : undefined}
              aria-describedby="onboarding-display-name-status"
            />
            {fieldErrors.displayName ? (
              <p
                id="onboarding-display-name-status"
                className="text-sm text-destructive"
                role="alert"
              >
                {fieldErrors.displayName}
              </p>
            ) : (
              <p
                id="onboarding-display-name-status"
                className="text-xs text-muted-foreground"
              >
                {t("profile.displayNameHint", { max: DISPLAY_NAME_MAX_LENGTH })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <UserAvatar
              username={normalized || profile.username}
              displayName={normalizeOptionalText(displayName)}
              avatarSpecies={avatarSpecies}
              size="lg"
            />
            <div className="grid min-w-0 flex-1 gap-2">
              <Label htmlFor="onboarding-avatar">
                {t("onboarding.avatarLabel")}
              </Label>
              <Suspense fallback={<Skeleton className="h-8 w-full" />}>
                <SpeciesPicker
                  id="onboarding-avatar"
                  value={avatarSpecies}
                  onChange={(species) => setAvatarSpecies(species)}
                  placeholder={t("pokemonEditor.chooseSpecies")}
                />
              </Suspense>
              {fieldErrors.avatarSpecies ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.avatarSpecies}
                </p>
              ) : null}
            </div>
          </div>
          {/* Loaded only while VITE_DIRECT_MESSAGES is on. */}
          {directMessagesEnabled() ? (
            <Suspense fallback={null}>
              <BirthDateField />
            </Suspense>
          ) : null}
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={skip}>
              {t("onboarding.skip")}
            </Button>
            <Button
              type="submit"
              disabled={pending || status === "checking" || status === "taken"}
            >
              {pending ? (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              ) : null}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
