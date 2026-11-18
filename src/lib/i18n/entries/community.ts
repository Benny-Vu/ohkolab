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
};
