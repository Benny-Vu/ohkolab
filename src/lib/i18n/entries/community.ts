/**
 * The community dictionary: home, feed, posts, groups, notifications,
 * moderation, account, profile and feedback, plus the shared date and
 * relative-time phrasing. Owned by the lead; the Japanese side must keep
 * exactly the same keys (the parity test enforces it). The strings land
 * feature by feature while Part C (lead half) moves the visible text into
 * this file.
 */

export const communityEn = {
  // Relative times and dates (the feed, notifications, profile headers).
  "relative.justNow": "just now",
  "relative.minutesAgo": "{n}m ago",
  "relative.hoursAgo": "{n}h ago",
  "relative.daysAgo": "{n}d ago",
  "relative.weeksAgo": "{n}w ago",
  "relative.dateThisYear": "{month} {day}",
  "relative.dateWithYear": "{month} {day}, {year}",
  "profile.joined": "Joined {date}",

  // Legal pages: the notice shown above the Japanese versions (the English
  // versions stay binding). The key is only rendered in the ja locale.
  "legal.japaneseNotice":
    "日本語版は参考訳です。正式な内容は英語版に準じます。",
  "legal.onThisPage": "On this page",

  // Account deletion page: the link in the profile Danger zone.
  "legal.deleteDetailsLink": "What is deleted with your account",

  // Privacy page: the browser-storage list gains the language choice.
  "privacy.languageChoice": "your language choice",

  // Notifications: sentences and row actions. The sentence follows the
  // actor's name, so the Japanese phrases begin with the subject particle.
  "notifications.someone": "Someone",
  "notifications.like": "liked your post",
  "notifications.comment": "commented on your post",
  "notifications.follow": "followed you",
  "notifications.appeal": "reviewed your appeal",
  "notifications.groupInvite": "invited you to {group}",
  "notifications.groupInviteUnnamed": "invited you to a group",
  "notifications.moderationPost": "removed your post: {reason}",
  "notifications.moderationComment": "removed your comment: {reason}",
  "notifications.moderationSuspend": "suspended your account: {reason}",
  "notifications.moderationGeneric": "took a moderation action",
  "notifications.default": "sent you a notification",
  "notifications.markRead": "Mark {name}'s notification as read",
  "notifications.delete": "Delete notification from {name}",

  // Notifications page.
  "notifications.description":
    "Likes, comments, follows and moderation updates.",
  "notifications.markAllAsRead": "Mark all as read",
  "notifications.markedRead": "Notification marked as read",
  "notifications.allMarkedRead": "All notifications marked as read",
  "notifications.deletedToast": "Notification deleted",
  "notifications.signedOutTitle": "Sign in to see your notifications",
  "notifications.signedOutDescription":
    "Likes, comments, follows and moderation updates show up here.",
  "notifications.loadingAria": "Loading notifications",
  "notifications.errorTitle": "Could not load notifications",
  "notifications.emptyTitle": "No notifications yet",
  "notifications.emptyDescription":
    "When someone likes your post or follows you, it shows up here.",
  "notifications.loadMore": "Load more",

  // The push opt-in card (native app only, behind VITE_PUSH).
  "notifications.pushTitle": "Turn on notifications",
  "notifications.pushDescription":
    "Get a push on this device when someone likes or comments on your posts, follows you, invites you to a group or sends you a message.",
  "notifications.pushTurnOn": "Turn on",
  "notifications.pushOnToast": "Notifications are on.",
  "notifications.pushDeniedTitle": "Notifications are off",
  "notifications.pushDeniedDescription":
    "OHKOLab notifications are turned off in your device settings. Turn them on there to get pushes.",
  "notifications.pushFailedToast":
    "Notifications could not be turned on. Try again later.",

  // The post composer.
  "composer.aria": "Write a post",
  "composer.placeholder": "Share a team, a result or a question…",
  "composer.post": "Post",
  "composer.noAttachment": "No attachment",
  "composer.attachTeam": "Attach a team",
  "composer.chooseImages": "Choose images",
  "composer.addImages": "Add images",
  "composer.imagesToAttach": "Images to attach",
  "composer.describeImage": "Describe image {n}",
  "composer.addDescription": "Add description (optional)",
  "composer.moveLeft": "Move image {n} left",
  "composer.moveRight": "Move image {n} right",
  "composer.removeImage": "Remove image {n}",
  "composer.imageAlt": "Image {n}",
  "composer.attachedTeamSr": "Attached team: {name}",
  "composer.attachedTeam": 'Team "{name}" will be attached to this post.',
  "composer.posted": "Posted.",
  "composer.postedImages":
    "Posted. Your images will appear once they have been checked.",
  "composer.imageChecking":
    "An image is still being checked — it will appear once it is approved.",
  "composer.tooManyImages": "A post can have at most {n} images.",

  // Image preparation failures (src/lib/social/images.ts).
  "social.images.tooBig": "Images must be under 15 MB. Pick a smaller file.",
  "social.images.notImage": "That file is not an image.",
  "social.images.unreadable": "That file could not be read as an image.",
  "social.images.unconvertible":
    "This image could not be converted. Try another one.",
  "social.images.noCanvas":
    "Your browser could not process this image. Try another one.",
  "social.images.tooMany": "A post can have at most {n} images.",
  "social.images.screenRetryFailed":
    "The image could not be checked. Try again in a moment.",
  "social.images.removeFailed":
    "That image could not be removed. Try again in a moment.",

  // The post card (feed, profiles, post page).
  "postCard.copiedTeam": 'Copied "{name}" to your teams.',
  "postCard.updatedToast": "Post updated.",
  "postCard.deletedToast": "Post deleted.",
  "postCard.blockedToast": "Blocked @{name}.",
  "postCard.enterReason": "Enter a reason for the removal.",
  "postCard.removedToast": "Post removed.",
  "postCard.editAria": "Edit post",
  "postCard.copyTeam": "Copy to my teams",
  "postCard.openInCalc": "Open in calc",
  "postCard.vs": "{a} vs {b}",
  "postCard.damageRange": "{min}-{max} damage",
  "postCard.unlike": "Unlike",
  "postCard.like": "Like",
  "postCard.commentAriaOne": "{n} comment",
  "postCard.commentAriaMany": "{n} comments",
  "postCard.options": "Post options",
  "postCard.reportPost": "Report post",
  "postCard.blockUser": "Block @{name}",
  "postCard.removeFromGroup": "Remove from group",
  "postCard.removePost": "Remove post",
  "postCard.removeTitle": "Remove this post?",
  "postCard.removeDescription":
    "The post is removed for everyone and the author is notified with your reason.",
  "postCard.reason": "Reason for the removal",
  "postCard.deleteTitle": "Delete post?",
  "postCard.deleteDescription":
    "This cannot be undone. The post and its comments will be removed.",
  "postCard.blockTitle": "Block @{name}?",
  "postCard.blockDescription":
    "You will no longer see their posts in your Following feed. You can unblock them from your account page.",
  "postCard.block": "Block",

  // The report dialog (posts, comments, profiles).
  "report.title": "Report {target}",
  "report.description":
    "Tell us what is wrong. Moderators review every report.",
  "report.signedOutDescription":
    "You need an account to report directly. You can also send the report to the moderators by email.",
  "report.byEmail": "Report by email",
  "report.reasonLabel": "Reason",
  "report.reasonAria": "Report reason",
  "report.chooseReasonPlaceholder": "Choose a reason",
  "report.chooseReasonError": "Choose a reason for the report.",
  "report.detailsLabel": "Details (optional)",
  "report.detailsPlaceholder":
    "Anything that helps moderators understand the report.",
  "report.submit": "Submit report",
  "report.sent": "Report sent. Our moderators will take a look.",
  "report.reasonSpam": "Spam",
  "report.reasonHarassment": "Harassment or bullying",
  "report.reasonInappropriate": "Inappropriate content",
  "report.reasonOther": "Something else",
  "report.targetPost": "post",
  "report.targetComment": "comment",
  "report.targetProfile": "profile",
  "report.emailSubjectPost": "Report a post",
  "report.emailSubjectComment": "Report a comment",
  "report.emailSubjectProfile": "Report a profile",

  // Post images: grid, statuses and the lightbox.
  "postImages.gridLabel": "Post images",
  "postImages.open": "Open image {n}",
  "postImages.checking": "Checking image…",
  "postImages.checkFailed": "Couldn't check this image.",
  "postImages.stale": "This image couldn't be checked.",
  "postImages.removeImage": "Remove image",
  "postImages.removed": "Image removed by automatic screening.",
  "postImages.seeNotice": "See the notice",
  "image.lightboxTitle": "Image",
  "image.closeImage": "Close image",
  "image.postImage": "Post image",

  // Home: the signed-out tools intro and the feed.
  "home.introTagline":
    "Tools and community for Pokémon Champions: calculate damage, build teams and follow the metagame.",
  "home.calcTitle": "Damage calculator",
  "home.calcDescription":
    "Check damage ranges and KO chances with Champions mechanics.",
  "home.teamsTitle": "Team builder",
  "home.teamsDescription":
    "Build a team of six, check its type coverage and export it.",
  "home.metaTitle": "Metagame",
  "home.metaDescription":
    "Usage, common sets and speed tiers for singles and doubles.",
  "home.signedOutIntro":
    "A community for Pokémon Champions players. Share teams, talk strategy and follow the trainers you rate.",
  "home.feedAria": "Feed",
  "home.latest": "Latest",
  "home.following": "Following",
  "home.groups": "Groups",
  "home.emptyLatestTitle": "No posts yet",
  "home.emptyLatestDescription": "Be the first to post.",
  "home.emptyFollowingTitle": "No posts from people you follow yet",
  "home.signInToFollow": "Sign in to see posts from trainers you follow",
  "home.yourGroups": "Your groups",
  "home.signInToJoinGroups": "Sign in to join groups",
  "home.noGroupsYet": "No groups yet",
  "home.loadingPosts": "Loading posts",
  "home.feedErrorTitle": "Could not load the feed",
  "home.groupsLoadError": "Could not load your groups",

  // The post page and its comments.
  "postDetail.title": "Post",
  "postDetail.loadingAria": "Loading post",
  "postDetail.errorTitle": "Could not load post",
  "postDetail.commentPosted": "Comment posted",
  "postDetail.commentDeleted": "Comment deleted",
  "postDetail.comments": "Comments",
  "postDetail.writeComment": "Write a comment",
  "postDetail.commentPlaceholder": "Add a comment…",
  "postDetail.comment": "Comment",
  "postDetail.joinConversation": "to join the conversation.",
  "postDetail.loadingComments": "Loading comments…",
  "postDetail.noComments": "No comments yet",
  "postDetail.deletedUser": "Deleted user",
  "postDetail.report": "Report",
  "postDetail.commentsError": "Could not load comments",

  // Groups: the group page, members and settings.
  "groups.loadingAria": "Loading group",
  "groups.notFoundTitle": "Group not found",
  "groups.notFoundDescription": "This group does not exist or is not visible.",
  "groups.browse": "Browse groups",
  "groups.inviteOnly": "Invite only",
  "groups.publicBadge": "Public",
  "groups.membersLabel": "Members",
  "groups.memberCountOne": "{n} member",
  "groups.memberCountMany": "{n} members",
  "groups.invitedTitle": "You have been invited",
  "groups.invitedDescription": "Accept to see the feed and post.",
  "groups.inviteOnlyTitle": "Invite only",
  "groups.inviteOnlyDescription":
    "This group is invite-only. Ask a moderator for an invitation.",
  "groups.membersOnlyTitle": "Members only",
  "groups.membersOnlyDescription": "Join this group to see the feed and post.",
  "groups.signInToJoin": "Sign in to join",
  "groups.youOwn": "You own this group",
  "groups.invitedBadge": "Invited",
  "groups.joinedToast": "Joined the group",
  "groups.accept": "Accept",
  "groups.decline": "Decline",
  "groups.declinedToast": "Invitation declined",
  "groups.leftToast": "You left the group",
  "groups.leave": "Leave",
  "groups.join": "Join",
  "groups.sectionsAria": "Group sections",
  "groups.feed": "Feed",
  "groups.members": "Members",
  "groups.settings": "Settings",
  "groups.feedError": "Could not load the group feed",
  "groups.listError": "Could not load groups",
  "groups.emptyFeedTitle": "No posts yet",
  "groups.emptyFeedDescription": "Start the conversation.",
  "groups.enterUsername": "Enter a username.",
  "groups.inviteSent": "Invitation sent to @{name}",
  "groups.inviteTitle": "Invite a member",
  "groups.inviteDescription":
    "Invite-only and public groups both invite by username.",
  "groups.usernameToInvite": "Username to invite",
  "groups.invite": "Invite",
  "groups.loadingMembers": "Loading members",
  "groups.noMembers": "No members yet",
  "groups.memberFallback": "Member",
  "groups.roleOwner": "Owner",
  "groups.roleModerator": "Moderator",
  "groups.roleMember": "Member",
  "groups.statusInvited": "Invited",
  "groups.demotedToast": "Demoted to member",
  "groups.promotedToast": "Promoted to moderator",
  "groups.makeMember": "Make member",
  "groups.makeModerator": "Make moderator",
  "groups.memberRemovedToast": "Member removed",
  "groups.updatedToast": "Group updated",
  "groups.deletedToast": "Group deleted",
  "groups.settingsTitle": "Group settings",
  "groups.settingsDescription":
    "The address (/g/{slug}) cannot change after creation.",
  "groups.nameLabel": "Name",
  "groups.descriptionLabel": "Description",
  "groups.visibilityLabel": "Visibility",
  "groups.publicOption": "Public — anyone can join and find it",
  "groups.inviteOnlyOption": "Invite only — members join by invitation",
  "groups.changesSaved": "Changes saved",
  "groups.saveChanges": "Save changes",
  "groups.dangerZone": "Danger zone",
  "groups.dangerDescription":
    "Deleting the group removes its feed, posts and members forever. This cannot be undone.",
  "groups.typeSlugToConfirm": "Type the group address to confirm",
  "groups.deleteGroup": "Delete group",

  // Groups home (directory) and the new-group page.
  "groups.homeDescription":
    "Communities for teams, formats and everything Champions.",
  "groups.createGroup": "Create group",
  "groups.sectionsAriaGroups": "Groups sections",
  "groups.myGroups": "My groups",
  "groups.discover": "Discover",
  "groups.noGroupsYetTitle": "No groups yet",
  "groups.noGroupsYetDescription":
    "You have not joined any groups yet. Find one on Discover.",
  "groups.signInToSeeGroups": "Sign in to see your groups",
  "groups.searchAria": "Search groups by name",
  "groups.noPublicGroups": "No public groups yet",
  "groups.noMatchesTitle": "No groups found",
  "groups.createFirst": "Create the first one.",
  "groups.noMatchesDescription": 'No groups match "{query}".',
  "groups.loadingGroups": "Loading groups",
  "groups.noDescription": "No description yet.",
  "groups.signInToCreate": "Sign in to create a group",
  "groups.newCreatedToast": "Group created",
  "groups.newPageDescription":
    "Groups have their own feed, members and moderators.",
  "groups.newCardTitle": "New group",
  "groups.newCardDescription":
    "You will be the owner and can invite members right away.",
  "groups.newNamePlaceholder": "Elite Four Fans",
  "groups.newAddressLabel": "Address",
  "groups.newSlugHint":
    "Lowercase letters, digits and hyphens. 3 to {max} characters. Must be unused.",
  "groups.newDescriptionOptional": "Description (optional)",
  "groups.newDescriptionPlaceholder": "What is this group about?",
  "groups.newVisibilityAria": "Visibility",

  // Group feed: the moderator's remove-post dialog in group-post-list.tsx.
  "groups.removeTitle": "Remove post from group",
  "groups.removeDescription":
    "The post is hidden from the group, the reason is recorded and the author is notified.",
  "groups.reasonLabel": "Reason",
  "groups.reasonPlaceholder": "Why is this post being removed?",
  "groups.removedToast": "Post removed from the group",

  // Group form validation (src/lib/groups/validation.ts).
  "groups.errSlugChoose": "Choose an address for your group.",
  "groups.errSlugMin": "The address must be at least {min} characters.",
  "groups.errSlugMax": "The address must be at most {max} characters.",
  "groups.errSlugPattern":
    "The address can only contain lowercase letters, digits and hyphens.",
  "groups.errNameChoose": "Choose a name for your group.",
  "groups.errNameMax": "Names are limited to {max} characters.",
  "groups.errDescriptionMax": "Descriptions are limited to {max} characters.",
  "groups.errVisibility": "Choose who can join the group.",

  // Social form validation (src/lib/social/validation.ts).
  "social.errPostEmpty": "Write something before posting.",
  "social.errPostMax": "Posts are limited to {max} characters.",
  "social.errCommentEmpty": "Write something before commenting.",
  "social.errCommentMax": "Comments are limited to {max} characters.",
  "social.errDetailsMax": "Details are limited to {max} characters.",
  "social.errTargetChoose": "Choose what you are reporting.",
  "social.errTargetId": "The reported item could not be identified.",
  "social.errModerationReasonEmpty": "Write a reason for this action.",
  "social.errReasonsMax": "Reasons are limited to {max} characters.",
  "social.errSuspensionReasonEmpty": "Write a reason for the suspension.",
  "social.errSuspensionDate": "Choose a valid end date.",
  "social.errSuspensionFuture": "The suspension must end in the future.",
  "social.errAttachmentKind":
    "Attachments must be a team or calculation snapshot.",
  "social.errAttachmentMax": "Attachments are limited to 8 KB.",

  // Admin pages: reports, appeals and the feedback queue (moderator-only).
  "admin.statusOpen": "Open",
  "admin.statusActioned": "Actioned",
  "admin.statusDismissed": "Dismissed",
  "admin.unknownTarget": "Unknown target type.",
  "admin.contentUnavailable": "Content not available.",
  "admin.viewPost": "View post",
  "admin.viewComment": "View comment",
  "admin.viewProfile": "View profile",
  "admin.contentRemoved": "Content already removed.",
  "admin.commentBy": "Comment by {id}",
  "admin.removeContent": "Remove content",
  "admin.removeThis": "Remove this {target}?",
  "admin.removeDescription":
    "The content is removed for everyone, the author is notified with your reason, and the report is marked as actioned.",
  "admin.removalReasonAria": "Reason for the removal",
  "admin.reportDismissedToast": "Report dismissed.",
  "admin.removedActionedToast": "Content removed and report actioned.",
  "admin.suspendedActionedToast": "User suspended and report actioned.",
  "admin.dismiss": "Dismiss",
  "admin.dismissTitle": "Dismiss this report?",
  "admin.dismissDescription":
    "The report stays in the history as dismissed and no action is taken.",
  "admin.dismissReport": "Dismiss report",
  "admin.reporterDetails": "Reporter details: {details}",
  "admin.reportsDescription": "Review reports from the community.",
  "admin.moderationUnavailable": "Moderation is unavailable",
  "admin.moderationUnavailableDescription":
    "Moderation tools need the community features to be configured.",
  "admin.reportStatusAria": "Report status",
  "admin.reportsLoadError": "Reports could not be loaded",
  "admin.loadErrorDescription": "Try again in a moment.",
  "admin.noStatusReports": "No {status} reports.",
  "admin.colReason": "Reason",
  "admin.colTarget": "Target",
  "admin.colReported": "Reported",
  "admin.colActions": "Actions",
  "admin.actionLabel": "Moderation action",
  "admin.removedPost": "Removed post",
  "admin.removedComment": "Removed comment",
  "admin.removedContent": "Removed content",
  "admin.appellantUnavailable":
    "The appellant's profile is no longer available.",
  "admin.appealUpheldToast": "Appeal upheld. The action stands.",
  "admin.appealReversedToast": "Appeal reversed. The action is undone.",
  "admin.uphold": "Uphold",
  "admin.reverse": "Reverse",
  "admin.originalContent": "Original content:",
  "admin.actionUnavailable":
    "The original moderation action is no longer available.",
  "admin.appealMessage": "Appeal message",
  "admin.appealsDescription": "Review appeals against moderation actions.",
  "admin.appealsLoadError": "Appeals could not be loaded",
  "admin.noAppeals": "No open appeals.",
  "admin.colAppellant": "Appellant",
  "admin.colAction": "Action",
  "admin.colFiled": "Filed",
  "admin.colDecision": "Decision",
  "admin.feedbackNew": "New",
  "admin.feedbackSeen": "Seen",
  "admin.feedbackDone": "Done",
  "admin.deletedAccount": "Deleted account",
  "admin.technicalDetails": "Technical details",
  "admin.viewCrash": "View crash in Sentry",
  "admin.feedbackDoneToast": "Feedback marked done.",
  "admin.feedbackSeenToast": "Feedback marked seen.",
  "admin.markSeen": "Mark seen",
  "admin.markDone": "Mark done",
  "admin.feedbackCard": "Feedback",
  "admin.sentAt": "Sent {date} · Status: {status}",
  "admin.feedbackStatusAria": "Feedback status",
  "admin.feedbackLoadError": "Feedback could not be loaded",
  "admin.noStatusFeedback": "No {status} feedback.",
  "admin.feedbackDescription": "Review feedback from the community.",

  // Telemetry switch (the profile settings).
  "feedback.telemetryAria":
    "Share anonymous usage statistics and crash reports",
  "feedback.telemetryBody":
    "Share anonymous usage statistics and crash reports. Usage statistics are cookieless and never include what you write or your teams; crash reports contain only the error and the page it happened on. You can turn this off at any time.",

  // Moderation notice page and suspend dialog.
  "moderation.suspendedTitle": "Your account was suspended",
  "moderation.postRemovedTitle": "Your post was removed",
  "moderation.commentRemovedTitle": "Your comment was removed",
  "moderation.contentRemovedTitle": "Your content was removed",
  "moderation.underReview": "Under review",
  "moderation.appealUpheld": "Appeal upheld",
  "moderation.appealReversed": "Appeal reversed",
  "moderation.yourAppeal": "Your appeal",
  "moderation.filedAt": "Filed {date}",
  "moderation.reviewPending":
    "A moderator will review your appeal and update its status here.",
  "moderation.writeMessage": "Write a message for the moderators.",
  "moderation.appealSubmittedToast": "Appeal submitted.",
  "moderation.appealTitle": "Appeal this decision",
  "moderation.appealDescription":
    "Explain why you think this action was wrong. A moderator will review your appeal.",
  "moderation.appealAria": "Appeal message",
  "moderation.appealPlaceholder": "Why should this decision be reconsidered?",
  "moderation.submitAppeal": "Submit appeal",
  "moderation.reasonLabel": "Reason:",
  "moderation.removedContent": "Removed content",
  "moderation.suspension": "Suspension",
  "moderation.until": "Until {date}",
  "moderation.suspendDescription":
    "Temporarily prevent this user from posting, commenting and interacting. Choose a duration and give a reason; the user is notified and can appeal.",
  "moderation.suspendReasonAria": "Reason for the suspension",
  "moderation.enterSuspendReason": "Enter a reason for the suspension.",
  "moderation.suspendedToast": "User suspended.",
  "moderation.duration1": "1 day",
  "moderation.duration7": "7 days",
  "moderation.duration30": "30 days",
  "moderation.durationPermanent": "Permanent",
  "moderation.noticeLoadError": "Could not load this notice",

  // System pages.
  "system.notFoundBody":
    "There is nothing at this address. It may have moved or never existed.",

  // Browser tab titles the shell does not already own (page-title.ts).
  "pageTitle.notFound": "Page not found",

  // Accessibility pass (quality wave): unread state on notification rows.
  "notifications.unreadSr": "Unread",

  // Image posts (followup wave): a failed images batch inside a post card.
  "social.images.loadError": "Couldn't load this post's images.",

  // Share buttons (share wave): the native sheet, or a copied link.
  "share.share": "Share",
  "share.copiedLink": "Link copied to clipboard.",
  "share.copyFailed": "The link could not be copied.",

  // Direct messages (built but not launched; VITE_DIRECT_MESSAGES).
  "pageTitle.messages": "Messages",
  "messages.title": "Messages",
  "messages.description":
    "Your private conversations with other players. Open someone's profile to start one.",
  "messages.empty": "No conversations yet.",
  "messages.signIn": "Sign in to see your messages.",
  "messages.loadError": "Could not load your messages.",
  "messages.loadingConversationsAria": "Loading conversations",
  "messages.loadingThreadAria": "Loading messages",
  "messages.previewDeleted": "Message deleted",
  "messages.threadUnavailable": "This conversation is no longer available.",
  "messages.composerAria": "Write a message",
  "messages.composerPlaceholder": "Write a message…",
  "messages.send": "Send",
  "messages.tooLong": "Messages are limited to {max} characters.",
  "messages.you": "You",
  "messages.reportButtonAria": "Report this message",
  "messages.targetLabel": "message",
  "messages.messageButton": "Message",
  "messages.settingsTitle": "Who can message me",
  "messages.settingsDescription":
    "Choose who can start a conversation with you. Friends are players you follow who follow you back.",
  "messages.settingsFriends": "Friends (mutual follows)",
  "messages.settingsFollowing": "Only people I follow",
  "messages.settingsNobody": "Nobody",
  "messages.settingsSaved": "Your messaging setting was saved.",
  "messages.settingsAria": "Who can message me",
  "messages.reportedBadge": "Reported",
  "messages.messageBy": "by {name}",
} as const;

export type CommunityKey = keyof typeof communityEn;
