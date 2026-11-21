import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";

import { DataBadge } from "@/components/data-badge";
import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";
import { FormatToggle } from "@/features/metagame/format-toggle";
import { KoMatrix } from "@/features/battle/ko-matrix";
import { MySidePanel } from "@/features/battle/my-side-panel";
import { NotesPanel } from "@/features/battle/notes-panel";
import { OpponentPanel } from "@/features/battle/opponent-panel";
import { SpeedOrderPanel } from "@/features/battle/speed-order-panel";
import { useBattleMatrix } from "@/features/battle/use-matrix";
import {
  applyRevealedFields,
  hasRevealedFields,
} from "@/features/battle/opponent-input";
import {
  setNotesMyTeam,
  useBattleNotesState,
} from "@/features/battle/notes-store";
import { speedRange, type SpeedRange } from "@/features/battle/speed-note";
import { calcStats } from "@/data";
import { useBattleFormat } from "@/lib/preferences";
import { useT } from "@/lib/i18n/t";
import { useTeams } from "@/lib/team/use-teams";
import type { PokemonSet } from "@/types/pokemon";
import type { OpponentInput } from "@/features/battle/opponent-input";

/**
 * Battle mode (/calc/battle): one phone screen for the team-preview minute.
 * Pick your six (saved team or paste) and their six (type-ahead, recent picks
 * or a team-preview paste), and the page shows the KO matrix both directions
 * and the speed order of all twelve. Their slots fill with each species'
 * most common usage set, labelled by where the set came from — and the
 * battle notes overlay what was revealed in the match on top of that.
 */
/** Router state "Send to battle mode" passes: the saved team to preselect. */
interface BattleLocationState {
  teamId?: string;
}

export function BattlePage() {
  const t = useT();
  const [format] = useBattleFormat();
  const location = useLocation();
  const { teams } = useTeams();
  const [mySets, setMySets] = useState<PokemonSet[]>([]);
  const [opponents, setOpponents] = useState<OpponentInput[]>([]);
  const { current: currentNotes } = useBattleNotesState();

  // A team sent here from its detail arrives with the saved team's id in
  // router state; preselect it once. The guard keeps a store refresh from
  // re-picking over a choice the player made after arriving.
  const requestedTeamId = (location.state as BattleLocationState | null)
    ?.teamId;
  const preselected = useRef(false);
  useEffect(() => {
    if (!requestedTeamId || preselected.current) return;
    const team = teams.find((entry) => entry.id === requestedTeamId);
    if (team) {
      preselected.current = true;
      setMySets(team.members);
    }
  }, [requestedTeamId, teams]);

  // My six (with each one's Speed) sync into the notes store, so speed
  // relations there can name my Pokémon. Emptying the team clears it, and
  // a new set re-syncs. The store no-ops an unchanged team, so this can
  // never loop.
  useEffect(() => {
    const seen = new Set<string>();
    const members: { species: string; speed: number }[] = [];
    for (const set of mySets) {
      if (seen.has(set.species)) continue;
      seen.add(set.species);
      members.push({ species: set.species, speed: calcStats(set).spe });
    }
    setNotesMyTeam(members);
  }, [mySets, currentNotes]);

  // The Speed range the notes narrowed each opponent into, for the band
  // in the speed order.
  const notedRanges = useMemo(() => {
    const ranges: Record<string, SpeedRange> = {};
    for (const [species, note] of Object.entries(currentNotes.notes)) {
      const range = speedRange(note.relations);
      if (range.min !== null || range.max !== null) ranges[species] = range;
    }
    return ranges;
  }, [currentNotes]);

  // The species with anything revealed, for the provenance badges.
  const revealedSpecies = useMemo(() => {
    const revealed = new Set<string>();
    for (const [species, note] of Object.entries(currentNotes.notes)) {
      if (hasRevealedFields(note)) revealed.add(species);
    }
    return revealed;
  }, [currentNotes]);

  // Revealed fields override the common-set guess in the matrix and the
  // speed order; everything unrevealed stays as the guess filled it.
  const notedOpponents = useMemo(
    () =>
      opponents.map((opponent) =>
        applyRevealedFields(opponent, currentNotes.notes[opponent.species]),
      ),
    [opponents, currentNotes],
  );

  const opponentSpecies = useMemo(
    () => opponents.map((opponent) => opponent.species),
    [opponents],
  );

  const { matrix, isPending } = useBattleMatrix(mySets, notedOpponents, format);

  const bothTeams = mySets.length > 0 && opponents.length > 0;

  return (
    <Page
      title={t("battle.title")}
      description={t("battle.description")}
      actions={<FormatToggle />}
    >
      <div className="grid gap-4">
        <DataBadge />

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <MySidePanel sets={mySets} onSetsChange={setMySets} />
          <OpponentPanel
            format={format}
            opponents={opponents}
            onOpponentsChange={setOpponents}
            revealedSpecies={revealedSpecies}
          />
        </div>

        <NotesPanel opponents={opponentSpecies} standaloneLink />

        {bothTeams ? (
          <KoMatrix
            isPending={isPending}
            matrix={matrix}
            mySets={mySets}
            opponents={notedOpponents}
          />
        ) : (
          <EmptyState title={t("battle.emptyMatrix")} />
        )}

        <SpeedOrderPanel
          mySets={mySets}
          opponents={notedOpponents}
          notedRanges={notedRanges}
        />
      </div>
    </Page>
  );
}
