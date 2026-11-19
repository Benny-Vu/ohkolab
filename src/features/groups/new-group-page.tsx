import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/use-auth";
import type { TranslationKey } from "@/lib/i18n/en";
import { useT } from "@/lib/i18n/t";
import { useCreateGroup } from "@/lib/groups/mutations";
import {
  GROUP_CATEGORIES,
  GROUP_DESCRIPTION_MAX,
  GROUP_LANGUAGES,
  GROUP_NAME_MAX,
  GROUP_SLUG_MAX,
  normalizeGroupDescription,
  normalizeGroupName,
  normalizeSlug,
  slugFromName,
  validateGroupDescription,
  validateGroupName,
  validateSlug,
  type GroupCategory,
  type GroupLanguage,
  type GroupVisibility,
} from "@/lib/groups/validation";

const CATEGORY_LABELS: Record<GroupCategory, TranslationKey> = {
  doubles: "groups.categoryDoubles",
  singles: "groups.categorySingles",
  team_building: "groups.categoryTeamBuilding",
  regional: "groups.categoryRegional",
};

const LANGUAGE_LABELS: Record<GroupLanguage, TranslationKey> = {
  en: "groups.languageEn",
  ja: "groups.languageJa",
};

const NONE_OPTION = "none";

/**
 * Create-group form: the address derives from the name until the user edits
 * it directly. On success the user lands on their new group's page.
 */
export function NewGroupPage() {
  const { user } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const createGroup = useCreateGroup();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("public");
  const [category, setCategory] = useState<GroupCategory | null>(null);
  const [language, setLanguage] = useState<GroupLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <Page title={t("groups.newTitle")} width="narrow">
        <EmptyState
          title={t("groups.signInToCreate")}
          action={
            <Button asChild size="sm">
              <Link to="/login?returnTo=/groups/new">{t("common.signIn")}</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const normalizedSlug = normalizeSlug(slug);
  const slugError = validateSlug(normalizedSlug);
  const nameError = validateGroupName(normalizeGroupName(name));
  const descriptionError = validateGroupDescription(
    normalizeGroupDescription(description),
  );
  const canSubmit =
    nameError === null &&
    slugError === null &&
    descriptionError === null &&
    !createGroup.isPending;

  async function submit() {
    if (!canSubmit) {
      setError(nameError ?? slugError ?? descriptionError);
      return;
    }
    const result = await createGroup.mutateAsync({
      name,
      slug: normalizedSlug,
      description,
      visibility,
      category,
      language,
    });
    if (result.ok) {
      toast.success(t("groups.newCreatedToast"));
      void navigate(`/g/${result.data.slug}`);
    } else {
      setError(result.error.message);
    }
  }

  return (
    <Page
      title={t("groups.newTitle")}
      description={t("groups.newPageDescription")}
      width="narrow"
    >
      <Card>
        <CardHeader>
          <CardTitle>{t("groups.newCardTitle")}</CardTitle>
          <CardDescription>{t("groups.newCardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="group-name">{t("groups.nameLabel")}</Label>
            <Input
              id="group-name"
              value={name}
              maxLength={GROUP_NAME_MAX}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited) {
                  setSlug(slugFromName(event.target.value));
                }
              }}
              placeholder={t("groups.newNamePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {name.trim().length}/{GROUP_NAME_MAX}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-slug">{t("groups.newAddressLabel")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/g/</span>
              <Input
                id="group-slug"
                value={slug}
                maxLength={GROUP_SLUG_MAX}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.target.value);
                }}
                placeholder="elite-four-fans"
                aria-describedby="group-slug-hint"
              />
            </div>
            <p id="group-slug-hint" className="text-xs text-muted-foreground">
              {t("groups.newSlugHint", { max: GROUP_SLUG_MAX })}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-description">
              {t("groups.newDescriptionOptional")}
            </Label>
            <Textarea
              id="group-description"
              value={description}
              rows={3}
              maxLength={GROUP_DESCRIPTION_MAX}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("groups.newDescriptionPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {description.trim().length}/{GROUP_DESCRIPTION_MAX}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-visibility">
              {t("groups.visibilityLabel")}
            </Label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as GroupVisibility)}
            >
              <SelectTrigger
                id="group-visibility"
                aria-label={t("groups.newVisibilityAria")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  {t("groups.publicOption")}
                </SelectItem>
                <SelectItem value="invite_only">
                  {t("groups.inviteOnlyOption")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-category">
              {t("groups.newCategoryLabel")}
            </Label>
            <Select
              value={category ?? NONE_OPTION}
              onValueChange={(value) =>
                setCategory(
                  value === NONE_OPTION ? null : (value as GroupCategory),
                )
              }
            >
              <SelectTrigger
                id="group-category"
                aria-label={t("groups.newCategoryLabel")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPTION}>
                  {t("groups.newCategoryNone")}
                </SelectItem>
                {GROUP_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(CATEGORY_LABELS[value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-language">
              {t("groups.newLanguageLabel")}
            </Label>
            <Select
              value={language ?? NONE_OPTION}
              onValueChange={(value) =>
                setLanguage(
                  value === NONE_OPTION ? null : (value as GroupLanguage),
                )
              }
            >
              <SelectTrigger
                id="group-language"
                aria-label={t("groups.newLanguageLabel")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_OPTION}>
                  {t("groups.newLanguageNone")}
                </SelectItem>
                {GROUP_LANGUAGES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(LANGUAGE_LABELS[value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p
              id="new-group-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-describedby={error ? "new-group-error" : undefined}
            >
              {createGroup.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              {t("groups.createGroup")}
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              disabled={createGroup.isPending}
            >
              <Link to="/groups">{t("common.cancel")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}
