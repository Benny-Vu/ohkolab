import { Link } from "react-router";
import { ArrowLeftIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MemberCard } from "@/features/team-builder/member-card";
import { usePublicTeam } from "@/features/team-builder/public-team";
import { useProfilesByIds } from "@/features/profile/profile-queries";
import { ShareButton } from "@/features/share/share-button";
import { useT } from "@/lib/i18n/t";
import { displayTeamName } from "@/lib/team/display";
import { useTeams } from "@/lib/team/use-teams";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

/**
 * The team page for a team that is not the visitor's own: a public team
 * another player shared, opened through its `/teams/<id>` link. Rendered
 * by the team detail page when the id is not one of the visitor's teams.
 */

/** "shared by @name" for the owner of a public team, when the profile loads. */
function useSharedBy(
  ownerId: string,
  client: AppSupabaseClient | null,
): string | null {
  const t = useT();
  const profilesQuery = useProfilesByIds(ownerId ? [ownerId] : [], client);
  const profile = profilesQuery.data?.[0];
  if (!profile) return null;
  return t("publicProfile.sharedBy", { name: profile.username });
}

/** The "there is no such team here" page, with a way back to the list. */
function TeamNotFound() {
  const t = useT();
  return (
    <Page
      title={t("teams.notFound")}
      description={t("teams.notFoundDescription")}
    >
      <Button asChild variant="outline">
        <Link to="/teams">{t("teams.backToTeams")}</Link>
      </Button>
    </Page>
  );
}

/**
 * The read-only team page, with a share button and a copy into the
 * visitor's own teams. Rendered by the team detail page when the id is
 * not one of the visitor's teams.
 */
export function PublicTeamView({
  teamId,
  client = supabase,
}: {
  teamId: string;
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const teamQuery = usePublicTeam(teamId, client);
  const { create } = useTeams();
  const entry = teamQuery.data ?? null;
  const team = entry?.team ?? null;
  // Called unconditionally: the hooks must run before the early returns.
  const sharedBy = useSharedBy(entry?.ownerId ?? "", client);

  if (!client) {
    // Nothing to load a public team from (unconfigured build): not found.
    return <TeamNotFound />;
  }

  if (teamQuery.isPending) {
    return (
      <Page title={t("teams.loading")}>
        <p className="text-muted-foreground">{t("teams.loading")}</p>
      </Page>
    );
  }

  if (teamQuery.isError) {
    return (
      <Page title={t("teams.notFound")}>
        <div className="grid gap-4">
          <Alert>
            <TriangleAlertIcon aria-hidden />
            <AlertTitle>{t("teams.loadError")}</AlertTitle>
            <AlertDescription>{teamQuery.error.message}</AlertDescription>
          </Alert>
          <Button
            className="justify-self-start"
            onClick={() => void teamQuery.refetch()}
          >
            {t("teams.retry")}
          </Button>
        </div>
      </Page>
    );
  }

  if (!team || !entry) {
    return <TeamNotFound />;
  }

  const copyToMyTeams = () => {
    const copy = create({
      name: team.name,
      format: team.format,
      members: team.members,
    });
    toast.success(
      t("publicProfile.copyToast", { name: displayTeamName(copy.name) }),
    );
  };

  const meta = [
    team.format === "doubles"
      ? t("calc.formatDoubles")
      : t("calc.formatSingles"),
    t("publicProfile.pokemonCount", { n: team.members.length }),
  ].join(" · ");

  return (
    <Page
      title={displayTeamName(team.name)}
      description={sharedBy ? `${meta} · ${sharedBy}` : meta}
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link to="/teams">
              <ArrowLeftIcon aria-hidden />
              {t("teams.title")}
            </Link>
          </Button>
          <ShareButton
            title={displayTeamName(team.name)}
            url={`${window.location.origin}/teams/${team.id}`}
          />
          <Button variant="outline" size="sm" onClick={copyToMyTeams}>
            <CopyIcon aria-hidden />
            {t("postCard.copyTeam")}
          </Button>
        </>
      }
    >
      {team.members.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.members.map((member, index) => (
            <MemberCard key={index} member={member} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("teams.noMembers")}</p>
      )}
    </Page>
  );
}
