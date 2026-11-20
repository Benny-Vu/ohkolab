import { useState } from "react";
import { toast } from "sonner";

import { buttonTouchClass, rowHitClass } from "@/components/touch-targets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { useT } from "@/lib/i18n/t";
import { supabase, type AppSupabaseClient } from "@/lib/supabase";

import {
  DISMISSED_KEY,
  setBirthDate,
  useBirthDate,
  validateBirthDate,
} from "@/features/account/birth-date";

/**
 * The birth date UI pieces. The logic lives in
 * `@/features/account/birth-date`; everything here renders nothing and
 * queries nothing while VITE_DIRECT_MESSAGES is off.
 */

/**
 * The labelled birth date input with its private-data hint. `onSaved` runs
 * after a successful save.
 */
export function BirthDateField({
  client = supabase,
  onSaved,
}: {
  client?: AppSupabaseClient | null;
  onSaved?: () => void;
}) {
  const t = useT();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!directMessagesEnabled() || !client) return null;

  const handleSave = async () => {
    const problem = value ? validateBirthDate(value, t) : null;
    setError(problem);
    setFormError(null);
    if (problem || !value) return;

    setPending(true);
    const result = await setBirthDate(client, value);
    setPending(false);
    if (result.ok) {
      toast.success(t("birthDate.saved"));
      onSaved?.();
    } else {
      setFormError(result.message ?? t("birthDate.saveFailed"));
    }
  };

  // Not a <form>: it also sits inside the onboarding dialog's form.
  return (
    <div className="grid gap-2">
      <Label htmlFor="birth-date">{t("birthDate.label")}</Label>
      <Input
        id="birth-date"
        type="date"
        value={value}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={error || formError ? true : undefined}
        aria-describedby="birth-date-hint"
      />
      <p id="birth-date-hint" className="text-xs text-muted-foreground">
        {t("birthDate.hint")}
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {formError ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        className={`${rowHitClass} justify-self-start`}
        onClick={() => void handleSave()}
        disabled={pending}
      >
        {t("common.save")}
      </Button>
    </div>
  );
}

/**
 * The one-time prompt for signed-in players who have no birth date yet.
 * Dismissible; a dismissed prompt never returns on its own â€” until they add
 * a birth date they are treated as a minor (friends-only messaging).
 */
export function BirthDatePrompt({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const birthDate = useBirthDate(client);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!directMessagesEnabled()) return null;
  if (dismissed || birthDate.data !== null) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode: just close for this visit.
    }
    setDismissed(true);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("birthDate.promptTitle")}</DialogTitle>
          <DialogDescription>{t("birthDate.promptBody")}</DialogDescription>
        </DialogHeader>
        <BirthDateField
          client={client}
          onSaved={() => {
            void birthDate.refetch();
            dismiss();
          }}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            className={buttonTouchClass}
            onClick={dismiss}
          >
            {t("birthDate.later")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The settings block: the player's own birth date, editable, with the
 * private-data hint.
 */
export function BirthDateSettingsCard({
  client = supabase,
}: {
  client?: AppSupabaseClient | null;
}) {
  const t = useT();
  const birthDate = useBirthDate(client);

  if (!directMessagesEnabled()) return null;

  return (
    <div className="grid gap-2">
      <p className="text-sm">
        <span className="text-muted-foreground">{t("birthDate.label")}: </span>
        {birthDate.data ? (
          <span className="font-medium tabular-nums">{birthDate.data}</span>
        ) : (
          <span className="text-muted-foreground">{t("birthDate.none")}</span>
        )}
      </p>
      <BirthDateField
        client={client}
        onSaved={() => void birthDate.refetch()}
      />
    </div>
  );
}
