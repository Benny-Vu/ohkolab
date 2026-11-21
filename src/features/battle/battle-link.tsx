import { Link } from "react-router";
import { NotebookPenIcon, SwordsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonSmTouchClass } from "@/components/touch-targets";
import { useT } from "@/lib/i18n/t";

/**
 * The one entry-point link to battle mode, shared by the calc page and the
 * team detail page: the same look and label everywhere, so it can be added
 * with a single line wherever a team is in view.
 */
export function BattleModeLink() {
  const t = useT();
  return (
    <Button asChild variant="outline" size="sm" className={buttonSmTouchClass}>
      <Link to="/calc/battle">
        <SwordsIcon aria-hidden />
        {t("battle.link")}
      </Link>
    </Button>
  );
}

/**
 * The entry-point link to the battle notes page, in the same style as the
 * battle mode link it sits next to.
 */
export function NotesLink() {
  const t = useT();
  return (
    <Button asChild variant="outline" size="sm" className={buttonSmTouchClass}>
      <Link to="/notes">
        <NotebookPenIcon aria-hidden />
        {t("nav.notes")}
      </Link>
    </Button>
  );
}
