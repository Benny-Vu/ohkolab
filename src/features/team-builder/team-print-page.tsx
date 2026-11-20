import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeftIcon, PrinterIcon } from "lucide-react";

import { Page } from "@/components/page";
import { ItemIcon, PokemonSprite } from "@/components/pokemon-sprite";
import { SegmentedControl } from "@/components/segmented-control";
import { statLabel } from "@/components/stat-labels";
import { Button } from "@/components/ui/button";
import {
  buttonSmTouchClass,
  buttonTouchClass,
} from "@/components/touch-targets";
import { Input } from "@/components/ui/input";
import { usePublicTeam } from "@/features/team-builder/public-team";
import { useT } from "@/lib/i18n/t";
import { supabase } from "@/lib/supabase";
import { displayTeamName } from "@/lib/team/display";
import { useTeams } from "@/lib/team/use-teams";
import { useDisplayName } from "@/data";
import type { PokemonSet } from "@/types/pokemon";
import { STAT_IDS } from "@/types/pokemon";
import { MAX_TEAM_SIZE } from "@/types/team";

/** The two print modes: everything, or the open sheet opponents see. */
type PrintMode = "full" | "open";

/**
 * At print time only the sheet itself stays visible: the app shell (nav,
 * tab bar, footer) and this page's controls drop out, and the sheet sits
 * at the top of the page — one A4/US Letter page, black and white.
 */
const PRINT_ISOLATE_CSS = `@media print {
  body * { visibility: hidden; }
  #team-print-sheet, #team-print-sheet * { visibility: visible; }
  #team-print-sheet { position: absolute; inset-inline: 0; top: 0; margin: 0; }
}`;

/** The SP spread as one compact, labelled line: "HP 4 / Atk 0 / …". */
function spreadLine(
  member: PokemonSet,
  label: (stat: (typeof STAT_IDS)[number]) => string,
): string {
  return STAT_IDS.map((stat) => `${label(stat)} ${member.statPoints[stat]}`)
    .join(" / ")
    .replace(/^/, "SP ");
}

/** One printed slot. `mode` decides whether nature and SP appear. */
function PrintSlot({ member, mode }: { member: PokemonSet; mode: PrintMode }) {
  const t = useT();
  const displayName = useDisplayName();
  const itemName = member.item ? displayName("item", member.item) : null;
  const abilityName = member.ability
    ? displayName("ability", member.ability)
    : null;
  const natureName = displayName("nature", member.nature);
  const moves = member.moves
    .filter((move): move is string => Boolean(move))
    .map((move) => displayName("move", move));
  const title = member.nickname?.trim()
    ? member.nickname
    : displayName("species", member.species);

  return (
    <div className="flex items-start gap-2 rounded-md border p-2">
      <div className="relative shrink-0">
        <PokemonSprite species={member.species} size={40} />
        {member.item ? (
          <ItemIcon
            item={member.item}
            className="absolute right-0 bottom-0 size-3.5 rounded-md bg-card"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{title}</p>
        {mode === "full" ? (
          <p className="text-xs leading-tight">
            {t("teams.printLevel")} · {natureName}
          </p>
        ) : null}
        <p className="truncate text-xs leading-tight">
          {[itemName, abilityName].filter(Boolean).join(" · ") || "—"}
        </p>
        {mode === "full" ? (
          <p className="font-mono text-xs leading-tight tabular-nums">
            {spreadLine(member, (stat) => statLabel(t, stat))}
          </p>
        ) : null}
        <p className="text-xs leading-tight">{moves.join(" · ")}</p>
      </div>
    </div>
  );
}

/**
 * The printable team sheet: `/teams/<id>/print`. Works for the visitor's own
 * teams and for public teams opened through their link. The player name and
 * player ID fields live in this page's state only — they reach the paper,
 * never a store, the network or localStorage.
 */
export function TeamPrintPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const t = useT();
  const { teams, sync } = useTeams();
  const own = teams.find((candidate) => candidate.id === teamId);
  // Only queried when the team is not one of the visitor's own.
  const publicQuery = usePublicTeam(
    own ? "" : (teamId ?? ""),
    own ? null : supabase,
  );
  const team = own ?? publicQuery.data?.team ?? null;

  const [mode, setMode] = useState<PrintMode>("full");
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");

  if (!team && sync.loading) {
    return (
      <Page title={t("teams.printTeamSheet")}>
        <p className="text-sm text-muted-foreground">{t("teams.loading")}</p>
      </Page>
    );
  }

  if (!team) {
    return (
      <Page
        title={t("teams.notFound")}
        description={t("teams.notFoundDescription")}
      >
        <Button asChild variant="outline" className={buttonTouchClass}>
          <Link to="/teams">
            <ArrowLeftIcon aria-hidden />
            {t("teams.backToTeams")}
          </Link>
        </Button>
      </Page>
    );
  }

  const meta = [
    team.format === "doubles"
      ? t("calc.formatDoubles")
      : t("calc.formatSingles"),
    t("publicProfile.pokemonCount", { n: team.members.length }),
  ].join(" · ");

  return (
    <Page title={t("teams.printTeamSheet")} width="narrow">
      <style>{PRINT_ISOLATE_CSS}</style>

      {/* Everything on the page except the sheet is print-hidden. */}
      <section className="grid gap-3 print:hidden">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={`-ml-2 w-fit ${buttonSmTouchClass}`}
        >
          <Link to={`/teams/${team.id}`}>
            <ArrowLeftIcon aria-hidden />
            {t("common.back")}
          </Link>
        </Button>
        <div className="grid gap-2 rounded-md border bg-card p-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              {t("teams.printModeLabel")}
            </span>
            <SegmentedControl
              aria-label={t("teams.printModeLabel")}
              value={mode}
              onValueChange={(value) => setMode(value as PrintMode)}
              options={[
                { value: "full", label: t("teams.printModeFull") },
                { value: "open", label: t("teams.printModeOpen") },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label={t("teams.printPlayerName")}
              placeholder={t("teams.printPlayerName")}
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              className="w-44"
            />
            <Input
              aria-label={t("teams.printPlayerId")}
              placeholder={t("teams.printPlayerId")}
              value={playerId}
              onChange={(event) => setPlayerId(event.target.value)}
              className="w-44"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("teams.printPrivacyHint")}
          </p>
          <div>
            <Button
              size="sm"
              className={buttonSmTouchClass}
              onClick={() => window.print()}
            >
              <PrinterIcon aria-hidden />
              {t("teams.printAction")}
            </Button>
          </div>
        </div>
      </section>

      {/* The sheet: the only thing that prints. */}
      <div
        id="team-print-sheet"
        className="mt-4 grid gap-3 text-foreground print:mt-0 print:text-black"
      >
        <header>
          <h2 className="font-heading text-lg font-semibold">
            {displayTeamName(team.name)}
          </h2>
          <p className="text-xs text-muted-foreground print:text-black">
            {meta}
          </p>
          {playerName || playerId ? (
            <p className="text-xs">
              {[playerName, playerId].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {team.gameTeamId ? (
            <p className="text-xs">
              {t("teams.gameIdLabel")}:{" "}
              <span className="font-mono">{team.gameTeamId}</span>
            </p>
          ) : null}
        </header>
        <div id="team-print-slots" className="grid grid-cols-2 gap-2">
          {Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
            const member = team.members[index];
            if (!member) {
              return (
                <div
                  key={index}
                  aria-hidden="true"
                  className="min-h-[76px] rounded-md border border-dashed"
                />
              );
            }
            return <PrintSlot key={index} member={member} mode={mode} />;
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground print:text-black">
          {t("teams.printFooter")}
        </p>
      </div>
    </Page>
  );
}
