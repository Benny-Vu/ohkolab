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
} from "lucide-react";

import { Page } from "@/components/page";
import { PokemonIcon } from "@/components/pokemon-sprite";
import { UserAvatar } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SegmentedControl } from "@/components/segmented-control";
import { Badge } from "@/components/ui/badge";
import { formatJoined } from "@/lib/format-date";
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
import { displayTeamName } from "@/lib/team/display";
import { useTeams } from "@/lib/team/use-teams";
import type { Team } from "@/types/team";
import { MAX_TEAM_SIZE } from "@/types/team";
import {
  usePublicProfile,
  usePublicTeams,
} from "@/features/profile/profile-queries";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { directMessagesEnabled } from "@/lib/messages/flag";
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
import { ShareButton } from "@/features/share/share-button";
import { useUserGroups, type GroupSummary } from "@/lib/groups/queries";
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

// The banner tint needs the dex (getSpecies), so it loads lazily too and
// keeps the heavy pokemon-data chunk out of the profile route.
const ProfileBannerTint = lazy(() =>
  import("@/features/profile/profile-banner-tint").then((m) => ({
    default: m.ProfileBannerTint,
  })),
);

// The "Message" button only exists while VITE_DIRECT_MESSAGES is on; it
// loads lazily so flag-off builds never download it.
const ProfileMessageButton = lazy(() =>
  import("@/features/messages/profile-message-button").then((m) => ({
    default: m.ProfileMessageButton,
  })),
);

type ProfileTab = "posts" | "teams" | "groups";

function UnconfiguredNotice() {
  const t = useT();
  return (
    <Alert>
      <AlertCircleIcon aria-hidden />
      <AlertTitle>{t("publicProfile.unconfiguredTitle")}</AlertTitle>
      <AlertDescription>{t("publicProfile.unconfiguredBody")}</AlertDescription>
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

function TeamDialog({ team, username }: { team: Team; username: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { create } = useTeams();

  const copyToMyTeams = () => {
    const copy = create({
      name: team.name,
      format: team.format,
      members: team.members,
    });
    setOpen(false);
    toast.success(
      t("publicProfile.copyToast", { name: displayTeamName(copy.name) }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t("publicProfile.view")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="min-w-0 truncate">
            {displayTeamName(team.name)}
          </DialogTitle>
          <DialogDescription>
            {team.format === "doubles"
              ? t("calc.formatDoubles")
              : t("calc.formatSingles")}{" "}
            · {t("publicProfile.pokemonCount", { n: team.members.length })} ·{" "}
            {t("publicProfile.sharedBy", { name: username })}
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
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={copyToMyTeams}>
            <CopyIcon aria-hidden />
            {t("postCard.copyTeam")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamCard({ team, username }: { team: Team; username: string }) {
  const t = useT();
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="min-w-0 truncate">
          {displayTeamName(team.name)}
        </CardTitle>
        <CardDescription>
          {team.format === "doubles"
            ? t("calc.formatDoubles")
            : t("calc.formatSingles")}{" "}
          · {t("publicProfile.pokemonCount", { n: team.members.length })}
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
  const t = useT();
  const teamsQuery = usePublicTeams(userId, client);

  if (teamsQuery.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (teamsQuery.isError) {
    return (
      <ErrorState
        title={t("publicProfile.teamsLoadError")}
        description={t("publicProfile.teamsLoadErrorDescription")}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void teamsQuery.refetch()}
          >
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const teams = teamsQuery.data;

  if (teams.length === 0) {
    return <EmptyState title={t("publicProfile.noTeams")} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} username={username} />
      ))}
    </div>
  );
}

function ProfileGroupCard({ group }: { group: GroupSummary }) {
  const t = useT();
  return (
    <Link
      to={`/g/${group.slug}`}
      className="group block rounded-md focus-visible:outline-2"
    >
      <div className="rounded-md border bg-card p-4 transition-colors group-hover:border-primary/60">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-heading truncate text-base font-semibold">
            {group.name}
          </span>
          <Badge variant="secondary">
            {group.visibility === "invite_only"
              ? t("groups.inviteOnly")
              : t("groups.publicBadge")}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {group.description ?? t("groups.noDescription")}
        </p>
      </div>
    </Link>
  );
}

function GroupsSection({
  userId,
  client,
}: {
  userId: string;
  client: AppSupabaseClient;
}) {
  const t = useT();
  const groupsQuery = useUserGroups(userId, client);

  if (groupsQuery.isPending) {
    return (
      <div
        className="grid gap-3"
        role="status"
        aria-label={t("groups.loadingGroups")}
      >
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-20 w-full rounded-md" />
      </div>
    );
  }

  if (groupsQuery.isError) {
    return (
      <ErrorState
        title={t("publicProfile.groupsLoadError")}
        description={t("publicProfile.groupsLoadErrorDescription")}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void groupsQuery.refetch()}
          >
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const groups = groupsQuery.data ?? [];

  if (groups.length === 0) {
    return <EmptyState title={t("publicProfile.noGroups")} />;
  }

  return (
    <ul className="grid gap-3">
      {groups.map((group) => (
        <li key={group.id}>
          <ProfileGroupCard group={group} />
        </li>
      ))}
    </ul>
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
        className="flex items-center gap-3 rounded-md p-2 transition-colors duration-150 ease-out hover:bg-accent"
      >
        <UserAvatar
          username={profile.username}
          displayName={profile.displayName}
          avatarSpecies={profile.avatarSpecies}
          size="sm"
        />
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
  const t = useT();
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
        ) : query.isError ? (
          <ErrorState
            title={t("publicProfile.followListError")}
            description={query.error.message}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                {t("common.retry")}
              </Button>
            }
          />
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </DialogFooter>
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
  const t = useT();
  const query = useFollowers(userId, client);
  return (
    <FollowListDialog
      query={query}
      title={t("publicProfile.followers")}
      emptyText={t("publicProfile.noFollowers")}
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
  const t = useT();
  const query = useFollowing(userId, client);
  return (
    <FollowListDialog
      query={query}
      title={t("publicProfile.following")}
      emptyText={t("publicProfile.notFollowing")}
      onClose={onClose}
    />
  );
}

function ProfileSocialActions({
  profile,
  client,
}: {
  profile: Profile;
  client: AppSupabaseClient;
}) {
  const auth = useAuth();
  const t = useT();
  const isSelf = auth.user?.id === profile.id;
  const followState = useFollowState(profile.id, client);
  const toggleFollow = useToggleFollow(profile.id, client);
  const toggleBlock = useToggleBlock(profile.id, client);
  const moderatorQuery = useIsModerator(client);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const isModerator = moderatorQuery.data === true;

  const following = followState.data === true;
  const signInTo = `/login?returnTo=/u/${profile.username}`;

  const handleToggleFollow = async () => {
    const result = await toggleFollow.mutateAsync();
    if (result.ok) {
      toast.success(
        following
          ? t("publicProfile.unfollowedToast", { name: profile.username })
          : t("publicProfile.followingToast", { name: profile.username }),
      );
    } else {
      toast.error(result.error.message);
    }
  };

  const handleBlock = async () => {
    const result = await toggleBlock.mutateAsync();
    if (result.ok) {
      setBlockOpen(false);
      toast.success(t("postCard.blockedToast", { name: profile.username }));
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!auth.user ? (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to={signInTo}>
                <LogInIcon aria-hidden />
                {t("publicProfile.signInToFollow")}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("publicProfile.moreOptions")}
                >
                  <EllipsisIcon aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={signInTo}>
                    <LogInIcon aria-hidden />
                    {t("publicProfile.signInToBlock")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : !isSelf ? (
          <>
            {directMessagesEnabled() ? (
              <Suspense fallback={null}>
                <ProfileMessageButton profile={profile} client={client} />
              </Suspense>
            ) : null}
            <Button
              variant={following ? "outline" : "default"}
              size="sm"
              disabled={toggleFollow.isPending}
              onClick={() => void handleToggleFollow()}
            >
              {toggleFollow.isPending ? (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              ) : null}
              {following
                ? t("publicProfile.unfollow")
                : t("publicProfile.follow")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("publicProfile.moreOptions")}
                >
                  <EllipsisIcon aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setBlockOpen(true)}
                >
                  <BanIcon aria-hidden />
                  {t("publicProfile.blockUser")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                  <FlagIcon aria-hidden />
                  {t("publicProfile.reportUser")}
                </DropdownMenuItem>
                {isModerator ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setSuspendOpen(true)}
                  >
                    <BanIcon aria-hidden />
                    {t("publicProfile.suspendUser")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("publicProfile.blockTitle", { name: profile.username })}
            </DialogTitle>
            <DialogDescription>
              {t("publicProfile.blockDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlockOpen(false)}
              disabled={toggleBlock.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleBlock()}
              disabled={toggleBlock.isPending}
            >
              {toggleBlock.isPending ? (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              ) : (
                <BanIcon aria-hidden />
              )}
              {t("publicProfile.block")}
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
    </>
  );
}

function ProfileFollowCounts({
  profile,
  client,
}: {
  profile: Profile;
  client: AppSupabaseClient;
}) {
  const t = useT();
  const countsQuery = useFollowCounts(profile.id, client);
  const [listOpen, setListOpen] = useState<"followers" | "following" | null>(
    null,
  );
  const counts = countsQuery.data;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 transition-colors duration-150 ease-out hover:text-foreground hover:underline"
          onClick={() => setListOpen("followers")}
        >
          {counts ? counts.followers : "…"} {t("publicProfile.followersLabel")}
        </button>
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 transition-colors duration-150 ease-out hover:text-foreground hover:underline"
          onClick={() => setListOpen("following")}
        >
          {counts ? counts.following : "…"} {t("publicProfile.followingLabel")}
        </button>
      </div>
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
    </>
  );
}

function ProfileHeader({
  profile,
  client,
  socialReady,
}: {
  profile: Profile;
  client: AppSupabaseClient;
  socialReady: boolean;
}) {
  return (
    <Card size="sm" className="relative">
      <Suspense fallback={null}>
        <ProfileBannerTint avatarSpecies={profile.avatarSpecies} />
      </Suspense>
      <CardContent className="relative grid gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <UserAvatar
            username={profile.username}
            displayName={profile.displayName}
            avatarSpecies={profile.avatarSpecies}
            size="lg"
          />
          <div className="grid min-w-0 flex-1 gap-1">
            <p className="min-w-0 truncate font-heading text-xl font-semibold">
              {profile.displayName ?? profile.username}
            </p>
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              @{profile.username}
            </p>
            {profile.bio ? (
              <p className="min-w-0 whitespace-pre-wrap break-words text-sm">
                {profile.bio}
              </p>
            ) : null}
            <p className="min-w-0 text-xs text-muted-foreground">
              {formatJoined(profile.createdAt)}
            </p>
          </div>
          {socialReady ? (
            <ProfileSocialActions profile={profile} client={client} />
          ) : null}
          <ShareButton
            className="self-start"
            title={profile.displayName ?? profile.username}
            url={`${window.location.origin}/u/${profile.username}`}
          />
        </div>
        {socialReady ? (
          <ProfileFollowCounts profile={profile} client={client} />
        ) : null}
      </CardContent>
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
  const t = useT();
  const postsQuery = useAuthorPosts(userId, client);

  if (postsQuery.isPending) {
    return (
      <div
        className="grid gap-3"
        role="status"
        aria-label={t("publicProfile.loadingPostsAria")}
      >
        <Skeleton className="h-28 w-full rounded-md" />
        <Skeleton className="h-28 w-full rounded-md" />
        <Skeleton className="h-28 w-full rounded-md" />
      </div>
    );
  }

  if (postsQuery.isError) {
    return (
      <ErrorState
        title={t("publicProfile.postsLoadError")}
        description={t("publicProfile.postsLoadErrorDescription")}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void postsQuery.refetch()}
          >
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const posts = postsQuery.data?.pages.flat() ?? [];

  return (
    <div className="grid gap-3">
      <PostList posts={posts} emptyMessage={t("publicProfile.noPosts")} />
      {postsQuery.hasNextPage ? (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void postsQuery.fetchNextPage()}
            disabled={postsQuery.isFetchingNextPage}
          >
            {postsQuery.isFetchingNextPage
              ? t("common.loading")
              : t("notifications.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function PublicProfilePage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const { username } = useParams();
  const normalized = normalizeUsername(username ?? "");
  const profileQuery = usePublicProfile(normalized, client);
  const profile = profileQuery.data ?? null;
  const socialReady = socialAvailability(client) === "ready";
  const [tab, setTab] = useState<ProfileTab>("posts");

  return (
    <Page
      title={
        profile ? (profile.displayName ?? profile.username) : t("nav.profile")
      }
      description={
        profile?.displayName
          ? t("publicProfile.metaDescription", { name: profile.displayName })
          : t("publicProfile.defaultDescription")
      }
      width="narrow"
    >
      {!client ? (
        <UnconfiguredNotice />
      ) : profileQuery.isPending ? (
        <ProfileSkeleton />
      ) : profileQuery.isError ? (
        <ErrorState
          title={t("publicProfile.profileLoadError")}
          description={t("publicProfile.profileLoadErrorDescription")}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void profileQuery.refetch()}
            >
              {t("common.retry")}
            </Button>
          }
        />
      ) : !profile ? (
        <div className="grid gap-3">
          <EmptyState
            title={t("publicProfile.notFoundTitle")}
            description={t("publicProfile.notFoundDescription", {
              name: normalized,
            })}
          />
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ExternalLinkIcon aria-hidden />
                {t("authCallback.backHome")}
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <ProfileHeader
            profile={profile}
            client={client}
            socialReady={socialReady}
          />
          <SegmentedControl
            aria-label={t("publicProfile.sectionsAria")}
            value={tab}
            onValueChange={(value) => setTab(value as ProfileTab)}
            options={[
              { value: "posts", label: t("publicProfile.postsTab") },
              { value: "teams", label: t("publicProfile.teamsTab") },
              { value: "groups", label: t("publicProfile.groupsTab") },
            ]}
          />
          {tab === "posts" ? (
            socialReady ? (
              <PostsSection userId={profile.id} client={client} />
            ) : null
          ) : null}
          {tab === "teams" ? (
            <TeamsSection
              userId={profile.id}
              username={profile.username}
              client={client}
            />
          ) : null}
          {tab === "groups" ? (
            <GroupsSection userId={profile.id} client={client} />
          ) : null}
        </div>
      )}
    </Page>
  );
}
