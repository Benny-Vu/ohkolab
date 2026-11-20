import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/segmented-control";
import {
  buttonSmTouchClass,
  buttonTouchClass,
} from "@/components/touch-targets";
import { Picker } from "@/components/picker";
import { Textarea } from "@/components/ui/textarea";
import { useBattleFormat } from "@/lib/preferences";
import { getLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";
import { useCreateBattleRequest } from "@/lib/battles/mutations";
import type { BattleFormat } from "@/types/battle";
import { useMyPublicTeams } from "@/features/battles/board/use-my-public-teams";

const RULES_MAX = 80;
const NOTE_MAX = 300;

/** The quick-pick chips for the rules line; each inserts its own label. */
const QUICK_PICKS = [
  "battles.chipRegMC",
  "battles.chipBestOf3",
  "battles.chipCasual",
] as const;

/** Maps a raw database error message to a friendly bilingual toast string. */
function createErrorMessage(
  raw: string | undefined,
  t: ReturnType<typeof useT>,
): string {
  if (raw?.includes("Too many open battle requests")) {
    return t("battles.errorTooManyOpen");
  }
  return t("battles.errorGeneric");
}

/**
 * The "New battle request" action and its form: the match rules (with quick
 * picks), an optional note, an optional time window in the requester's own
 * time zone, the language to filter by, and one of the user's public teams.
 * The database re-validates everything; the client checks keep the errors
 * where the typing happens.
 */
export function BattleRequestDialog({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const [defaultFormat] = useBattleFormat();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<BattleFormat>(defaultFormat);
  const [rules, setRules] = useState("");
  const [note, setNote] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [language, setLanguage] = useState<"en" | "ja">(() =>
    getLocale() === "ja" ? "ja" : "en",
  );
  const [teamId, setTeamId] = useState("");
  const [errors, setErrors] = useState<{ rules?: string; window?: string }>({});

  const createRequest = useCreateBattleRequest(client);
  const teamsQuery = useMyPublicTeams(client);
  const teams = teamsQuery.data ?? [];

  function reset() {
    setRules("");
    setNote("");
    setStartsAt("");
    setEndsAt("");
    setTeamId("");
    setErrors({});
  }

  async function submit() {
    const trimmedRules = rules.trim();
    if (trimmedRules === "") {
      setErrors({ rules: t("battles.rulesRequired") });
      return;
    }
    if (trimmedRules.length > RULES_MAX) {
      setErrors({ rules: t("battles.rulesTooLong") });
      return;
    }
    if (startsAt !== "" && endsAt !== "" && endsAt <= startsAt) {
      setErrors({ window: t("battles.windowOrder") });
      return;
    }
    try {
      await createRequest.mutateAsync({
        format,
        rules: trimmedRules,
        note: note.trim() === "" ? null : note.trim(),
        starts_at: startsAt === "" ? null : new Date(startsAt).toISOString(),
        ends_at: endsAt === "" ? null : new Date(endsAt).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language,
        team_id: teamId === "" ? null : teamId,
      });
      toast.success(t("battles.createdToast"));
      reset();
      setOpen(false);
    } catch (mutationError) {
      const message = (mutationError as { message?: string } | null)?.message;
      toast.error(createErrorMessage(message, t));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="accent" className={buttonSmTouchClass}>
          <PlusIcon aria-hidden />
          {t("battles.newRequest")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("battles.newRequest")}</DialogTitle>
          <DialogDescription>
            {t("battles.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t("battles.formatLabel")}</p>
            <SegmentedControl
              aria-label={t("battles.formatLabel")}
              value={format}
              onValueChange={(value) => setFormat(value as BattleFormat)}
              options={[
                { value: "singles", label: t("battles.formatSingles") },
                { value: "doubles", label: t("battles.formatDoubles") },
              ]}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="battle-rules">{t("battles.rulesLabel")}</Label>
            <Input
              id="battle-rules"
              value={rules}
              maxLength={RULES_MAX}
              aria-describedby={errors.rules ? "battle-rules-error" : undefined}
              aria-invalid={errors.rules ? true : undefined}
              placeholder={t("battles.rulesPlaceholder")}
              onChange={(event) => {
                setRules(event.target.value);
                setErrors((current) => ({ ...current, rules: undefined }));
              }}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_PICKS.map((pick) => (
                <Button
                  key={pick}
                  type="button"
                  size="xs"
                  variant="outline"
                  className={buttonSmTouchClass}
                  onClick={() => setRules(t(pick))}
                >
                  {t(pick)}
                </Button>
              ))}
            </div>
            {errors.rules && (
              <p
                id="battle-rules-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.rules}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="battle-note">{t("battles.noteLabel")}</Label>
            <Textarea
              id="battle-note"
              rows={2}
              maxLength={NOTE_MAX}
              placeholder={t("battles.notePlaceholder")}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">
              {t("battles.windowLabel")}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="battle-starts-at">
                  {t("battles.startsAtLabel")}
                </Label>
                <Input
                  id="battle-starts-at"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => {
                    setStartsAt(event.target.value);
                    setErrors((current) => ({ ...current, window: undefined }));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="battle-ends-at">
                  {t("battles.endsAtLabel")}
                </Label>
                <Input
                  id="battle-ends-at"
                  type="datetime-local"
                  value={endsAt}
                  aria-describedby={
                    errors.window ? "battle-window-error" : undefined
                  }
                  aria-invalid={errors.window ? true : undefined}
                  onChange={(event) => {
                    setEndsAt(event.target.value);
                    setErrors((current) => ({ ...current, window: undefined }));
                  }}
                />
              </div>
            </div>
            {errors.window && (
              <p
                id="battle-window-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.window}
              </p>
            )}
          </fieldset>

          <div className="grid gap-2">
            <p className="text-sm font-medium">{t("battles.languageLabel")}</p>
            <SegmentedControl
              aria-label={t("battles.languageLabel")}
              value={language}
              onValueChange={(value) =>
                setLanguage(value === "ja" ? "ja" : "en")
              }
              options={[
                { value: "en", label: t("language.english") },
                { value: "ja", label: t("language.japanese") },
              ]}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="battle-team">{t("battles.teamLabel")}</Label>
            <Picker
              id="battle-team"
              aria-label={t("battles.teamPickerAria")}
              options={[
                { value: "", label: t("battles.noTeam") },
                ...teams.map((team) => ({ value: team.id, label: team.name })),
              ]}
              value={teamId}
              onValueChange={(value) => setTeamId(value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className={buttonTouchClass}
            onClick={() => setOpen(false)}
            disabled={createRequest.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className={buttonTouchClass}
            onClick={() => void submit()}
            loading={createRequest.isPending}
            disabled={createRequest.isPending}
          >
            {t("battles.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
