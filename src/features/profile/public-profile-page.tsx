import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  BanIcon,
  CopyIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  FlagIcon,
  LoaderCircleIcon,
  LogInIcon,
  UserRoundIcon,
} from "lucide-react";

import { Page } from "@/components/page";
import { PokemonSprite, PokemonIcon } from "@/components/pokemon-sprite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { normalizeUsername } from "@/lib/auth/validation";
import { useTeams } from "@/lib/team/use-teams";
import type { Team } from "@/types/team";
import { MAX_TEAM_SIZE } from "@/types/team";
import {
  usePublicProfile,
  usePublicTeams,
} from "@/features/profile/profile-queries";
import { useAuth } from "@/lib/auth/use-auth";
import type { Profile } from "@/lib/auth/types";
import {
  socialAvailability,
  useAuthorPosts,
  useFollowCounts,
  useFollowers,
  useFollowing,
  useFollowState,
  useIsModerator,
  useToggleBlock,
  useToggleFollow,
  type SocialProfileSummary,
} from "@/lib/social";
import { PostList } from "@/features/feed/post-list";
import { ReportDialog } from "@/features/feed/report-dialog";
import { SuspendDialog } from "@/features/admin/suspend-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Team member details need the dex (battleTypes), so the row lives in its
// own module and loads lazily when the team dialog opens.
const TeamMemberRow = lazy(() =>
  import("@/features/profile/team-member-row").then((m) => ({
    default: m.TeamMemberRow,
  })),
);

function UnconfiguredNotice() {
  return (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>Profiles are unavailable</AlertTitle>
      <AlertDescription>
        Profiles are not available in this build.
      </AlertDescription>
    </Alert>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function ProfileHeader({
  displayName,
  username,
  avatarSpecies,
  bio,
  createdAt,
}: {
  displayName: string | null;
  username: string;
  avatarSpecies: string | null;
  bio: string | null;
  createdAt: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-start gap-4">
        {avatarSpecies ? (
          <PokemonSprite species={avatarSpecies} size={72} />
        ) : (
          <div className="grid size-[72px] shrink-0 place-content-center rounded-lg bg-muted text-center text-xs text-muted-foreground">
            No avatar
          </div>
        )}
        <div className="grid min-w-0 flex-1 gap-1">
          <p className="min-w-0 truncate text-xl font-semibold">
            {displayName ?? username}
          </p>
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            @{username}
          </p>
          {bio ? (
            <p className="min-w-0 whitespace-pre-wrap text-sm">{bio}</p>
          ) : null}
          <p className="min-w-0 text-xs text-muted-foreground">
            Joined {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamDialog({ team, username }: { team: Team; username: string }) {
  const [open, setOpen] = useState(false);
  const { create } = useTeams();

  const copyToMyTeams = () => {
    const copy = create({
      name: team.name,
      format: team.format,
      members: team.members,
    });
    setOpen(false);
    toast.success(`Copied "${copy.name}" to your teams.`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="min-w-0 truncate">{team.name}</DialogTitle>
          <DialogDescription>
            {team.format === "doubles" ? "Doubles" : "Singles"} ·{" "}
            {team.members.length} Pokémon · shared by @{username}
          </DialogDescription>
        </DialogHeader>
        <ul className="grid gap-3">
          {team.members.map((_, index) => (
            <Suspense
              key={index}
              fallback={
                <li>
                  <Skeleton className="h-16 w-full" />
                </li>
              }
            >
              <TeamMemberRow team={team} index={index} />
            </Suspense>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={copyToMyTeams}>
            <CopyIcon />
            Copy to my teams
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamCard({ team, username }: { team: Team; username: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="min-w-0 truncate">{team.name}</CardTitle>
        <CardDescription>
          {team.format === "doubles" ? "Doubles" : "Singles"} ·{" "}
          {team.members.length} Pokémon
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
            const member = team.members[index];
            return member ? (
              <PokemonIcon key={index} species={member.species} />
            ) : (
              <div
                key={index}
                className="size-[40px] rounded-md border border-dashed"
                aria-hidden="true"
              />
            );
          })}
        </div>
      </CardContent>
      <CardFooter>
        <TeamDialog team={team} username={username} />
      </CardFooter>
    </Card>
  );
}

function TeamsSection({
  userId,
  username,
  client,
}: {
  userId: string;
  username: string;
  client: AppSupabaseClient;
}) {
  const teamsQuery = usePublicTeams(userId, client);

  if (teamsQuery.isPending) {
    return (
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Public teams</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </section>
    );
  }

  if (teamsQuery.isError) {
    return (
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Public teams</h2>
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Could not load teams</AlertTitle>
          <AlertDescription>
            Something went wrong while loading this profile's teams.
          </AlertDescription>
        </Alert>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void teamsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </section>
    );
  }

  const teams = teamsQuery.data;

  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">Public teams</h2>
      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public teams yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} username={username} />
          ))}
        </div>
      )}
    </section>
  );
}

function FollowListRow({
  profile,
  onClose,
}: {
  profile: SocialProfileSummary;
  onClose: () => void;
}) {
  return (
    <li>
      <Link
        to={`/u/${profile.username}`}
        onClick={onClose}
        className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
      >
        {profile.avatarSpecies ? (
          <PokemonIcon species={profile.avatarSpecies} />
        ) : (
          <div className="grid size-[40px] shrink-0 place-content-center rounded-md bg-muted text-muted-foreground">
            <UserRoundIcon className="size-4" />
          </div>
        )}
        <span className="grid min-w-0">
          <span className="truncate text-sm font-medium">
            {profile.displayName ?? profile.username}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            @{profile.username}
          </span>
        </span>
      </Link>
    </li>
  );
}

function FollowListDialog({
  query,
  title,
  emptyText,
  onClose,
}: {
  query: ReturnType<typeof useFollowers>;
  title: string;
  emptyText: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {query.isPending ? (
          <div className="grid gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (query.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="grid gap-1">
            {(query.data ?? []).map((summary) => (
              <FollowListRow
                key={summary.id}
                profile={summary}
                onClose={onClose}
              />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FollowersDialog({
  userId,
  client,
  onClose,
}: {
  userId: string;
  client: AppSupabaseClient;
  onClose: () => void;
}) {
  const query = useFollowers(userId, client);
  return (
    <FollowListDialog
      query={query}
      title="Followers"
      emptyText="No followers yet."
      onClose={onClose}
    />
  );
}

function FollowingDialog({
  userId,
  client,
  onClose,
}: {
  userId: string;
  client: AppSupabaseClient;
  onClose: () => void;
}) {
  const query = useFollowing(userId, client);
  return (
    <FollowListDialog
      query={query}
      title="Following"
      emptyText="Not following anyone yet."
      onClose={onClose}
    />
  );
}

function ProfileSocialSection({
  profile,
  client,
}: {
  profile: Profile;
  client: AppSupabaseClient;
}) {
  const auth = useAuth();
  const isSelf = auth.user?.id === profile.id;
  const followState = useFollowState(profile.id, client);
  const toggleFollow = useToggleFollow(profile.id, client);
  const toggleBlock = useToggleBlock(profile.id, client);
  const countsQuery = useFollowCounts(profile.id, client);
  const moderatorQuery = useIsModerator(client);
  const [listOpen, setListOpen] = useState<"followers" | "following" | null>(
    null,
  );
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const isModerator = moderatorQuery.data === true;

  const following = followState.data === true;
  const counts = countsQuery.data;
  const signInTo = `/login?returnTo=/u/${profile.username}`;

  const handleToggleFollow = async () => {
    const result = await toggleFollow.mutateAsync();
    if (result.ok) {
      toast.success(
        following
          ? `Unfollowed @${profile.username}.`
          : `Following @${profile.username}.`,
      );
    } else {
      toast.error(result.error.message);
    }
  };

  const handleBlock = async () => {
    const result = await toggleBlock.mutateAsync();
    if (result.ok) {
      setBlockOpen(false);
      toast.success(`Blocked @${profile.username}.`);
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!auth.user ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to={signInTo}>
                  <LogInIcon />
                  Sign in to follow
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="More options"
                  >
                    <EllipsisIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={signInTo}>
                      <LogInIcon />
                      Sign in to block
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : !isSelf ? (
            <>
              <Button
                variant={following ? "outline" : "default"}
                size="sm"
                disabled={toggleFollow.isPending}
                onClick={() => void handleToggleFollow()}
              >
                {toggleFollow.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : null}
                {following ? "Unfollow" : "Follow"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="More options"
                  >
                    <EllipsisIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setBlockOpen(true)}
                  >
                    <BanIcon />
                    Block user
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                    <FlagIcon />
                    Report user
                  </DropdownMenuItem>
                  {isModerator ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setSuspendOpen(true)}
                    >
                      <BanIcon />
                      Suspend user
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setListOpen("followers")}
          >
            {counts ? counts.followers : "…"} followers
          </button>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <button
            type="button"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setListOpen("following")}
          >
            {counts ? counts.following : "…"} following
          </button>
        </div>
      </CardContent>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block @{profile.username}?</DialogTitle>
            <DialogDescription>
              Blocking works both ways: you won't see their posts or profile,
              they won't see yours, and neither of you can follow the other. You
              can unblock them later from your account page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlockOpen(false)}
              disabled={toggleBlock.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleBlock()}
              disabled={toggleBlock.isPending}
            >
              {toggleBlock.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <BanIcon />
              )}
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="profile"
        targetId={profile.id}
      />

      <SuspendDialog
        userId={profile.id}
        client={client}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
      />

      {listOpen === "followers" ? (
        <FollowersDialog
          userId={profile.id}
          client={client}
          onClose={() => setListOpen(null)}
        />
      ) : null}
      {listOpen === "following" ? (
        <FollowingDialog
          userId={profile.id}
          client={client}
          onClose={() => setListOpen(null)}
        />
      ) : null}
    </Card>
  );
}

function PostsSection({
  userId,
  client,
}: {
  userId: string;
  client: AppSupabaseClient;
}) {
  const postsQuery = useAuthorPosts(userId, client);

  if (postsQuery.isPending) {
    return (
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Posts</h2>
        <div className="grid gap-3" aria-label="Loading posts">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </section>
    );
  }

  if (postsQuery.isError) {
    return (
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Posts</h2>
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>Could not load posts</AlertTitle>
          <AlertDescription>
            Something went wrong while loading this trainer's posts. Check your
            connection and try again.
          </AlertDescription>
        </Alert>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void postsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </section>
    );
  }

  const posts = postsQuery.data?.pages.flat() ?? [];

  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">Posts</h2>
      <PostList posts={posts} emptyMessage="No posts yet." />
      {postsQuery.hasNextPage ? (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void postsQuery.fetchNextPage()}
            disabled={postsQuery.isFetchingNextPage}
          >
            {postsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function PublicProfilePage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const { username } = useParams();
  const normalized = normalizeUsername(username ?? "");
  const profileQuery = usePublicProfile(normalized, client);
  const profile = profileQuery.data ?? null;
  const socialReady = socialAvailability(client) === "ready";

  return (
    <Page
      title={profile ? `@${profile.username}` : "Profile"}
      description={
        profile?.displayName
          ? `${profile.displayName} on OHKOLab`
          : "A trainer's public profile."
      }
      width="narrow"
    >
      {!client ? (
        <UnconfiguredNotice />
      ) : profileQuery.isPending ? (
        <ProfileSkeleton />
      ) : profileQuery.isError ? (
        <div className="grid gap-3">
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Could not load profile</AlertTitle>
            <AlertDescription>
              Something went wrong while loading this profile. Check your
              connection and try again.
            </AlertDescription>
          </Alert>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void profileQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : !profile ? (
        <div className="grid gap-3">
          <Alert>
            <UserRoundIcon />
            <AlertTitle>Profile not found</AlertTitle>
            <AlertDescription>
              No one goes by @{normalized} here.
            </AlertDescription>
          </Alert>
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ExternalLinkIcon />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <ProfileHeader
            displayName={profile.displayName}
            username={profile.username}
            avatarSpecies={profile.avatarSpecies}
            bio={profile.bio}
            createdAt={profile.createdAt}
          />
          {socialReady ? (
            <ProfileSocialSection profile={profile} client={client} />
          ) : null}
          {socialReady ? (
            <PostsSection userId={profile.id} client={client} />
          ) : null}
          <TeamsSection
            userId={profile.id}
            username={profile.username}
            client={client}
          />
        </div>
      )}
    </Page>
  );
}
