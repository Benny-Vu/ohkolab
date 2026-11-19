import { useId } from "react";
import { XIcon } from "lucide-react";

import { PokemonEditor } from "@/components/pokemon-editor";
import { Button } from "@/components/ui/button";
import { Panel, PanelTitle } from "@/features/calc/panel";
import {
  BattleStateEditor,
  type BattleStateHandlers,
} from "@/features/calc/side-panel";
import { secondDefenderHandlers } from "@/features/calc/second-defender";
import type { CalcSide } from "@/lib/calc/state";
import { useT } from "@/lib/i18n/t";

interface SecondDefenderPanelProps {
  value: CalcSide;
  onChange: (next: CalcSide) => void;
  onRemove: () => void;
}

/**
 * The defender's partner in doubles: the second Pokémon the selected move can
 * hit. It reuses the defender's editor (set plus battle state) without move
 * slots of its own, since the results shown are the attacker's moves.
 */
export function SecondDefenderPanel({
  value,
  onChange,
  onRemove,
}: SecondDefenderPanelProps) {
  const t = useT();
  const titleId = useId();
  const label = t("calc.secondDefender");
  const handlers: BattleStateHandlers = secondDefenderHandlers(value, onChange);

  return (
    <Panel labelledBy={titleId}>
      <div className="flex items-center justify-between gap-2">
        <PanelTitle id={titleId}>{label}</PanelTitle>
        <Button
          aria-label={t("calc.removeSecondDefender")}
          onClick={onRemove}
          size="xs"
          variant="ghost"
        >
          <XIcon aria-hidden />
          {t("calc.remove")}
        </Button>
      </div>
      <PokemonEditor
        value={value.set}
        onChange={handlers.onSetChange}
        allowBattleOnly
      />
      <BattleStateEditor label={label} side={value} handlers={handlers} />
    </Panel>
  );
}
