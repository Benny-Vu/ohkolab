import { useMemo } from "react";
import { useNavigate } from "react-router";

import { ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { TeamPreview } from "@/components/team-preview/team-preview";
import { TypeBadge } from "@/components/type-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonTouchClass } from "@/components/touch-targets";
import { useDisplayName } from "@/data/display-names";
import { useAuth } from "@/lib/auth/use-auth";
import { formatDate } from "@/lib/format-date";
import { useT } from "@/lib/i18n/t";
import type { PokemonUsage } from "@/lib/metagame/types";
import { exportTeam } from "@/lib/team/showdown";
import { useTeams } from "@/lib/team/use-teams";
import type { TopTeam, TopTeamMember } from "@/lib/top-teams/types";
import type { TypeName } from "@/types/pokemon";

import {
  buildTopTeamSets,
  playersText,
  recordText,
} from "@/features/metagame/top-teams/build";

/**
 * The team detail: the sheet as the app renders teams, the per-member
 * lines with the published Tera type, the SP honesty note, and the
 * actions — the Showdown paste, battle mode, saving to my teams (signed
 * in) and the Limitless source page where the players' names live.
 *
 * Battle mode keeps its own-side input in local page state, so "Send to
 * battle mode" is save-then-navigate: the team is saved into the store its
 * picker reads, and the id rides along as router state so the page
 * preselects it.
 */

/** The name a saved copy gets: the event and the placing. */
function teamName(team: TopTeam): string {
  return `${team.event} #${team.placing}`;
}

/** One published member as a line: names, the Tera chip, the moves. */
function MemberLine({ member }: { member: TopTeamMember }) {
  const displayName = useDisplayName();
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-sm font-medium">
        {displayName("species", member.species)}
      </span>
      {member.tera ? (
        <TypeBadge type={member.tera as TypeName} size="sm" />
      ) : null}
      {member.item ? (
        <span className="text-xs text-muted-foreground">
          {displayName("item", member.item)}
        </span>
      ) : null}
      <span className="text-xs text-muted-foreground">
        {displayName("ability", member.ability)}
      </span>
      <span className="w-full text-xs text-muted-foreground sm:w-auto">
        {member.moves.map((move) => displayName("move", move)).join(" / ")}
      </span>
    </li>
  );
}

export function TeamDetailDialog({
  team,
  usageBySpecies,
  onClose,
}: {
  team: TopTeam | null;
  usageBySpecies: ReadonlyMap<string, PokemonUsage>;
  onClose: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { create } = useTeams();

  const built = useMemo(
    () => (team ? buildTopTeamSets(team, usageBySpecies) : []),
    [team, usageBySpecies],
  );
  const sets = built.map((entry) => entry.set);

  const handleCopyPaste = () => {
    if (sets.length === 0) {
      toast.error(t("meta.teamLoadFailed"));
      return;
    }
    void navigator.clipboard
      .writeText(exportTeam(sets))
      .then(() => toast.success(t("meta.pasteCopied")))
      .catch(() => toast.error(t("share.copyFailed")));
  };

  // Battle mode reads its own-side input from the saved-team store (its
  // page state is local), so the team is saved first and its id passed as
  // router state for the page to preselect.
  const handleSendToBattle = () => {
    if (sets.length === 0 || !team) {
      toast.error(t("meta.teamLoadFailed"));
      return;
    }
    const saved = create({
      name: teamName(team),
      format: "doubles",
      members: sets,
    });
    toast.success(t("meta.teamSaved"));
    navigate("/calc/battle", { state: { teamId: saved.id } });
  };

  const handleSaveTeam = () => {
    if (sets.length === 0 || !team) {
      toast.error(t("meta.teamLoadFailed"));
      return;
    }
    const saved = create({
      name: teamName(team),
      format: "doubles",
      members: sets,
    });
    toast.success(t("meta.teamSaved"));
    navigate(`/teams/${saved.id}`);
  };

  return (
    <Dialog
      open={team !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {team ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {team.event} — {t("meta.placing", { placing: team.placing })}
              </DialogTitle>
              <DialogDescription>
                {formatDate(team.date)} · {recordText(t, team)} ·{" "}
                {playersText(t, team)} · {team.format}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <TeamPreview
                team={{ members: sets }}
                variant="expanded"
                ariaLabel={team.event}
              />
              <ul className="space-y-1.5">
                {team.members.map((member, index) => (
                  <MemberLine key={index} member={member} />
                ))}
              </ul>
              {/* The sheet publishes no Stat Points: every set above
                  borrows its SP spread, so it must not read as fact. */}
              <p className="text-xs text-muted-foreground">
                {t("meta.spAssumed")}
              </p>
              <DialogFooter className="flex-wrap gap-2 sm:justify-end">
                <Button asChild variant="ghost" className={buttonTouchClass}>
                  <a
                    href={team.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t("meta.topTeamsSource")}
                  >
                    {t("meta.topTeamsSource")}
                    <ExternalLinkIcon aria-hidden="true" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className={buttonTouchClass}
                  onClick={handleCopyPaste}
                >
                  {t("meta.copyAsPaste")}
                </Button>
                {user ? (
                  <Button
                    variant="outline"
                    className={buttonTouchClass}
                    onClick={handleSaveTeam}
                  >
                    {t("meta.saveTeam")}
                  </Button>
                ) : null}
                <Button
                  className={buttonTouchClass}
                  onClick={handleSendToBattle}
                >
                  {t("meta.sendToBattleMode")}
                </Button>
              </DialogFooter>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
