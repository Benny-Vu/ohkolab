import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Page } from "@/components/page";
import { buttonSmTouchClass } from "@/components/touch-targets";
import { NotesPanel } from "@/features/battle/notes-panel";
import { useT } from "@/lib/i18n/t";

/**
 * Battle notes on their own (/notes): the same panel battle mode shows,
 * reachable mid-match without loading the teams — the notes are kept on the
 * device, so this page works with nothing else open. Notes are a sibling
 * destination of battle mode, not its child, so the action opens battle
 * mode rather than going "back".
 */
export function NotesPage() {
  const t = useT();

  return (
    <Page
      title={t("battle.notesTitle")}
      description={t("battle.notesDescription")}
      actions={
        <Button asChild variant="outline" className={buttonSmTouchClass}>
          <Link to="/calc/battle">{t("battle.notesOpenBattle")}</Link>
        </Button>
      }
    >
      <NotesPanel addable embeddedInPage />
    </Page>
  );
}
