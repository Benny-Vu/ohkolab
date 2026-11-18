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

  // Legal pages: the Japanese notice shown while only the English versions
  // are official.
  "legal.japaneseNotice":
    "この規約・ポリシーは英語版が正式です。日本語版は準備中です。",

  // Privacy page: the browser-storage list gains the language choice.
  "privacy.languageChoice": "your language choice",

  // Social data-layer errors (mapped Postgres/API failures).
  "social.errors.not_configured":
    "The community feed is not available right now.",
  "social.errors.not_installed":
    "The community feed is not set up yet. Try again later.",
  "social.errors.not_signed_in": "Sign in to use the community feed.",
  "social.errors.rate_limited":
    "You are posting too quickly. Wait a few minutes and try again.",
  "social.errors.suspended": "This account cannot post right now.",
  "social.errors.too_long": "That is too long. Shorten it and try again.",
  "social.errors.not_found": "That is no longer available.",
  "social.errors.forbidden": "You cannot do that.",
  "social.errors.invalid_input": "That input is not valid.",
  "social.errors.network":
    "Could not reach the server. Check your connection and try again.",
  "social.errors.unknown": "Something went wrong. Try again.",

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
  "notifications.title": "Notifications",
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
  "notifications.bellAriaUnread": "Notifications, {badge} unread",

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
  "home.trending": "Trending in doubles",

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
  "groups.homeTitle": "Groups",
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
  "groups.newTitle": "Create a group",
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

  // Feedback dialog, crash screen and telemetry switch.
  "feedback.kindBug": "Bug",
  "feedback.kindIdea": "Idea",
  "feedback.kindOther": "Other",
  "feedback.tooShort": "Tell us a bit more (at least {min} characters).",
  "feedback.tooLong": "Feedback is limited to {max} characters.",
  "feedback.sentToast": "Thanks! Your feedback was sent.",
  "feedback.rateLimited":
    "You have sent a lot of feedback recently. Please try again in an hour.",
  "feedback.description":
    "Tell us what is broken, what is missing, or what you would like to see. We read everything.",
  "feedback.signedOutBody":
    "You need an account to send feedback through the site. You can also email us and we will get back to you.",
  "feedback.emailUs": "Email {email}",
  "feedback.kindAria": "Feedback kind",
  "feedback.placeholder": "What happened? What should we change?",
  "feedback.messageAria": "Your feedback",
  "feedback.includeDetails":
    "Include technical details (page, app version, browser, screen size",
  "feedback.crashIdSuffix": ", crash id",
  "feedback.send": "Send",
  "feedback.sending": "Sending...",
  "feedback.telemetryAria":
    "Share anonymous usage statistics and crash reports",
  "feedback.telemetryBody":
    "Share anonymous usage statistics and crash reports. Usage statistics are cookieless and never include what you write or your teams; crash reports contain only the error and the page it happened on. You can turn this off at any time.",
  "crash.title": "Something went wrong",
  "crash.body":
    "Something broke on our side. Your data is safe. You can reload the page, go back to the feed, or tell us what happened so we can fix it faster.",
  "crash.referencePrefix": "Crash reference:",
  "crash.reload": "Reload",
  "crash.goHome": "Go home",
  "crash.tellUs": "Tell us what happened",

  // Moderation notice page and suspend dialog.
  "moderation.noticeTitle": "Moderation notice",
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

  // System pages.
  "system.notFoundTitle": "Page not found",
  "system.notFoundBody":
    "There is nothing at this address. It may have moved or never existed.",

  // Browser tab titles (page-title.ts).
  "pageTitle.appeals": "Appeals",
  "pageTitle.feedback": "Feedback",
  "pageTitle.reports": "Reports",
  "pageTitle.styleguide": "Styleguide",
  "pageTitle.signingIn": "Signing in",
  "pageTitle.resetPassword": "Reset password",
  "pageTitle.team": "Team",
  "pageTitle.post": "Post",
  "pageTitle.group": "Group",
  "pageTitle.notFound": "Page not found",
} as const;

export type CommunityKey = keyof typeof communityEn;

export const communityJa: { [K in CommunityKey]: string } = {
  // 相対時間と日付（フィード、通知、プロフィール）。
  "relative.justNow": "たった今",
  "relative.minutesAgo": "{n}分前",
  "relative.hoursAgo": "{n}時間前",
  "relative.daysAgo": "{n}日前",
  "relative.weeksAgo": "{n}週間前",
  "relative.dateThisYear": "{month}{day}日",
  "relative.dateWithYear": "{year}年{month}{day}日",
  "profile.joined": "{date}に参加",

  // 法務ページ：英語版が正式であることの日本語の告知。
  "legal.japaneseNotice":
    "この規約・ポリシーは英語版が正式です。日本語版は準備中です。",

  // プライバシー：ブラウザーに保存されるものへ言語設定を追加。
  "privacy.languageChoice": "言語設定",

  // ソーシャル機能のエラー（データ層で変換された失敗）。
  "social.errors.not_configured": "コミュニティ機能は現在利用できません。",
  "social.errors.not_installed":
    "コミュニティ機能はまだ準備中です。しばらくしてからもう一度お試しください。",
  "social.errors.not_signed_in":
    "サインインしてコミュニティ機能を利用してください。",
  "social.errors.rate_limited":
    "投稿の間隔が短すぎます。少し待ってからもう一度お試しください。",
  "social.errors.suspended": "このアカウントは現在投稿できません。",
  "social.errors.too_long": "長すぎます。短くしてからもう一度お試しください。",
  "social.errors.not_found": "そのコンテンツはすでに存在しません。",
  "social.errors.forbidden": "この操作は行えません。",
  "social.errors.invalid_input": "入力が正しくありません。",
  "social.errors.network":
    "サーバーに接続できませんでした。通信状況を確認してもう一度お試しください。",
  "social.errors.unknown": "問題が発生しました。もう一度お試しください。",

  // 通知：文と行ごとの操作。文は投稿者名の後に続くため、
  // 日本語のフレーズは主語の助詞から始まります。
  "notifications.someone": "誰か",
  "notifications.like": "があなたの投稿にいいねしました",
  "notifications.comment": "があなたの投稿にコメントしました",
  "notifications.follow": "があなたをフォローしました",
  "notifications.appeal": "があなたの異議申し立てを確認しました",
  "notifications.groupInvite": "があなたを「{group}」に招待しました",
  "notifications.groupInviteUnnamed": "があなたをグループに招待しました",
  "notifications.moderationPost": "があなたの投稿を削除しました：{reason}",
  "notifications.moderationComment":
    "があなたのコメントを削除しました：{reason}",
  "notifications.moderationSuspend":
    "があなたのアカウントを停止しました：{reason}",
  "notifications.moderationGeneric": "がモデレーションを行いました",
  "notifications.default": "から通知が届きました",
  "notifications.markRead": "{name}さんの通知を既読にする",
  "notifications.delete": "{name}さんの通知を削除する",

  // 通知ページ。
  "notifications.title": "通知",
  "notifications.description":
    "いいね、コメント、フォロー、モデレーションの更新。",
  "notifications.markAllAsRead": "すべて既読にする",
  "notifications.markedRead": "通知を既読にしました",
  "notifications.allMarkedRead": "すべての通知を既読にしました",
  "notifications.deletedToast": "通知を削除しました",
  "notifications.signedOutTitle": "サインインして通知を表示する",
  "notifications.signedOutDescription":
    "いいね、コメント、フォロー、モデレーションの更新がここに表示されます。",
  "notifications.loadingAria": "通知を読み込み中",
  "notifications.errorTitle": "通知を読み込めませんでした",
  "notifications.emptyTitle": "通知はまだありません",
  "notifications.emptyDescription":
    "誰かがあなたの投稿にいいねしたりフォローしたりすると、ここに表示されます。",
  "notifications.loadMore": "さらに表示",
  "notifications.bellAriaUnread": "通知、未読{badge}件",

  // 投稿フォーム。
  "composer.aria": "投稿を書く",
  "composer.placeholder": "構築や計算結果、質問を共有しよう…",
  "composer.post": "投稿する",
  "composer.noAttachment": "添付なし",
  "composer.attachTeam": "構築を添付",
  "composer.chooseImages": "画像を選択",
  "composer.addImages": "画像を追加",
  "composer.imagesToAttach": "添付する画像",
  "composer.describeImage": "画像{n}の説明",
  "composer.addDescription": "説明を追加（任意）",
  "composer.moveLeft": "画像{n}を左へ移動",
  "composer.moveRight": "画像{n}を右へ移動",
  "composer.removeImage": "画像{n}を削除",
  "composer.imageAlt": "画像{n}",
  "composer.attachedTeamSr": "添付済みの構築：{name}",
  "composer.attachedTeam": "構築「{name}」がこの投稿に添付されます。",
  "composer.posted": "投稿しました。",
  "composer.postedImages": "投稿しました。画像は確認後に表示されます。",
  "composer.imageChecking": "画像を確認中です。承認後に表示されます。",
  "composer.tooManyImages": "投稿に添付できる画像は最大{n}枚です。",

  // 画像の前処理エラー（src/lib/social/images.ts）。
  "social.images.tooBig":
    "画像は15MB未満にしてください。小さい画像を選んでください。",
  "social.images.notImage": "そのファイルは画像ではありません。",
  "social.images.unreadable": "そのファイルは画像として読み込めませんでした。",
  "social.images.unconvertible":
    "この画像は変換できませんでした。別の画像をお試しください。",
  "social.images.noCanvas":
    "お使いのブラウザーでこの画像を処理できませんでした。別の画像をお試しください。",
  "social.images.tooMany": "投稿に添付できる画像は最大{n}枚です。",

  // 投稿カード（フィード、プロフィール、投稿ページ）。
  "postCard.copiedTeam": "構築「{name}」を自分の構築にコピーしました。",
  "postCard.updatedToast": "投稿を更新しました。",
  "postCard.deletedToast": "投稿を削除しました。",
  "postCard.blockedToast": "@{name}さんをブロックしました。",
  "postCard.enterReason": "削除の理由を入力してください。",
  "postCard.removedToast": "投稿を削除しました。",
  "postCard.editAria": "投稿を編集",
  "postCard.copyTeam": "自分の構築にコピー",
  "postCard.openInCalc": "計算で開く",
  "postCard.vs": "{a} 対 {b}",
  "postCard.damageRange": "ダメージ{min}〜{max}",
  "postCard.unlike": "いいねを取り消す",
  "postCard.like": "いいね",
  "postCard.commentAriaOne": "コメント{n}件",
  "postCard.commentAriaMany": "コメント{n}件",
  "postCard.options": "投稿のオプション",
  "postCard.reportPost": "投稿を報告",
  "postCard.blockUser": "@{name}さんをブロック",
  "postCard.removeFromGroup": "グループから削除",
  "postCard.removePost": "投稿を削除",
  "postCard.removeTitle": "この投稿を削除しますか？",
  "postCard.removeDescription":
    "投稿は全員に表示されなくなり、投稿者に理由が通知されます。",
  "postCard.reason": "削除の理由",
  "postCard.deleteTitle": "投稿を削除しますか？",
  "postCard.deleteDescription":
    "この操作は取り消せません。投稿とコメントは削除されます。",
  "postCard.blockTitle": "@{name}さんをブロックしますか？",
  "postCard.blockDescription":
    "フォローフィードにこのユーザーの投稿が表示されなくなります。アカウントページからブロックを解除できます。",
  "postCard.block": "ブロック",

  // 報告ダイアログ（投稿、コメント、プロフィール）。
  "report.title": "{target}を報告",
  "report.description":
    "何が問題か教えてください。モデレーターがすべての報告を確認します。",
  "report.signedOutDescription":
    "直接報告するにはアカウントが必要です。メールでモデレーターに報告することもできます。",
  "report.byEmail": "メールで報告",
  "report.reasonLabel": "理由",
  "report.reasonAria": "報告の理由",
  "report.chooseReasonPlaceholder": "理由を選ぶ",
  "report.chooseReasonError": "報告の理由を選んでください。",
  "report.detailsLabel": "詳細（任意）",
  "report.detailsPlaceholder":
    "モデレーターの判断に役立つ情報があればご記入ください。",
  "report.submit": "報告を送信",
  "report.sent": "報告を送信しました。モデレーターが確認します。",
  "report.reasonSpam": "スパム",
  "report.reasonHarassment": "嫌がらせ・いじめ",
  "report.reasonInappropriate": "不適切なコンテンツ",
  "report.reasonOther": "その他",
  "report.targetPost": "投稿",
  "report.targetComment": "コメント",
  "report.targetProfile": "プロフィール",
  "report.emailSubjectPost": "投稿の報告",
  "report.emailSubjectComment": "コメントの報告",
  "report.emailSubjectProfile": "プロフィールの報告",

  // 投稿画像：グリッド、ステータス、ライトボックス。
  "postImages.gridLabel": "投稿の画像",
  "postImages.open": "画像{n}を開く",
  "postImages.checking": "画像を確認中…",
  "postImages.removed": "画像は自動チェックで削除されました。",
  "postImages.seeNotice": "通知を見る",
  "image.lightboxTitle": "画像",
  "image.closeImage": "画像を閉じる",
  "image.postImage": "投稿画像",

  // ホーム：サインアウト時のツール案内とフィード。
  "home.introTagline":
    "ポケモンチャンピオンズのためのツールとコミュニティ。ダメージ計算、構築作成、環境の動向をここで。",
  "home.calcTitle": "ダメージ計算",
  "home.calcDescription":
    "チャンピオンズの仕様でダメージ幅と一発の確率を確認できます。",
  "home.teamsTitle": "構築作成",
  "home.teamsDescription":
    "6匹の構築を作り、タイプ相性を確認して書き出せます。",
  "home.metaTitle": "環境",
  "home.metaDescription": "シングル・ダブルの使用率、よくある型、素早さ関係。",
  "home.signedOutIntro":
    "チャンピオンズプレイヤーのコミュニティ。構築を共有し、戦略を語り、注目のトレーナーをフォローしよう。",
  "home.feedAria": "フィード",
  "home.latest": "最新",
  "home.following": "フォロー中",
  "home.groups": "グループ",
  "home.emptyLatestTitle": "まだ投稿がありません",
  "home.emptyLatestDescription": "最初の投稿をしてみましょう。",
  "home.emptyFollowingTitle": "フォロー中のユーザーの投稿はまだありません",
  "home.signInToFollow": "サインインしてフォロー中のトレーナーの投稿を見る",
  "home.yourGroups": "あなたのグループ",
  "home.signInToJoinGroups": "サインインしてグループに参加",
  "home.noGroupsYet": "グループはまだありません",
  "home.loadingPosts": "投稿を読み込み中",
  "home.feedErrorTitle": "フィードを読み込めませんでした",
  "home.trending": "ダブルで人気のポケモン",

  // 投稿ページとコメント。
  "postDetail.title": "投稿",
  "postDetail.loadingAria": "投稿を読み込み中",
  "postDetail.errorTitle": "投稿を読み込めませんでした",
  "postDetail.commentPosted": "コメントを投稿しました",
  "postDetail.commentDeleted": "コメントを削除しました",
  "postDetail.comments": "コメント",
  "postDetail.writeComment": "コメントを書く",
  "postDetail.commentPlaceholder": "コメントを追加…",
  "postDetail.comment": "コメントする",
  "postDetail.joinConversation": "して会話に参加しましょう。",
  "postDetail.loadingComments": "コメントを読み込み中…",
  "postDetail.noComments": "まだコメントはありません",
  "postDetail.deletedUser": "削除されたユーザー",
  "postDetail.report": "報告",

  // グループ：グループページ、メンバー、設定。
  "groups.loadingAria": "グループを読み込み中",
  "groups.notFoundTitle": "グループが見つかりません",
  "groups.notFoundDescription":
    "このグループは存在しないか、公開されていません。",
  "groups.browse": "グループを見る",
  "groups.inviteOnly": "招待制",
  "groups.publicBadge": "公開",
  "groups.membersLabel": "メンバー",
  "groups.memberCountOne": "メンバー{n}人",
  "groups.memberCountMany": "メンバー{n}人",
  "groups.invitedTitle": "招待されています",
  "groups.invitedDescription": "承認するとフィードを見て投稿できます。",
  "groups.inviteOnlyTitle": "招待制",
  "groups.inviteOnlyDescription":
    "このグループは招待制です。モデレーターに招待を頼んでください。",
  "groups.membersOnlyTitle": "メンバー限定",
  "groups.membersOnlyDescription": "参加するとフィードを見て投稿できます。",
  "groups.signInToJoin": "サインインして参加",
  "groups.youOwn": "あなたがこのグループのオーナーです",
  "groups.invitedBadge": "招待済み",
  "groups.joinedToast": "グループに参加しました",
  "groups.accept": "承認する",
  "groups.decline": "拒否",
  "groups.declinedToast": "招待を断りました",
  "groups.leftToast": "グループから退出しました",
  "groups.leave": "退出",
  "groups.join": "参加",
  "groups.sectionsAria": "グループのセクション",
  "groups.feed": "フィード",
  "groups.members": "メンバー",
  "groups.settings": "設定",
  "groups.feedError": "グループのフィードを読み込めませんでした",
  "groups.emptyFeedTitle": "まだ投稿がありません",
  "groups.emptyFeedDescription": "最初の投稿をしてみましょう。",
  "groups.enterUsername": "ユーザー名を入力してください。",
  "groups.inviteSent": "@{name}さんに招待を送りました",
  "groups.inviteTitle": "メンバーを招待",
  "groups.inviteDescription":
    "招待制・公開グループのどちらもユーザー名で招待します。",
  "groups.usernameToInvite": "招待するユーザー名",
  "groups.invite": "招待",
  "groups.loadingMembers": "メンバーを読み込み中",
  "groups.noMembers": "まだメンバーがいません",
  "groups.memberFallback": "メンバー",
  "groups.roleOwner": "オーナー",
  "groups.roleModerator": "モデレーター",
  "groups.roleMember": "メンバー",
  "groups.statusInvited": "招待済み",
  "groups.demotedToast": "メンバーに戻しました",
  "groups.promotedToast": "モデレーターにしました",
  "groups.makeMember": "メンバーにする",
  "groups.makeModerator": "モデレーターにする",
  "groups.memberRemovedToast": "メンバーを削除しました",
  "groups.updatedToast": "グループを更新しました",
  "groups.deletedToast": "グループを削除しました",
  "groups.settingsTitle": "グループ設定",
  "groups.settingsDescription":
    "アドレス（/g/{slug}）は作成後に変更できません。",
  "groups.nameLabel": "名前",
  "groups.descriptionLabel": "説明",
  "groups.visibilityLabel": "公開設定",
  "groups.publicOption": "公開 — 誰でも見つけて参加できます",
  "groups.inviteOnlyOption": "招待制 — 招待された人だけが参加できます",
  "groups.changesSaved": "変更を保存しました",
  "groups.saveChanges": "変更を保存",
  "groups.dangerZone": "危険な操作",
  "groups.dangerDescription":
    "グループを削除すると、フィード・投稿・メンバーは完全に失われます。この操作は取り消せません。",
  "groups.typeSlugToConfirm": "確認のためグループのアドレスを入力してください",
  "groups.deleteGroup": "グループを削除",

  "groups.homeTitle": "グループ",
  "groups.homeDescription":
    "チーム・ルール・チャンピオンズのすべてのためのコミュニティ。",
  "groups.createGroup": "グループを作成",
  "groups.sectionsAriaGroups": "グループのセクション",
  "groups.myGroups": "自分のグループ",
  "groups.discover": "見つける",
  "groups.noGroupsYetTitle": "まだグループがありません",
  "groups.noGroupsYetDescription":
    "まだグループに参加していません。「見つける」から探してみましょう。",
  "groups.signInToSeeGroups": "自分のグループを見るにはサインインしてください",
  "groups.searchAria": "グループ名で検索",
  "groups.noPublicGroups": "公開グループはまだありません",
  "groups.noMatchesTitle": "グループが見つかりません",
  "groups.createFirst": "最初のグループを作りましょう。",
  "groups.noMatchesDescription": '"{query}" に一致するグループはありません。',
  "groups.loadingGroups": "グループを読み込み中",
  "groups.noDescription": "説明はまだありません。",
  "groups.newTitle": "グループを作成",
  "groups.signInToCreate": "グループを作成するにはサインインしてください",
  "groups.newCreatedToast": "グループを作成しました",
  "groups.newPageDescription":
    "グループには専用のフィード・メンバー・モデレーターがあります。",
  "groups.newCardTitle": "新しいグループ",
  "groups.newCardDescription":
    "あなたがオーナーになり、すぐにメンバーを招待できます。",
  "groups.newNamePlaceholder": "四天王ファンクラブ",
  "groups.newAddressLabel": "アドレス",
  "groups.newSlugHint":
    "半角小文字・数字・ハイフン。3〜{max}文字。未使用のものを指定してください。",
  "groups.newDescriptionOptional": "説明（任意）",
  "groups.newDescriptionPlaceholder": "このグループは何のグループですか？",
  "groups.newVisibilityAria": "公開設定",

  "groups.removeTitle": "グループから投稿を削除",
  "groups.removeDescription":
    "投稿はグループ内で非表示になり、理由が記録され、投稿者に通知されます。",
  "groups.reasonLabel": "理由",
  "groups.reasonPlaceholder": "この投稿を削除する理由は何ですか？",
  "groups.removedToast": "投稿をグループから削除しました",

  "feedback.kindBug": "バグ",
  "feedback.kindIdea": "アイデア",
  "feedback.kindOther": "その他",
  "feedback.tooShort": "もう少し詳しく教えてください（{min}文字以上）。",
  "feedback.tooLong": "フィードバックは{max}文字以内です。",
  "feedback.sentToast": "ありがとうございます！フィードバックを送信しました。",
  "feedback.rateLimited":
    "最近フィードバックを多数送信しています。1時間ほど経ってからもう一度お送りください。",
  "feedback.description":
    "壊れているもの、足りないもの、見たいものをお聞かせください。すべて目を通しています。",
  "feedback.signedOutBody":
    "サイトからフィードバックを送るにはアカウントが必要です。メールでもご連絡いただけます。",
  "feedback.emailUs": "{email}にメールする",
  "feedback.kindAria": "フィードバックの種類",
  "feedback.placeholder": "何が起きましたか？何を変えるべきですか？",
  "feedback.messageAria": "フィードバック内容",
  "feedback.includeDetails":
    "技術情報を含める（ページ、アプリのバージョン、ブラウザー、画面サイズ",
  "feedback.crashIdSuffix": "、クラッシュID",
  "feedback.send": "送信",
  "feedback.sending": "送信中…",
  "feedback.telemetryAria": "匿名の利用統計とクラッシュレポートを共有する",
  "feedback.telemetryBody":
    "匿名の利用統計とクラッシュレポートを共有します。利用統計にCookieは使われず、入力内容や構築が含まれることもありません。クラッシュレポートにはエラーと発生ページのみが含まれます。いつでもオフにできます。",
  "crash.title": "問題が発生しました",
  "crash.body":
    "こちら側で問題が発生しました。データは安全です。ページの再読み込み、フィードへの戻る、または発生したことをお知らせいただければ、より早く修正できます。",
  "crash.referencePrefix": "クラッシュ参照ID:",
  "crash.reload": "再読み込み",
  "crash.goHome": "ホームへ",
  "crash.tellUs": "発生したことを報告する",

  "moderation.noticeTitle": "モデレーションのお知らせ",
  "moderation.suspendedTitle": "アカウントが停止されました",
  "moderation.postRemovedTitle": "投稿が削除されました",
  "moderation.commentRemovedTitle": "コメントが削除されました",
  "moderation.contentRemovedTitle": "コンテンツが削除されました",
  "moderation.underReview": "審査中",
  "moderation.appealUpheld": "申し立てが認められました",
  "moderation.appealReversed": "申し立てで取り消されました",
  "moderation.yourAppeal": "あなたの申し立て",
  "moderation.filedAt": "{date}に提出",
  "moderation.reviewPending":
    "モデレーターが申し立てを確認し、ここに状況が表示されます。",
  "moderation.writeMessage": "モデレーターへのメッセージを書いてください。",
  "moderation.appealSubmittedToast": "申し立てを提出しました。",
  "moderation.appealTitle": "この決定に申し立てる",
  "moderation.appealDescription":
    "この処置が誤りだと思われる理由を説明してください。モデレーターが確認します。",
  "moderation.appealAria": "申し立てのメッセージ",
  "moderation.appealPlaceholder": "この決定を再考すべき理由は何ですか？",
  "moderation.submitAppeal": "申し立てを送信",
  "moderation.reasonLabel": "理由：",
  "moderation.removedContent": "削除されたコンテンツ",
  "moderation.suspension": "停止",
  "moderation.until": "{date}まで",
  "moderation.suspendDescription":
    "このユーザーが投稿・コメント・やり取りできないよう一時的に停止します。期間を選び、理由を入力してください。ユーザーには通知され、申し立てができます。",
  "moderation.suspendReasonAria": "停止の理由",
  "moderation.enterSuspendReason": "停止の理由を入力してください。",
  "moderation.suspendedToast": "ユーザーを停止しました。",
  "moderation.duration1": "1日",
  "moderation.duration7": "7日",
  "moderation.duration30": "30日",
  "moderation.durationPermanent": "無期限",

  "system.notFoundTitle": "ページが見つかりません",
  "system.notFoundBody":
    "このアドレスには何もありません。移動したか、元から存在しません。",

  "pageTitle.appeals": "申し立て",
  "pageTitle.feedback": "フィードバック",
  "pageTitle.reports": "報告",
  "pageTitle.styleguide": "スタイルガイド",
  "pageTitle.signingIn": "サインイン中",
  "pageTitle.resetPassword": "パスワードのリセット",
  "pageTitle.team": "構築",
  "pageTitle.post": "投稿",
  "pageTitle.group": "グループ",
  "pageTitle.notFound": "ページが見つかりません",
};
