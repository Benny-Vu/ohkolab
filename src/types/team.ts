import type { BattleFormat } from "@/types/battle";
import type { PokemonSet } from "@/types/pokemon";

export const MAX_TEAM_SIZE = 6;

export interface Team {
  /** UUID. Local teams and cloud teams share the same id space. */
  id: string;
  name: string;
  format: BattleFormat;
  /** Up to MAX_TEAM_SIZE members, in team order. */
  members: PokemonSet[];
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}
