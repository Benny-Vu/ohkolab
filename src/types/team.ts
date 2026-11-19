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
  /** Cloud only: visible to other players. Undefined for local teams. */
  isPublic?: boolean;
  /**
   * The Champions "Replica Team" ID: a 10-character, case-sensitive code
   * the player shared in the game. Empty/undefined when the team has none.
   * The site can only store and show it — there is no API to load a team
   * from a code.
   */
  gameTeamId?: string | null;
}
