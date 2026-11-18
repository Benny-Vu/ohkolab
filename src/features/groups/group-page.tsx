import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  CheckIcon,
  ConstructionIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/use-auth";
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
  const groupQuery = useGroupBySlug(slug ?? "");

  if (groupQuery.isPending) {
    return (
      <Page title="Group">
        <div className="grid gap-3" aria-label="Loading group">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Page>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <Page title="Group not found" width="narrow">
        <Card size="sm" className="border-dashed p-6 text-center">
          <ConstructionIcon
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-2 text-sm text-muted-foreground">
            This group does not exist or is not visible.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/groups">Browse groups</Link>
          </Button>
        </Card>
      </Page>
    );
  }

  return <GroupDetail slug={groupQuery.data.slug} />;
}

function GroupDetail({ slug }: { slug: string }) {
  const { user } = useAuth();
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
          {group.visibility === "invite_only" ? "Invite only" : "Public"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {memberCount === null
            ? "Members"
            : `${memberCount} ${memberCount === 1 ? "member" : "members"}`}
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
        <Card size="sm" className="border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            You have been invited to this group. Accept to see the feed and
            post.
          </p>
        </Card>
      ) : group.visibility === "invite_only" ? (
        <Card size="sm" className="border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            This group is invite-only. Ask a moderator for an invitation.
          </p>
        </Card>
      ) : (
        <Card size="sm" className="border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Join this group to see the feed and post.
          </p>
        </Card>
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
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();

  if (!user) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link to={`/login?returnTo=/g/${slug}`}>
          <LogInIcon aria-hidden />
          Sign in to join
        </Link>
      </Button>
    );
  }

  if (isOwner) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <ShieldCheckIcon className="size-4" aria-hidden />
        You own this group
      </span>
    );
  }

  if (isInvited) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Invited</span>
        <Button
          size="sm"
          onClick={async () => {
            const result = await acceptInvite.mutateAsync({ groupId });
            if (result.ok) toast.success("Welcome to the group!");
            else toast.error(result.error.message);
          }}
          disabled={acceptInvite.isPending}
        >
          <CheckIcon aria-hidden />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const result = await declineInvite.mutateAsync({ groupId });
            if (result.ok) toast("Invitation declined.");
            else toast.error(result.error.message);
          }}
          disabled={declineInvite.isPending}
        >
          <XIcon aria-hidden />
          Decline
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
          if (result.ok) toast("You left the group.");
          else toast.error(result.error.message);
        }}
        disabled={leaveGroup.isPending}
      >
        <UserMinusIcon aria-hidden />
        Leave
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
          toast.success("Welcome to the group!");
          track("group_joined", { visibility });
        } else {
          toast.error(result.error.message);
        }
      }}
      disabled={joinGroup.isPending}
    >
      <UserPlusIcon aria-hidden />
      Join
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
  const isOwner = user?.id === ownerId;
  const [tab, setTab] = useState<"feed" | "members" | "settings">("feed");

  return (
    <Tabs
      value={tab}
      onValueChange={(value) =>
        setTab(value as "feed" | "members" | "settings")
      }
    >
      <TabsList>
        <TabsTrigger value="feed">Feed</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
      </TabsList>

      <TabsContent value="feed" className="mt-4">
        <GroupFeedTab groupId={groupId} canModerate={canModerate} />
      </TabsContent>
      <TabsContent value="members" className="mt-4">
        <MembersTab groupId={groupId} canModerate={canModerate} />
      </TabsContent>
      {isOwner && (
        <TabsContent value="settings" className="mt-4">
          <SettingsTab groupId={groupId} slug={slug} />
        </TabsContent>
      )}
    </Tabs>
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
  const feed = useGroupFeed(groupId);

  if (feed.isPending) {
    return (
      <div className="grid gap-3" aria-label="Loading posts">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (feed.isError) {
    return (
      <Card size="sm" className="border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Could not load the group feed.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void feed.refetch()}
        >
          Try again
        </Button>
      </Card>
    );
  }

  const posts = feed.data?.pages.flat() ?? [];

  return (
    <div className="grid gap-4">
      {user && <Composer groupId={groupId} />}
      {posts.length === 0 ? (
        <Card size="sm" className="border-dashed p-6 text-center">
          <ConstructionIcon
            className="mx-auto size-6 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-2 text-sm text-muted-foreground">
            No posts in this group yet. Start the conversation!
          </p>
        </Card>
      ) : (
        <GroupPostList posts={posts} canModerate={canModerate} />
      )}
      {feed.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
        >
          {feed.isFetchingNextPage ? "Loading…" : "Load more"}
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
  const membersQuery = useGroupMembers(groupId);
  const inviteMember = useInviteMember();
  const setMemberRole = useSetMemberRole();
  const removeMember = useRemoveMember();
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const members = membersQuery.data ?? [];

  async function submitInvite() {
    const trimmed = inviteUsername.trim();
    if (trimmed === "") {
      setInviteError("Enter a username.");
      return;
    }
    const result = await inviteMember.mutateAsync({
      groupId,
      username: trimmed,
    });
    if (result.ok) {
      toast.success(`Invitation sent to @${trimmed}.`);
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
            <CardTitle>Invite a member</CardTitle>
            <CardDescription>
              Invite-only and public groups both invite by username.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="flex gap-2">
              <Input
                aria-label="Username to invite"
                placeholder="username"
                value={inviteUsername}
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
                Invite
              </Button>
            </div>
            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {membersQuery.isPending ? (
        <div className="grid gap-3" aria-label="Loading members">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : members.length === 0 ? (
        <Card size="sm" className="border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">No members yet.</p>
        </Card>
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
  const canChangeRole =
    canModerate &&
    !isSelf &&
    member.role !== "owner" &&
    member.status === "active";
  const canRemove = canModerate && !isSelf && member.role !== "owner";

  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to={`/u/${member.profile?.username ?? member.userId}`}
            className="truncate font-medium hover:underline"
          >
            {member.profile?.displayName ??
              member.profile?.username ??
              "Member"}
          </Link>
          <Badge variant="outline" className="capitalize">
            {member.role}
          </Badge>
          {member.status !== "active" && (
            <Badge variant="secondary" className="capitalize">
              {member.status}
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
                      ? "Demoted to member."
                      : "Promoted to moderator.",
                  );
                else toast.error(result.error.message);
              }}
              disabled={onSetRole.isPending}
            >
              <ShieldCheckIcon aria-hidden />
              {member.role === "moderator" ? "Make member" : "Make moderator"}
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
                  if (result.ok) toast("Member removed.");
                  else toast.error(result.error.message);
                }}
                disabled={onRemove.isPending}
              >
                <UserMinusIcon aria-hidden />
                Remove
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsTab({ groupId, slug }: { groupId: string; slug: string }) {
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
      toast.success("Group updated.");
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
      toast("Group deleted.");
      void navigate("/groups");
    } else {
      setDeleteError(result.error.message);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Group settings</CardTitle>
          <CardDescription>
            The address (/g/{group.slug}) cannot change after creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="settings-name">Name</Label>
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
            <Label htmlFor="settings-description">Description</Label>
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
            <Label htmlFor="settings-visibility">Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(value) => {
                setVisibility(value as GroupVisibility);
                setSaved(false);
              }}
            >
              <SelectTrigger id="settings-visibility" aria-label="Visibility">
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
          {saved && (
            <p className="text-sm text-muted-foreground">Changes saved.</p>
          )}
          <div>
            <Button size="sm" onClick={save} disabled={!canSave}>
              {updateGroup.isPending && (
                <LoaderCircleIcon className="animate-spin" aria-hidden />
              )}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Deleting the group removes its feed, posts and members forever. This
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="delete-group-confirm">
              Type the group address to confirm
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
            <p className="text-sm text-destructive">{deleteError}</p>
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
              Delete group
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
