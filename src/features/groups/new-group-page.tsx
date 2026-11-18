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
import { useCreateGroup } from "@/lib/groups/mutations";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_SLUG_MAX,
  normalizeGroupDescription,
  normalizeGroupName,
  normalizeSlug,
  slugFromName,
  validateGroupDescription,
  validateGroupName,
  validateSlug,
  type GroupVisibility,
} from "@/lib/groups/validation";

/**
 * Create-group form: the address derives from the name until the user edits
 * it directly. On success the user lands on their new group's page.
 */
export function NewGroupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createGroup = useCreateGroup();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<GroupVisibility>("public");
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <Page title="Create a group" width="narrow">
        <EmptyState
          title="Sign in to create a group"
          action={
            <Button asChild size="sm">
              <Link to="/login?returnTo=/groups/new">Sign in</Link>
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
    });
    if (result.ok) {
      toast.success("Group created");
      void navigate(`/g/${result.data.slug}`);
    } else {
      setError(result.error.message);
    }
  }

  return (
    <Page
      title="Create a group"
      description="Groups have their own feed, members and moderators."
      width="narrow"
    >
      <Card>
        <CardHeader>
          <CardTitle>New group</CardTitle>
          <CardDescription>
            You will be the owner and can invite members right away.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="group-name">Name</Label>
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
              placeholder="Elite Four Fans"
            />
            <p className="text-xs text-muted-foreground">
              {name.trim().length}/{GROUP_NAME_MAX}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-slug">Address</Label>
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
              Lowercase letters, digits and hyphens. 3 to {GROUP_SLUG_MAX}{" "}
              characters. Must be unused.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-description">Description (optional)</Label>
            <Textarea
              id="group-description"
              value={description}
              rows={3}
              maxLength={GROUP_DESCRIPTION_MAX}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this group about?"
            />
            <p className="text-xs text-muted-foreground">
              {description.trim().length}/{GROUP_DESCRIPTION_MAX}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="group-visibility">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as GroupVisibility)}
            >
              <SelectTrigger id="group-visibility" aria-label="Visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  Public — anyone can join and find it
                </SelectItem>
                <SelectItem value="invite_only">
                  Invite only — members join by invitation
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-2">
            <Button type="button" onClick={submit} disabled={!canSubmit}>
              {createGroup.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              Create group
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              disabled={createGroup.isPending}
            >
              <Link to="/groups">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}
