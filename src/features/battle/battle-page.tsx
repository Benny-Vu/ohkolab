import { useState } from "react";

import { DataBadge } from "@/components/data-badge";
import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";
import { FormatToggle } from "@/features/metagame/format-toggle";
import { KoMatrix } from "@/features/battle/ko-matrix";
import { MySidePanel } from "@/features/battle/my-side-panel";
import { OpponentPanel } from "@/features/battle/opponent-panel";
import { SpeedOrderPanel } from "@/features/battle/speed-order-panel";
import { useBattleMatrix } from "@/features/battle/use-matrix";
import { useBattleFormat } from "@/lib/preferences";
import { useT } from "@/lib/i18n/t";
import type { PokemonSet } from "@/types/pokemon";
import type { OpponentInput } from "@/features/battle/opponent-input";

/**
 * Battle mode (/calc/battle): one phone screen for the team-preview minute.
 * Pick your six (saved team or paste) and their six (type-ahead, recent picks
 * or a team-preview paste), and the page shows the KO matrix both directions
 * and the speed order of all twelve. Their slots fill with each species'
 * most common usage set, labelled by where the set came from.
 */
export function BattlePage() {
  const t = useT();
  const [format] = useBattleFormat();
  const [mySets, setMySets] = useState<PokemonSet[]>([]);
  const [opponents, setOpponents] = useState<OpponentInput[]>([]);
  const { matrix, isPending } = useBattleMatrix(mySets, opponents, format);

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
          />
        </div>

        {bothTeams ? (
          <KoMatrix
            isPending={isPending}
            matrix={matrix}
            mySets={mySets}
            opponents={opponents}
          />
        ) : (
          <EmptyState title={t("battle.emptyMatrix")} />
        )}

        <SpeedOrderPanel mySets={mySets} opponents={opponents} />
      </div>
    </Page>
  );
}
