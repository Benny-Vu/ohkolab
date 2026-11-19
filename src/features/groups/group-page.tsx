import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  CheckIcon,
  LoaderCircleIcon,
  LogInIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Page } from "@/components/page";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SegmentedControl } from "@/components/segmented-control";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/use-auth";
import { useT } from "@/lib/i18n/t";
import type { TranslationKey } from "@/lib/i18n/en";
import {
  useAcceptInvite,
  useDeclineInvite,
  useDeleteGroup,
  useInviteMember,
  useJoinGroup,
  useLeaveGroup,
  useRemoveMember,
  useSetMemberRole,
  useUpdateGroup,
} from "@/lib/groups/mutations";
import {
  useGroupBySlug,
  useGroupMemberCount,
  useGroupMembers,
  useMyGroupMembership,
  type GroupMember,
} from "@/lib/groups/queries";
import { useGroupFeed } from "@/lib/social/queries";
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  canModerateGroup,
  normalizeGroupDescription,
  normalizeGroupName,
  validateGroupDescription,
  validateGroupName,
  type GroupVisibility,
} from "@/lib/groups/validation";
import { Composer } from "@/features/feed/composer";
import { GroupPostList } from "@/features/groups/group-post-list";
import { track } from "@/lib/telemetry/analytics";

/**
 * One group: header with membership actions, then the feed, members and (for
 * the owner) settings. Invite-only groups show only the header to
 * non-members.
 */
export function GroupPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const groupQuery = useGroupBySlug(slug ?? "");

  if (groupQuery.isPending) {
    return (
      <Page title={t("groups.loadingAria")}>
        <div
          className="grid gap-3"
          role="status"
          aria-label={t("groups.loadingAria")}
        >
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </Page>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <Page title={t("groups.notFoundTitle")} width="narrow">
        <EmptyState
          title={t("groups.notFoundTitle")}
          description={t("groups.notFoundDescription")}
          action={
            <Button asChild size="sm">
              <Link to="/groups">{t("groups.browse")}</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  return <GroupDetail slug={groupQuery.data.slug} />;
}

function GroupDetail({ slug }: { slug: string }) {
  const { user } = useAuth();
  const t = useT();
  const groupQuery = useGroupBySlug(slug);
  const groupId = groupQuery.data?.id ?? "";
  const membershipQuery = useMyGroupMembership(user ? groupId : "");
  const countQuery = useGroupMemberCount(groupId);

  const group = groupQuery.data;
  if (!group) return null;

  const membership = membershipQuery.data ?? null;
  const isActiveMember = membership?.status === "active";
  const isInvited = membership?.status === "invited";
  const canModerate = canModerateGroup(membership?.role ?? null);
  const memberCount = countQuery.data ?? null;
  const isOwner = user?.id === group.ownerId;

  return (
    <Page
      title={group.name}
      description={group.description ?? undefined}
      actions={
        <MembershipActions
          slug={slug}
          groupId={group.id}
          visibility={group.visibility}
          isActiveMember={isActiveMember}
          isInvited={isInvited}
          isOwner={isOwner}
        />
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {group.visibility === "invite_only"
            ? t("groups.inviteOnly")
            : t("groups.publicBadge")}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {memberCount === null
            ? t("groups.membersLabel")
            : t(
                memberCount === 1
                  ? "groups.memberCountOne"
                  : "groups.memberCountMany",
                { n: memberCount },
              )}
        </span>
      </div>

      {isActiveMember ? (
        <GroupTabs
          groupId={group.id}
          slug={slug}
          ownerId={group.ownerId}
          canModerate={canModerate}
        />
      ) : isInvited ? (
        <EmptyState
          title={t("groups.invitedTitle")}
          description={t("groups.invitedDescription")}
        />
      ) : group.visibility === "invite_only" ? (
        <EmptyState
          title={t("groups.inviteOnlyTitle")}
          description={t("groups.inviteOnlyDescription")}
        />
      ) : (
        <EmptyState
          title={t("groups.membersOnlyTitle")}
          description={t("groups.membersOnlyDescription")}
        />
      )}
    </Page>
  );
}

interface MembershipActionsProps {
  slug: string;
  groupId: string;
  visibility: GroupVisibility;
  isActiveMember: boolean;
  isInvited: boolean;
  isOwner: boolean;
}

function MembershipActions({
  slug,
  groupId,
  visibility,
  isActiveMember,
  isInvited,
  isOwner,
}: MembershipActionsProps) {
  const { user } = useAuth();
  const t = useT();
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();

  if (!user) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to={`/login?returnTo=/g/${slug}`}>
          <LogInIcon aria-hidden />
          {t("groups.signInToJoin")}
        </Link>
      </Button>
    );
  }

  if (isOwner) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <ShieldCheckIcon className="size-4" aria-hidden />
        {t("groups.youOwn")}
      </span>
    );
  }

  if (isInvited) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("groups.invitedBadge")}
        </span>
        <Button
          size="sm"
          onClick={async () => {
            const result = await acceptInvite.mutateAsync({ groupId });
            if (result.ok) toast.success(t("groups.joinedToast"));
            else toast.error(result.error.message);
          }}
          disabled={acceptInvite.isPending}
        >
          <CheckIcon aria-hidden />
          {t("groups.accept")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const result = await declineInvite.mutateAsync({ groupId });
            if (result.ok) toast(t("groups.declinedToast"));
            else toast.error(result.error.message);
          }}
          disabled={declineInvite.isPending}
        >
          <XIcon aria-hidden />
          {t("groups.decline")}
        </Button>
      </div>
    );
  }

  if (isActiveMember) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          const result = await leaveGroup.mutateAsync({ groupId });
          if (result.ok) toast(t("groups.leftToast"));
          else toast.error(result.error.message);
        }}
        disabled={leaveGroup.isPending}
      >
        <UserMinusIcon aria-hidden />
        {t("groups.leave")}
      </Button>
    );
  }

  if (visibility !== "public") {
    return null;
  }

  return (
    <Button
      size="sm"
      onClick={async () => {
        const result = await joinGroup.mutateAsync({ groupId });
        if (result.ok) {
          toast.success(t("groups.joinedToast"));
          track("group_joined", { visibility });
        } else {
          toast.error(result.error.message);
        }
      }}
      disabled={joinGroup.isPending}
    >
      <UserPlusIcon aria-hidden />
      {t("groups.join")}
    </Button>
  );
}

interface GroupTabsProps {
  groupId: string;
  slug: string;
  ownerId: string;
  canModerate: boolean;
}

function GroupTabs({ groupId, slug, ownerId, canModerate }: GroupTabsProps) {
  const { user } = useAuth();
  const t = useT();
  const isOwner = user?.id === ownerId;
  const [tab, setTab] = useState<"feed" | "members" | "settings">("feed");

  const options = [
    { value: "feed", label: t("groups.feed") },
    { value: "members", label: t("groups.members") },
    ...(isOwner ? [{ value: "settings", label: t("groups.settings") }] : []),
  ];

  return (
    <div>
      <SegmentedControl
        aria-label={t("groups.sectionsAria")}
        options={options}
        value={tab}
        onValueChange={(value) =>
          setTab(value as "feed" | "members" | "settings")
        }
      />

      <div className="mt-4">
        {tab === "feed" && (
          <GroupFeedTab groupId={groupId} canModerate={canModerate} />
        )}
        {tab === "members" && (
          <MembersTab groupId={groupId} canModerate={canModerate} />
        )}
        {tab === "settings" && isOwner && (
          <SettingsTab groupId={groupId} slug={slug} />
        )}
      </div>
    </div>
  );
}

function GroupFeedTab({
  groupId,
  canModerate,
}: {
  groupId: string;
  canModerate: boolean;
}) {
  const { user } = useAuth();
  const t = useT();
  const feed = useGroupFeed(groupId);

  if (feed.isPending) {
    return (
      <div
        className="grid gap-3"
        role="status"
        aria-label={t("home.loadingPosts")}
      >
        <Skeleton className="h-28 w-full rounded-md" />
        <Skeleton className="h-28 w-full rounded-md" />
        <Skeleton className="h-28 w-full rounded-md" />
      </div>
    );
  }

  if (feed.isError) {
    return (
      <ErrorState
        title={t("groups.feedError")}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void feed.refetch()}
          >
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const posts = feed.data?.pages.flat() ?? [];

  return (
    <div className="grid gap-4">
      {user && <Composer groupId={groupId} />}
      {posts.length === 0 ? (
        <EmptyState
          title={t("groups.emptyFeedTitle")}
          description={t("groups.emptyFeedDescription")}
        />
      ) : (
        <GroupPostList posts={posts} canModerate={canModerate} />
      )}
      {feed.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
        >
          {feed.isFetchingNextPage
            ? t("common.loading")
            : t("notifications.loadMore")}
        </Button>
      )}
    </div>
  );
}

function MembersTab({
  groupId,
  canModerate,
}: {
  groupId: string;
  canModerate: boolean;
}) {
  const { user } = useAuth();
  const t = useT();
  const membersQuery = useGroupMembers(groupId);
  const inviteMember = useInviteMember();
  const setMemberRole = useSetMemberRole();
  const removeMember = useRemoveMember();
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const members = membersQuery.data ?? [];

  async function submitInvite() {
    if (inviteMember.isPending) return;
    const trimmed = inviteUsername.trim();
    if (trimmed === "") {
      setInviteError(t("groups.enterUsername"));
      return;
    }
    const result = await inviteMember.mutateAsync({
      groupId,
      username: trimmed,
    });
    if (result.ok) {
      toast.success(t("groups.inviteSent", { name: trimmed }));
      setInviteUsername("");
      setInviteError(null);
    } else {
      setInviteError(result.error.message);
    }
  }

  return (
    <div className="grid gap-4">
      {canModerate && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("groups.inviteTitle")}</CardTitle>
            <CardDescription>{t("groups.inviteDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="flex gap-2">
              <Input
                aria-label={t("groups.usernameToInvite")}
                placeholder="username"
                value={inviteUsername}
                aria-invalid={inviteError ? true : undefined}
                aria-describedby={inviteError ? "invite-error" : undefined}
                onChange={(event) => {
                  setInviteUsername(event.target.value);
                  setInviteError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitInvite();
                }}
              />
              <Button
                size="sm"
                onClick={submitInvite}
                disabled={inviteMember.isPending}
              >
                {inviteMember.isPending ? (
                  <LoaderCircleIcon className="animate-spin" aria-hidden />
                ) : (
                  <UserPlusIcon aria-hidden />
                )}
                {t("groups.invite")}
              </Button>
            </div>
            {inviteError && (
              <p
                id="invite-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {inviteError}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {membersQuery.isPending ? (
        <div
          className="grid gap-3"
          role="status"
          aria-label={t("groups.loadingMembers")}
        >
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState title={t("groups.noMembers")} />
      ) : (
        <ul className="grid gap-3">
          {members.map((member) => (
            <li key={member.userId}>
              <MemberRow
                member={member}
                groupId={groupId}
                isSelf={user?.id === member.userId}
                canModerate={canModerate}
                onSetRole={setMemberRole}
                onRemove={removeMember}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface MemberRowProps {
  member: GroupMember;
  groupId: string;
  isSelf: boolean;
  canModerate: boolean;
  onSetRole: ReturnType<typeof useSetMemberRole>;
  onRemove: ReturnType<typeof useRemoveMember>;
}

function MemberRow({
  member,
  groupId,
  isSelf,
  canModerate,
  onSetRole,
  onRemove,
}: MemberRowProps) {
  const t = useT();
  const canChangeRole =
    canModerate &&
    !isSelf &&
    member.role !== "owner" &&
    member.status === "active";
  const canRemove = canModerate && !isSelf && member.role !== "owner";
  const roleLabels: Record<string, TranslationKey> = {
    owner: "groups.roleOwner",
    moderator: "groups.roleModerator",
    member: "groups.roleMember",
  };

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar
            username={member.profile?.username ?? member.userId}
            displayName={member.profile?.displayName ?? null}
            avatarSpecies={member.profile?.avatarSpecies ?? null}
            size="sm"
          />
          <Link
            to={`/u/${member.profile?.username ?? member.userId}`}
            className="truncate font-medium hover:underline"
          >
            {member.profile?.displayName ??
              member.profile?.username ??
              t("groups.memberFallback")}
          </Link>
          <Badge variant="outline" className="capitalize">
            {t(roleLabels[member.role] ?? "groups.roleMember")}
          </Badge>
          {member.status !== "active" && (
            <Badge variant="secondary" className="capitalize">
              {t("groups.statusInvited")}
            </Badge>
          )}
        </div>
        {canChangeRole && (
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={async () => {
                const result = await onSetRole.mutateAsync({
                  groupId,
                  userId: member.userId,
                  role: member.role === "moderator" ? "member" : "moderator",
                });
                if (result.ok)
                  toast.success(
                    member.role === "moderator"
                      ? t("groups.demotedToast")
                      : t("groups.promotedToast"),
                  );
                else toast.error(result.error.message);
              }}
              disabled={onSetRole.isPending}
            >
              <ShieldCheckIcon aria-hidden />
              {member.role === "moderator"
                ? t("groups.makeMember")
                : t("groups.makeModerator")}
            </Button>
            {canRemove && (
              <Button
                size="xs"
                variant="destructive"
                onClick={async () => {
                  const result = await onRemove.mutateAsync({
                    groupId,
                    userId: member.userId,
                  });
                  if (result.ok) toast(t("groups.memberRemovedToast"));
                  else toast.error(result.error.message);
                }}
                disabled={onRemove.isPending}
              >
                <UserMinusIcon aria-hidden />
                {t("common.remove")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ groupId, slug }: { groupId: string; slug: string }) {
  const t = useT();
  const groupQuery = useGroupBySlug(slug);
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const navigate = useNavigate();
  const group = groupQuery.data;
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [visibility, setVisibility] = useState<GroupVisibility>(
    group?.visibility ?? "public",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!group) return null;

  const nameError = validateGroupName(normalizeGroupName(name));
  const descriptionError = validateGroupDescription(
    normalizeGroupDescription(description),
  );
  const canSave =
    nameError === null && descriptionError === null && !updateGroup.isPending;
  const canDelete = confirmSlug.trim() === group.slug && !deleteGroup.isPending;

  async function save() {
    if (!canSave) {
      setError(nameError ?? descriptionError);
      return;
    }
    const result = await updateGroup.mutateAsync({
      groupId,
      name,
      description,
      visibility,
    });
    if (result.ok) {
      toast.success(t("groups.updatedToast"));
      setError(null);
      setSaved(true);
    } else {
      setError(result.error.message);
    }
  }

  const deleteTheGroup = async () => {
    if (!canDelete) return;
    const result = await deleteGroup.mutateAsync({
      groupId,
      slug: group.slug,
    });
    if (result.ok) {
      toast(t("groups.deletedToast"));
      void navigate("/groups");
    } else {
      setDeleteError(result.error.message);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("groups.settingsTitle")}</CardTitle>
          <CardDescription>
            {t("groups.settingsDescription", { slug: group.slug })}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="settings-name">{t("groups.nameLabel")}</Label>
            <Input
              id="settings-name"
              value={name}
              maxLength={GROUP_NAME_MAX}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="settings-description">
              {t("groups.descriptionLabel")}
            </Label>
            <Textarea
              id="settings-description"
              value={description}
              rows={3}
              maxLength={GROUP_DESCRIPTION_MAX}
              onChange={(event) => {
                setDescription(event.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="settings-visibility">
              {t("groups.visibilityLabel")}
            </Label>
            <Select
              value={visibility}
              onValueChange={(value) => {
                setVisibility(value as GroupVisibility);
                setSaved(false);
              }}
            >
              <SelectTrigger
                id="settings-visibility"
                aria-label={t("groups.visibilityLabel")}
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
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="text-sm text-muted-foreground">
              {t("groups.changesSaved")}
            </p>
          )}
          <div>
            <Button size="sm" onClick={save} disabled={!canSave}>
              {updateGroup.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              {t("groups.saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>{t("groups.dangerZone")}</CardTitle>
          <CardDescription>{t("groups.dangerDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="delete-group-confirm">
              {t("groups.typeSlugToConfirm")}
            </Label>
            <Input
              id="delete-group-confirm"
              value={confirmSlug}
              onChange={(event) => {
                setConfirmSlug(event.target.value);
                setDeleteError(null);
              }}
              placeholder={group.slug}
              autoComplete="off"
              aria-describedby="delete-group-hint"
            />
            <p id="delete-group-hint" className="text-xs text-muted-foreground">
              /g/{group.slug}
            </p>
          </div>
          {deleteError && (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}
          <div>
            <Button
              size="sm"
              variant="destructive"
              onClick={deleteTheGroup}
              disabled={!canDelete}
            >
              {deleteGroup.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              <Trash2Icon aria-hidden />
              {t("groups.deleteGroup")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
