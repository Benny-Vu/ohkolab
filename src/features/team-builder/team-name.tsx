import { useState } from "react";
import { PencilIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/t";
import { cn } from "@/lib/utils";
import { DEFAULT_TEAM_NAME } from "@/lib/team";

interface TeamNameProps {
  name: string;
  onRename: (name: string) => void;
  className?: string;
}

/**
 * Click-to-edit team name. Unnamed teams show a "Name this team" invite
 * instead of the "Untitled team" placeholder.
 */
export function TeamName({ name, onRename, className }: TeamNameProps) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEditing(): void {
    setDraft(name === DEFAULT_TEAM_NAME ? "" : name);
    setEditing(true);
  }

  function commit(): void {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
  }

  if (editing) {
    return (
      <Input
        aria-label={t("teams.nameLabel")}
        autoFocus
        className={cn("h-7 w-full", className)}
        value={draft}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  const unnamed = name === DEFAULT_TEAM_NAME;
  return (
    <button
      type="button"
      onClick={startEditing}
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-left font-heading text-base font-medium transition-colors hover:text-primary",
        unnamed && "text-muted-foreground",
        className,
      )}
    >
      <span className="truncate">{unnamed ? t("teams.nameThis") : name}</span>
      <PencilIcon className="size-3.5 shrink-0 opacity-60" />
    </button>
  );
}
