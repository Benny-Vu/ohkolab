import { t } from "@/lib/i18n/t";
import { DEFAULT_TEAM_NAME } from "@/lib/team/team-ops";

/**
 * The name to show for a team. New teams are stored under the English
 * sentinel `DEFAULT_TEAM_NAME`; it is displayed localized (and saved teams
 * keep whatever name their owner gave them — nothing is renamed in the
 * data). Call during render so the active locale applies.
 */
export function displayTeamName(name: string): string {
  return name === DEFAULT_TEAM_NAME ? t("teams.untitled") : name;
}
