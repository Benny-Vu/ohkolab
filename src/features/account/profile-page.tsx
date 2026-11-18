import {
  ExternalLinkIcon,
  LoaderCircleIcon,
  LogOutIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { lazy, Suspense, type FormEvent, useState } from "react";
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
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  USERNAME_RULES,
  normalizeOptionalText,
  normalizeUsername,
  validateBio,
  validateDisplayName,
  validateUsername,
} from "@/lib/auth/validation";
import type { AuthFailure, Profile } from "@/lib/auth/types";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>You are browsing as a guest</CardTitle>
        <CardDescription>
          Sign in to save teams, keep your profile and more.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** The signed-in profile editor. */
function ProfileEditor({ profile }: { profile: Profile }) {
  const auth = useAuth();
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
      toast.success("Profile saved.");
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
      toast.success("Signed out.");
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
      toast.success("Account deleted.");
      navigate("/", { replace: true });
    } else {
      setFormError(result.error);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear to other players.</CardDescription>
        </CardHeader>
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
                <Label htmlFor="avatar-species">Avatar species</Label>
                <Suspense fallback={<Skeleton className="h-8 w-full" />}>
                  <SpeciesPicker
                    value={avatarSpecies}
                    onChange={(species) => setAvatarSpecies(species)}
                    placeholder="Choose a Pokémon"
                  />
                </Suspense>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={fieldErrors.username ? true : undefined}
              />
              {fieldErrors.username ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.username}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">{USERNAME_RULES}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                aria-invalid={fieldErrors.displayName ? true : undefined}
              />
              {fieldErrors.displayName ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.displayName}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Optional. At most {DISPLAY_NAME_MAX_LENGTH} characters.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                aria-invalid={fieldErrors.bio ? true : undefined}
              />
              {fieldErrors.bio ? (
                <p className="text-sm text-destructive" role="alert">
                  {fieldErrors.bio}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Optional. At most {BIO_MAX_LENGTH} characters.
              </p>
            </div>
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError.message}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={busy}>
                {pending === "save" ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                Save changes
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
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Sign out on this device, or delete your account for good.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSignOut} disabled={busy}>
            {pending === "signOut" ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <LogOutIcon />
            )}
            Sign out
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={busy}>
                <Trash2Icon />
                Delete account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account</DialogTitle>
                <DialogDescription>
                  This permanently deletes your account, your profile and all
                  your saved teams. There is no undo. Type your username (
                  <span className="font-medium">{profile.username}</span>) to
                  confirm.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="delete-confirm">Confirm username</Label>
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
                  Cancel
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
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <Trash2Icon />
                  )}
                  Delete forever
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

function BlockedUserRow({ profile }: { profile: Profile }) {
  const toggleBlock = useToggleBlock(profile.id);
  const [busy, setBusy] = useState(false);

  const handleUnblock = async () => {
    setBusy(true);
    const result = await toggleBlock.mutateAsync();
    setBusy(false);
    if (result.ok) {
      toast.success(`Unblocked @${profile.username}.`);
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
        {busy ? <LoaderCircleIcon className="animate-spin" /> : null}
        Unblock
      </Button>
    </li>
  );
}

function BlockedUsersCard() {
  const blocksQuery = useBlocks();
  const ids = blocksQuery.data ?? [];
  const profilesQuery = useProfilesByIds(ids);

  if (socialAvailability() !== "ready") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blocked users</CardTitle>
        <CardDescription>
          Blocked trainers cannot follow you or interact with your posts.
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
            You haven't blocked anyone.
          </p>
        ) : profilesQuery.isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : profilesQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            Blocked users could not be loaded. Try refreshing.
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

  if (auth.loading) {
    return (
      <Page title="Profile" width="narrow">
        <ProfileSkeleton />
      </Page>
    );
  }

  if (!auth.isConfigured) {
    return (
      <Page title="Profile" width="narrow">
        <UnconfiguredNotice />
      </Page>
    );
  }

  if (!auth.user) {
    return (
      <Page title="Profile" width="narrow">
        <GuestPrompt />
      </Page>
    );
  }

  return (
    <Page
      title="Profile"
      description={auth.profile ? `@${auth.profile.username}` : undefined}
      width="narrow"
      actions={
        auth.profile ? (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/u/${auth.profile.username}`}>
              <ExternalLinkIcon />
              Public page
            </Link>
          </Button>
        ) : undefined
      }
    >
      {auth.profile ? (
        <div className="grid gap-4">
          <ProfileEditor profile={auth.profile} />
          <BlockedUsersCard />
          <Card>
            <CardHeader>
              <CardTitle>Crash reports and usage statistics</CardTitle>
              <CardDescription>
                Anonymous, cookieless telemetry that helps us find and fix
                problems. Turning it off stops both immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelemetrySwitch />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4">
          <Alert>
            <TriangleAlertIcon />
            <AlertTitle>Profile could not be loaded</AlertTitle>
            <AlertDescription>
              Your profile could not be loaded. Try refreshing.
            </AlertDescription>
          </Alert>
          <Button
            className="justify-self-start"
            onClick={() => {
              void auth.refreshProfile();
            }}
          >
            <RefreshCwIcon />
            Try again
          </Button>
        </div>
      )}
    </Page>
  );
}
