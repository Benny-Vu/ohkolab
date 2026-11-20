import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Page } from "@/components/page";
import { buttonSmTouchClass } from "@/components/touch-targets";
import { NotesPanel } from "@/features/battle/notes-panel";
import { useT } from "@/lib/i18n/t";

/**
 * Battle notes on their own (/calc/battle/notes): the same panel battle mode
 * shows, reachable mid-match without loading the teams — the notes are kept
 * on the device, so this page works with nothing else open.
 */
export function NotesPage() {
  const t = useT();

  return (
    <Page
      title={t("battle.notesTitle")}
      description={t("battle.notesDescription")}
      actions={
        <Button asChild variant="outline" className={buttonSmTouchClass}>
          <Link to="/calc/battle">{t("battle.notesBackToBattle")}</Link>
        </Button>
      }
    >
      <NotesPanel addable />
    </Page>
  );
}
