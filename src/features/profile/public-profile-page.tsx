import { lazy, Suspense, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  CopyIcon,
  ExternalLinkIcon,
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

export function PublicProfilePage({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const { username } = useParams();
  const normalized = normalizeUsername(username ?? "");
  const profileQuery = usePublicProfile(normalized, client);
  const profile = profileQuery.data ?? null;

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
