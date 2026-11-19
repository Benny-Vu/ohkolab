import {
  ExternalLinkIcon,
  LoaderCircleIcon,
  LogOutIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  lazy,
  Suspense,
  type FormEvent,
  type ReactNode,
  useState,
} from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { UserAvatar } from "@/components/user-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  usernameRules,
  normalizeOptionalText,
  normalizeUsername,
  validateBio,
  validateDisplayName,
  validateUsername,
} from "@/lib/auth/validation";
import type { AuthFailure, Profile } from "@/lib/auth/types";
import { LanguageSwitch } from "@/components/language-switch";
import { UnconfiguredNotice } from "@/features/account/unconfigured-notice";
import { TelemetrySwitch } from "@/features/feedback/telemetry-switch";
import { useProfilesByIds } from "@/features/profile/profile-queries";
import { socialAvailability, useBlocks, useToggleBlock } from "@/lib/social";

type ProfileFieldErrors = Partial<
  Record<"username" | "displayName" | "bio" | "avatarSpecies", string>
>;

// The species picker pulls the full dex; keep it out of the /profile route
// chunk and load it only when the avatar form renders.
const SpeciesPicker = lazy(() =>
  import("@/components/pokemon-editor/species-picker").then((m) => ({
    default: m.SpeciesPicker,
  })),
);

function ProfileSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function GuestPrompt() {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.guestTitle")}</CardTitle>
        <CardDescription>{t("profile.guestDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/login">{t("common.signIn")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** A titled group of settings, matching the styleguide section pattern. */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </section>
  );
}

/** The signed-in profile editor. */
function ProfileEditor({ profile }: { profile: Profile }) {
  const auth = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarSpecies, setAvatarSpecies] = useState(profile.avatarSpecies);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState<AuthFailure | null>(null);
  const [pending, setPending] = useState<"save" | "signOut" | "delete" | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const busy = pending !== null;

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedUsername = normalizeUsername(username);
    const nextDisplayName = normalizeOptionalText(displayName);
    const nextBio = normalizeOptionalText(bio);
    const errors: ProfileFieldErrors = {};
    const usernameError = validateUsername(normalizedUsername);
    if (usernameError) errors.username = usernameError;
    const displayNameError = validateDisplayName(nextDisplayName);
    if (displayNameError) errors.displayName = displayNameError;
    const bioError = validateBio(nextBio);
    if (bioError) errors.bio = bioError;
    setFieldErrors(errors);
    setFormError(null);
    if (errors.username || errors.displayName || errors.bio) return;

    setPending("save");
    const result = await auth.updateProfile({
      username: normalizedUsername,
      displayName: nextDisplayName,
      avatarSpecies,
      bio: nextBio,
    });
    setPending(null);
    if (result.ok) {
      toast.success(t("profile.savedToast"));
    } else if (result.error.field) {
      setFieldErrors((prev) => ({
        ...prev,
        [result.error.field as keyof ProfileFieldErrors]: result.error.message,
      }));
    } else {
      setFormError(result.error);
    }
  };

  const handleSignOut = async () => {
    setPending("signOut");
    const result = await auth.signOut();
    setPending(null);
    if (result.ok) {
      toast.success(t("profile.signedOutToast"));
      navigate("/", { replace: true });
    } else {
      setFormError(result.error);
    }
  };

  const handleDelete = async () => {
    setPending("delete");
    const result = await auth.deleteAccount();
    setPending(null);
    if (result.ok) {
      toast.success(t("profile.deletedToast"));
      navigate("/", { replace: true });
    } else {
      setFormError(result.error);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="grid gap-6">
      <SettingsSection
        title={t("nav.profile")}
        description={t("profile.howYouAppear")}
      >
        <Card>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSave} noValidate>
              <div className="flex items-center gap-4">
                <UserAvatar
                  username={username}
                  displayName={displayName}
                  avatarSpecies={avatarSpecies}
                  size="lg"
                />
                <div className="grid min-w-0 flex-1 gap-2">
                  <Label htmlFor="avatar-species">
                    {t("profile.avatarSpecies")}
                  </Label>
                  <Suspense fallback={<Skeleton className="h-8 w-full" />}>
                    <SpeciesPicker
                      id="avatar-species"
                      value={avatarSpecies}
                      onChange={(species) => setAvatarSpecies(species)}
                      placeholder={t("pokemonEditor.chooseSpecies")}
                    />
                  </Suspense>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">{t("profile.usernameLabel")}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  aria-invalid={fieldErrors.username ? true : undefined}
                  aria-describedby={
                    fieldErrors.username ? "username-error" : undefined
                  }
                />
                {fieldErrors.username ? (
                  <p
                    id="username-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.username}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {usernameRules()}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="display-name">
                  {t("profile.displayNameLabel")}
                </Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  aria-invalid={fieldErrors.displayName ? true : undefined}
                  aria-describedby={
                    fieldErrors.displayName ? "display-name-error" : undefined
                  }
                />
                {fieldErrors.displayName ? (
                  <p
                    id="display-name-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.displayName}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {t("profile.displayNameHint", {
                    max: DISPLAY_NAME_MAX_LENGTH,
                  })}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">{t("profile.bioLabel")}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  aria-invalid={fieldErrors.bio ? true : undefined}
                  aria-describedby={fieldErrors.bio ? "bio-error" : undefined}
                />
                {fieldErrors.bio ? (
                  <p
                    id="bio-error"
                    className="text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.bio}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {t("profile.bioHint", { max: BIO_MAX_LENGTH })}
                </p>
              </div>
              {formError ? (
                <p
                  id="profile-form-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {formError.message}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  disabled={busy}
                  aria-describedby={
                    formError ? "profile-form-error" : undefined
                  }
                >
                  {pending === "save" ? (
                    <LoaderCircleIcon className="animate-spin" aria-hidden />
                  ) : (
                    <SaveIcon aria-hidden />
                  )}
                  {t("profile.saveChanges")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setUsername(profile.username);
                    setDisplayName(profile.displayName ?? "");
                    setBio(profile.bio ?? "");
                    setAvatarSpecies(profile.avatarSpecies);
                    setFieldErrors({});
                    setFormError(null);
                  }}
                >
                  {t("profile.reset")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection title={t("profile.accountSection")}>
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.sessionTitle")}</CardTitle>
            <CardDescription>{t("profile.signOutDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSignOut} disabled={busy}>
              {pending === "signOut" ? (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              ) : (
                <LogOutIcon aria-hidden />
              )}
              {t("common.signOut")}
            </Button>
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection title={t("profile.privacyTitle")}>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.telemetryTitle")}</CardTitle>
              <CardDescription>
                {t("profile.telemetryDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelemetrySwitch />
            </CardContent>
          </Card>
          <BlockedUsersCard />
        </div>
      </SettingsSection>

      <SettingsSection title={t("language.label")}>
        <Card>
          <CardContent>
            <LanguageSwitch />
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection title={t("profile.dangerZone")}>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>{t("profile.deleteAccountTitle")}</CardTitle>
            <CardDescription>
              {t("profile.deleteAccountDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={busy}>
                  <Trash2Icon aria-hidden />
                  {t("profile.deleteAccountTitle")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("profile.deleteDialogTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("profile.deleteDialogPrefix")}
                    <span className="font-medium">{profile.username}</span>
                    {t("profile.deleteDialogSuffix")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <Label htmlFor="delete-confirm">
                    {t("profile.confirmUsername")}
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirm}
                    onChange={(event) => setDeleteConfirm(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                    disabled={busy}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={
                      busy ||
                      deleteConfirm.trim().toLowerCase() !== profile.username
                    }
                  >
                    {pending === "delete" ? (
                      <LoaderCircleIcon className="animate-spin" aria-hidden />
                    ) : (
                      <Trash2Icon aria-hidden />
                    )}
                    {t("profile.deleteForever")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </SettingsSection>
    </div>
  );
}

function BlockedUserRow({ profile }: { profile: Profile }) {
  const t = useT();
  const toggleBlock = useToggleBlock(profile.id);
  const [busy, setBusy] = useState(false);

  const handleUnblock = async () => {
    setBusy(true);
    const result = await toggleBlock.mutateAsync();
    setBusy(false);
    if (result.ok) {
      toast.success(t("profile.unblockedToast", { name: profile.username }));
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <li className="flex items-center gap-3">
      <UserAvatar
        username={profile.username}
        displayName={profile.displayName}
        avatarSpecies={profile.avatarSpecies}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <Link
          to={`/u/${profile.username}`}
          className="block truncate text-sm font-medium hover:underline"
        >
          {profile.displayName ?? profile.username}
        </Link>
        <Link
          to={`/u/${profile.username}`}
          className="block truncate text-xs text-muted-foreground hover:underline"
        >
          @{profile.username}
        </Link>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          void handleUnblock();
        }}
        disabled={busy}
      >
        {busy ? (
          <LoaderCircleIcon className="animate-spin" aria-hidden />
        ) : null}
        {t("profile.unblock")}
      </Button>
    </li>
  );
}

function BlockedUsersCard() {
  const t = useT();
  const blocksQuery = useBlocks();
  const ids = blocksQuery.data ?? [];
  const profilesQuery = useProfilesByIds(ids);

  if (socialAvailability() !== "ready") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.blockedUsersTitle")}</CardTitle>
        <CardDescription>
          {t("profile.blockedUsersDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {blocksQuery.isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : ids.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("profile.noBlocks")}
          </p>
        ) : profilesQuery.isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : profilesQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            {t("profile.blocksLoadFailed")}
          </p>
        ) : (
          <ul className="grid gap-2">
            {profilesQuery.data.map((profile) => (
              <BlockedUserRow key={profile.id} profile={profile} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ProfilePage() {
  const auth = useAuth();
  const t = useT();

  if (auth.loading) {
    return (
      <Page title={t("nav.profile")} width="narrow">
        <ProfileSkeleton />
      </Page>
    );
  }

  if (!auth.isConfigured) {
    return (
      <Page title={t("nav.profile")} width="narrow">
        <UnconfiguredNotice />
      </Page>
    );
  }

  if (!auth.user) {
    return (
      <Page title={t("nav.profile")} width="narrow">
        <GuestPrompt />
      </Page>
    );
  }

  return (
    <Page
      title={t("nav.profile")}
      description={auth.profile ? `@${auth.profile.username}` : undefined}
      width="narrow"
      actions={
        auth.profile ? (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/u/${auth.profile.username}`}>
              <ExternalLinkIcon aria-hidden />
              {t("profile.publicPage")}
            </Link>
          </Button>
        ) : undefined
      }
    >
      {auth.profile ? (
        <ProfileEditor profile={auth.profile} />
      ) : (
        <div className="grid gap-4">
          <Alert>
            <TriangleAlertIcon aria-hidden />
            <AlertTitle>{t("profile.loadFailedTitle")}</AlertTitle>
            <AlertDescription>{t("profile.loadFailedBody")}</AlertDescription>
          </Alert>
          <Button
            className="justify-self-start"
            onClick={() => {
              void auth.refreshProfile();
            }}
          >
            <RefreshCwIcon aria-hidden />
            {t("common.retry")}
          </Button>
        </div>
      )}
    </Page>
  );
}
