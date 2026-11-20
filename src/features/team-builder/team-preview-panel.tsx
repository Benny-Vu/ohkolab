import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ExternalLinkIcon, PrinterIcon } from "lucide-react";

import { TeamPreview } from "@/components/team-preview/team-preview";
import { TeamIdChip } from "@/components/team-id-chip";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SaveImageButton } from "@/features/share/save-image";
import { ShareButton } from "@/features/share/share-button";
import { useT } from "@/lib/i18n/t";
import { displayTeamName } from "@/lib/team/display";
import type { ShareCardContent } from "@/lib/share-cards/svg";
import type { Team } from "@/types/team";

/**
 * The `sm:` breakpoint of the layout, as a media query: at and above it the
 * preview opens as a side panel, below it as a bottom sheet.
 */
const DESKTOP_QUERY = "(min-width: 640px)";

/** Whether the viewport is desktop-width, tracked live. */
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(
    () => window.matchMedia(DESKTOP_QUERY).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => setDesktop(event.matches);
    if (query.addEventListener) {
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    }
    // Old Safari API; the stand-ins in tests take this path harmlessly.
    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);
  return desktop;
}

/**
 * The team preview panel of the teams list: the selected team at a glance
 * (sprite, item, ability, nature and moves per slot) plus the actions —
 * open the team, send its first Pokémon to the calc, share the link, copy
 * the Champions team ID and print a team sheet. A side panel on desktop, a
 * sheet on phones.
 */
export function TeamPreviewPanel({
  team,
  open,
  onOpenChange,
}: {
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const t = useT();
  const meta = [
    team.format === "doubles"
      ? t("calc.formatDoubles")
      : t("calc.formatSingles"),
    t("publicProfile.pokemonCount", { n: team.members.length }),
  ].join(" · ");
  const cardContent: ShareCardContent = {
    kind: "team",
    eyebrow: meta,
    heading: displayTeamName(team.name),
    body: null,
    stat: null,
    species: team.members.map((member) => member.species),
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={
          desktop
            ? "w-full overflow-y-auto p-0 sm:max-w-md"
            : "max-h-[85dvh] overflow-y-auto"
        }
      >
        <SheetHeader>
          <SheetTitle className="min-w-0 truncate">
            {displayTeamName(team.name)}
          </SheetTitle>
          <SheetDescription>{meta}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 px-4 pb-4">
          {team.gameTeamId ? <TeamIdChip id={team.gameTeamId} /> : null}
          <TeamPreview team={team} variant="expanded" />
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to={`/teams/${team.id}`}>{t("teams.open")}</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={team.members.length === 0}
              onClick={() =>
                navigate("/calc", { state: { attacker: team.members[0] } })
              }
            >
              <ExternalLinkIcon aria-hidden />
              {t("teams.sendToCalc")}
            </Button>
            <ShareButton
              title={displayTeamName(team.name)}
              text={
                team.gameTeamId
                  ? t("teams.gameIdShareText", { id: team.gameTeamId })
                  : undefined
              }
              url={`${window.location.origin}/teams/${team.id}`}
              size="sm"
              variant="outline"
            />
            <SaveImageButton content={cardContent} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void navigate(`/teams/${team.id}/print`)}
            >
              <PrinterIcon aria-hidden />
              {t("teams.printTeamSheet")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
