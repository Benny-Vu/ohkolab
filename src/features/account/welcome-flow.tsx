/**
 * The welcome flow: three skippable steps shown after the first sign-up
 * (once the onboarding dialog is done, because it owns the username step):
 * pick a main format and favourite Pokémon, follow a few people, join a
 * group. Every step can be skipped, and finishing or skipping remembers
 * the choice per account in localStorage. The two social steps live in a
 * lazy chunk (welcome-flow-steps.tsx) so the entry bundle stays lean.
 */

import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import type { MainFormat, Profile } from "@/lib/auth/types";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import { socialAvailability } from "@/lib/social/availability";
import { track } from "@/lib/telemetry/analytics";

import { needsOnboarding } from "@/features/account/onboarding";

// The species picker pulls the full dex; load it only when the dialog opens.
const SpeciesPicker = lazy(() =>
  import("@/components/pokemon-editor/species-picker").then((m) => ({
    default: m.SpeciesPicker,
  })),
);
// The follow and join steps pull the social and groups modules.
const WelcomeFlowSteps = lazy(() =>
  import("@/features/account/welcome-flow-steps").then((m) => ({
    default: m.WelcomeFlowSteps,
  })),
);

const WELCOME_KEY_PREFIX = "ohkolab:welcome:";

function welcomeDoneKey(userId: string): string {
  return `${WELCOME_KEY_PREFIX}${userId}`;
}

function isWelcomeDone(key: string): boolean {
  try {
    return localStorage.getItem(key) === "done";
  } catch {
    return false;
  }
}

function markWelcomeDone(key: string): void {
  try {
    localStorage.setItem(key, "done");
  } catch {
    // Storage can be unavailable; the choice holds for this session.
  }
}

type FormatLabelKey =
  | "profile.mainFormatSingles"
  | "profile.mainFormatDoubles"
  | "profile.mainFormatBoth";

const FORMAT_OPTIONS: Array<{ value: MainFormat; labelKey: FormatLabelKey }> = [
  { value: "singles", labelKey: "profile.mainFormatSingles" },
  { value: "doubles", labelKey: "profile.mainFormatDoubles" },
  { value: "both", labelKey: "profile.mainFormatBoth" },
];

/**
 * Mounted once in the app layout. Renders the flow only for a signed-in
 * player who has chosen a username, while the social layer is ready, and
 * until they finish or skip it.
 */
export function WelcomeFlow() {
  const auth = useAuth();
  const profile = auth.profile;
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || auth.loading || !profile) return null;
  // The onboarding dialog owns the trainer_… username step; the welcome
  // flow starts right after it. (The id is read before the predicate call:
  // needsOnboarding's false-branch narrows Profile to never.)
  const profileId = profile.id;
  const welcomeDone = isWelcomeDone(welcomeDoneKey(profileId));
  if (needsOnboarding(profile) || welcomeDone) return null;
  if (socialAvailability() !== "ready") return null;

  return (
    <WelcomeFlowDialog
      key={profileId}
      profile={profile}
      onClose={() => setDismissed(true)}
    />
  );
}

function WelcomeFlowDialog({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const auth = useAuth();
  const t = useT();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [mainFormat, setMainFormat] = useState<MainFormat | null>(
    profile.mainFormat,
  );
  const [favouriteSpecies, setFavouriteSpecies] = useState<string | null>(
    profile.favouriteSpecies,
  );

  const lastStep = step === 2;

  const close = (completed: boolean) => {
    markWelcomeDone(welcomeDoneKey(profile.id));
    track(completed ? "welcome_completed" : "welcome_skipped");
    onClose();
  };

  async function next() {
    if (step === 0) {
      // Save the picked profile bits before moving on; both are optional,
      // so an untouched step just moves on.
      if (mainFormat !== profile.mainFormat || favouriteSpecies !== null) {
        setSaving(true);
        const result = await auth.updateProfile({
          mainFormat,
          favouriteSpecies,
        });
        setSaving(false);
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
      }
      setStep(1);
      return;
    }
    if (lastStep) {
      close(true);
      return;
    }
    setStep(step + 1);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("welcome.title")}</DialogTitle>
          <DialogDescription>
            {step === 0
              ? t("welcome.profileDescription")
              : step === 1
                ? t("welcome.followDescription")
                : t("welcome.joinDescription")}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          {t("welcome.stepOf", { n: step + 1, total: 3 })}
        </p>

        {step === 0 ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">
                {t("profile.mainFormatLabel")}
              </span>
              <SegmentedControl
                aria-label={t("profile.mainFormatLabel")}
                value={mainFormat ?? ""}
                onValueChange={(value) => {
                  const option = FORMAT_OPTIONS.find(
                    (candidate) => candidate.value === value,
                  );
                  setMainFormat(option ? option.value : null);
                }}
                options={FORMAT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: t(option.labelKey),
                }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="welcome-favourite">
                {t("profile.favouriteSpecies")}
              </Label>
              <Suspense fallback={<Skeleton className="h-8 w-full" />}>
                <SpeciesPicker
                  id="welcome-favourite"
                  value={favouriteSpecies}
                  onChange={(species) => setFavouriteSpecies(species)}
                  placeholder={t("pokemonEditor.chooseSpecies")}
                />
              </Suspense>
            </div>
          </div>
        ) : (
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <WelcomeFlowSteps step={(step === 1 ? 1 : 2) as 1 | 2} />
          </Suspense>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => close(false)}>
            {t("onboarding.skip")}
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                {t("common.back")}
              </Button>
            )}
            <Button type="button" onClick={() => void next()} disabled={saving}>
              {lastStep ? t("common.done") : t("welcome.next")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
