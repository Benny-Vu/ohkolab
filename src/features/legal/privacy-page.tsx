import { Link } from "react-router";

import { TelemetrySwitch } from "@/features/feedback/telemetry-switch";
import {
  LegalList,
  LegalPage,
  LegalSection,
  LegalText,
} from "@/features/legal/legal-page";
import { JaPrivacySections } from "@/features/legal/ja-privacy";
import { CONTACT_EMAIL, LAST_UPDATED } from "@/features/legal/legal-info";
import { battlesEnabled } from "@/lib/battles/flag";
import { useLocale } from "@/lib/i18n/locale";
import { useT } from "@/lib/i18n/t";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { imagePostsEnabled } from "@/lib/social";

// The image-post text (approved by the owner on 2026-11-18) is shown only when
// the VITE_IMAGE_POSTS flag is on, so the policy never describes processing
// that isn't happening yet. The direct message text (approved 2026-11-19)
// follows VITE_DIRECT_MESSAGES the same way, and the battle request text
// (approved 2026-11-20) follows VITE_BATTLES.
const IMAGES = imagePostsEnabled();
const MESSAGES = directMessagesEnabled();
const BATTLES = battlesEnabled();

const SECTIONS: Array<{ id: string; heading: string; headingJa: string }> = [
  {
    id: "operator",
    heading: "Who runs OHKOLab",
    headingJa: "OHKOLab の運営者",
  },
  {
    id: "what-this-covers",
    heading: "What this page covers",
    headingJa: "このページの対象",
  },
  {
    id: "your-account",
    heading: "Your account",
    headingJa: "あなたのアカウント",
  },
  {
    id: "your-public-profile",
    heading: "Your public profile",
    headingJa: "あなたの公開プロフィール",
  },
  {
    id: "your-teams",
    heading: "Your teams",
    headingJa: "あなたの構築",
  },
  {
    id: "community-features",
    heading: "Community features",
    headingJa: "コミュニティ機能",
  },
  ...(IMAGES
    ? [
        {
          id: "images",
          heading: "Images in posts",
          headingJa: "投稿内の画像",
        },
      ]
    : []),
  { id: "groups", heading: "Groups", headingJa: "グループ" },
  ...(MESSAGES
    ? [
        {
          id: "direct-messages",
          heading: "Direct messages",
          headingJa: "ダイレクトメッセージ",
        },
      ]
    : []),
  ...(BATTLES
    ? [
        {
          id: "battle-requests",
          heading: "Battle requests",
          headingJa: "対戦募集",
        },
      ]
    : []),
  {
    id: "notifications",
    heading: "Notifications",
    headingJa: "通知",
  },
  {
    id: "telemetry",
    heading: "Crash reports and usage statistics",
    headingJa: "クラッシュレポートと利用統計",
  },
  {
    id: "feedback",
    heading: "Feedback",
    headingJa: "フィードバック",
  },
  {
    id: "moderation",
    heading: "Moderation and appeals",
    headingJa: "モデレーションと申し立て",
  },
  {
    id: "in-your-browser",
    heading: "What stays in your browser",
    headingJa: "ブラウザー内にとどまるデータ",
  },
  {
    id: "third-parties",
    heading: "Third parties",
    headingJa: "第三者",
  },
  {
    id: "deleting",
    heading: "Deleting your account",
    headingJa: "アカウントの削除",
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    headingJa: "ポリシーの変更",
  },
  { id: "contact", heading: "Contact", headingJa: "お問い合わせ" },
];

export function PrivacyPage() {
  const t = useT();
  const [locale] = useLocale();
  const ja = locale === "ja";
  const sections = SECTIONS.map(({ id, heading, headingJa }) => ({
    id,
    heading: ja ? headingJa : heading,
  }));

  if (ja) {
    return (
      <LegalPage
        title="プライバシーポリシー"
        description={`最終更新: ${new Intl.DateTimeFormat("ja", { year: "numeric", month: "long", day: "numeric" }).format(new Date(LAST_UPDATED))}`}
        sections={sections}
      >
        <JaPrivacySections
          images={IMAGES}
          messages={MESSAGES}
          battles={BATTLES}
        />
      </LegalPage>
    );
  }

  return (
    <LegalPage
      title="Privacy Policy"
      description={`Last updated ${LAST_UPDATED}`}
      sections={sections}
    >
      <div className="space-y-8">
        <LegalSection id="operator" heading="Who runs OHKOLab">
          <LegalText>
            OHKOLab is run by Vu Forge (Benny Vu). You can reach us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </LegalText>
        </LegalSection>

        <LegalSection id="what-this-covers" heading="What this page covers">
          <LegalText>
            This page explains what OHKOLab stores about you and why. OHKOLab
            has no advertising. We collect anonymous, cookieless usage
            statistics and crash reports to find and fix problems, and you can
            turn both off at any time (see "Crash reports and usage statistics"
            below).
          </LegalText>
        </LegalSection>

        <LegalSection id="your-account" heading="Your account">
          <LegalText>
            When you create an account, our sign-in provider, Supabase, stores
            your email address, a hashed password if you sign up with email, or
            the provider you used if you sign in with Google or Discord. It also
            stores that you confirmed being 16 or older and accepted the terms,
            with the date of that confirmation.
          </LegalText>
        </LegalSection>

        <LegalSection id="your-public-profile" heading="Your public profile">
          <LegalText>
            Your profile stores your username, and an optional display name,
            avatar and bio. Profile pages are public: anyone can view them at
            ohkolab.com/u/your-username.
          </LegalText>
          <LegalText>
            Your public profile can also carry community details you choose to
            add: a favourite Pokémon, your main format, a short &quot;looking
            for&quot; line, and optional links — a YouTube or Twitch channel and
            a Showdown name. Posts and groups can be tagged with a language
            (English or Japanese) so players can find content in their own
            language. Like everything on your public profile, these details are
            public; together with who you follow and your public group
            memberships they also feed the &quot;People to follow&quot;
            suggestions. Only adult players are ever suggested: players under
            18, and players who haven&apos;t added a birth date, never appear in
            suggestions. You can change or clear them at any time on your
            profile, and deleting your account removes them.
          </LegalText>
        </LegalSection>

        <LegalSection id="your-teams" heading="Your teams">
          <LegalText>
            Teams you save store their name, their format (singles or doubles)
            and their Pokémon sets. Saved teams are private by default: only you
            can see them. If you turn on a team's "Public" switch, other
            visitors can view that team.
          </LegalText>
        </LegalSection>

        <LegalSection id="community-features" heading="Community features">
          <LegalText>
            OHKOLab is adding community features: posts, comments, likes,
            follows, reports, blocks, groups and notifications. These features
            store the content and interactions you create, such as your posts,
            comments, likes and follows, so they can be shown to you and to
            other people. Reports are seen by our moderators, and blocks hide
            another person's content from you.
          </LegalText>
        </LegalSection>

        {IMAGES && (
          <LegalSection id="images" heading="Images in posts">
            <LegalText>
              When you attach an image to a post, your browser first resizes it
              and re-encodes it as WebP. This also removes the image's metadata,
              including any location information, before anything is uploaded.
              Only the processed image leaves your device.
            </LegalText>
            <LegalText>
              Every image is checked automatically before anyone else can see
              it: OpenAI, a company in the United States that processes the
              image for us, screens it for sexual content, violence and
              self-harm, and an image that fails is never shown to others.
              Cloudflare, which delivers our images, also checks every image
              against known records of child sexual abuse material when it is
              first delivered. A match is blocked at once and reported to the
              authorities.
            </LegalText>
            <LegalText>
              Rejected images and images from removed posts are kept in a locked
              storage area that only our moderators can see, for 12 months
              together with the moderation record of the removal. Then they are
              deleted automatically.
            </LegalText>
            <LegalText>
              We process images this way for our legitimate interest in keeping
              the service safe and in meeting duties the law places on us. If an
              image is rejected, we tell you and you can appeal once, like any
              other removal.
            </LegalText>
          </LegalSection>
        )}

        <LegalSection id="groups" heading="Groups">
          <LegalText>
            Groups store their name, description, whether they are public or
            invite-only, and their owner. For each member, we store their role
            and membership status. Anyone can see a group's name and
            description, and who belongs to a public group. In an invite-only
            group, only members can see the member list. You can always see your
            own memberships.
          </LegalText>
        </LegalSection>

        {MESSAGES && (
          <LegalSection id="direct-messages" heading="Direct messages">
            <LegalText>
              Direct messages are visible only to the two participants. We do
              not read your messages. A moderator can see a message only after a
              participant reports it: the report stores a copy of the reported
              message and up to 20 messages before it, so the report can be
              reviewed. Reported copies are kept for one year, then deleted.
              Each message is deleted automatically one year after it was sent.
              Deleting either account deletes the conversation and its messages.
            </LegalText>
            <LegalText>
              To protect younger players, we ask for your birth date. It is
              never shown to other players. Players under 18, and players who
              have not added a birth date, can exchange messages only with their
              friends, whoever starts the conversation. Your birth date is kept
              while your account exists and is deleted with it.
            </LegalText>
            <LegalText>
              We store and deliver your messages to provide the messaging
              service you use (performing our agreement with you). We process
              your birth date, reported copies and the protections for younger
              players for our legitimate interest in keeping the service safe,
              and to meet duties the law places on us.
            </LegalText>
          </LegalSection>
        )}

        {BATTLES && (
          <LegalSection id="battle-requests" heading="Battle requests">
            <LegalText>
              When you post a battle request, we store its format, rules,
              optional note, optional time window and time zone, language, any
              public team you attach, and its status. Open requests are visible
              to signed-in players, except anyone you have blocked or who has
              blocked you. When you offer to battle, the request&apos;s author
              can see your offer. When the author accepts an offer, the request
              stays visible to the two of you, and you can share an in-game room
              code that only the two of you can see, not even moderators.
              Moderators can see requests to handle reports. Requests close when
              their time window ends or after 24 hours. Closed requests and
              offers are kept with your account and deleted when you delete it.
            </LegalText>
            <LegalText>
              Players under 18, and players who have not added a birth date, see
              and answer battle requests only from their friends, and their own
              requests are shown only to friends.
            </LegalText>
            <LegalText>
              We store and show battle requests and offers to provide the
              matchmaking you use (performing our agreement with you). We apply
              the protections for younger players and blocks for our legitimate
              interest in keeping the service safe.
            </LegalText>
          </LegalSection>
        )}

        <LegalSection id="notifications" heading="Notifications">
          <LegalText>
            Notifications store what happened, such as a like, comment, follow
            or group invitation, who did it, when it happened, and whether you
            have read it. Only you can see your notifications.
          </LegalText>
        </LegalSection>

        <LegalSection
          id="telemetry"
          heading="Crash reports and usage statistics"
        >
          <LegalText>
            To keep OHKOLab working, we collect two kinds of telemetry, and both
            are anonymous and cookieless:
          </LegalText>
          <LegalList>
            <li>
              <strong className="font-medium">Crash reports.</strong> When
              something breaks, the app sends a report to Sentry (hosted in the
              EU). It contains the error, the page you were on, your app
              version, browser and screen size, a random session id and, when
              you are signed in, your account id (a random code, not your name
              or email). It never contains your posts, comments, bio, team
              details beyond Pokémon and move names, username, display name,
              email, password, auth tokens or IP address. Crash reports are kept
              for about 30 days. In the Android app, crashes are also captured
              by Sentry's native crash reporter. It sends the same information
              as on the website (the error, the page you were on and the app
              version) and nothing else. Nothing is sent unless crash reports
              are turned on, and turning them off stops it immediately.
            </li>
            <li>
              <strong className="font-medium">Usage statistics.</strong> We use
              PostHog (hosted in the EU) to count which pages are visited and
              which features are used, so we know what to improve. Page views
              are recorded by page name only, never by full URL, and nothing is
              written to cookies. Usage statistics are kept for up to 1 year.
            </li>
          </LegalList>
          <LegalText>
            You can turn crash reports and usage statistics off with the switch
            below. Turning them off stops both immediately. If your browser
            sends a Global Privacy Control or Do Not Track signal, we honour it
            by turning usage statistics off; crash reports stay on unless you
            use the switch.
          </LegalText>
          <TelemetrySwitch />
        </LegalSection>

        <LegalSection id="feedback" heading="Feedback">
          <LegalText>
            When you send feedback through the site, we store your message, its
            kind (bug, idea or other), and, if you leave the technical details
            checkbox on, the page you were on, your app version, browser, screen
            size and the id of a crash if one just happened. Feedback is tied to
            your account so we can follow up, and is seen by our moderators. We
            keep feedback until it has been handled plus 12 months, and it is
            deleted with your account.
          </LegalText>
        </LegalSection>

        <LegalSection id="moderation" heading="Moderation and appeals">
          <LegalText>
            When content is removed or an account is suspended, we store what
            was removed or suspended, the reason, which moderator handled it,
            and when. When we remove a post or comment, we also keep a copy of
            its text with the record, so we can still show you and our
            moderators what was taken down. If you appeal, we store your appeal
            message and its outcome. Moderators can see moderation actions and
            appeals. You can see actions that affect you and your own appeals.
            {IMAGES &&
              " For posts with images, the record also lists the image files that were blocked with the removal."}
            {MESSAGES &&
              " When you report a message, the copy described under Direct messages is stored with the report."}
            {BATTLES &&
              " When we remove a battle request, the record keeps a copy of its rules and note."}
          </LegalText>
        </LegalSection>

        <LegalSection id="in-your-browser" heading="What stays in your browser">
          <LegalText>
            Some data never leaves your browser and is kept in its local
            storage:
          </LegalText>
          <LegalList>
            <li>
              your theme (dark or light) and battle format (singles or doubles)
              preferences,
            </li>
            <li>the state of your damage calculator,</li>
            <li>
              teams you build while signed out, a backup of that data if it ever
              becomes unreadable, and a marker once those teams have been copied
              to your account,
            </li>
            <li>
              the page you were viewing when you started signing in, so you can
              return to it,
            </li>
            <li>
              whether you have turned crash reports and usage statistics off,
            </li>
            <li>{t("privacy.languageChoice")}, and</li>
            <li>your sign-in session, which keeps you signed in.</li>
          </LegalList>
          <LegalText>
            Clearing your browser's site data for OHKOLab removes all of this.
          </LegalText>
        </LegalSection>

        <LegalSection id="third-parties" heading="Third parties">
          <LegalText>
            Pokémon sprites are loaded from play.pokemonshowdown.com, so that
            host sees the requests your browser makes for those images. If you
            sign in with Google or Discord, that provider handles your sign-in.
            Crash reports go to Sentry and usage statistics go to PostHog, both
            hosted in the EU, as described above; see Sentry's{" "}
            <a
              href="https://sentry.io/privacy/"
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              privacy policy
            </a>{" "}
            and PostHog's{" "}
            <a
              href="https://posthog.com/privacy/"
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              privacy policy
            </a>
            . The website itself is delivered through Cloudflare's network, so
            Cloudflare handles the requests your browser makes to ohkolab.com
            (including your IP address), as any web host does; see Cloudflare's{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              privacy policy
            </a>
            .
            {IMAGES ? (
              <>
                {" "}
                Images attached to posts are screened by OpenAI, hosted in the
                United States, as described under "Images in posts"; see
                OpenAI's{" "}
                <a
                  href="https://openai.com/policies/row-privacy-policy/"
                  className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
                >
                  privacy policy
                </a>
                . Images are also served through Cloudflare, which checks them
                against known records of child sexual abuse material; see
                Cloudflare's{" "}
                <a
                  href="https://www.cloudflare.com/privacypolicy/"
                  className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
                >
                  privacy policy
                </a>
                . Other than these, OHKOLab does not send your data to anyone
                else.
              </>
            ) : (
              " Other than that, OHKOLab does not send your data to anyone else."
            )}
          </LegalText>
        </LegalSection>

        <LegalSection id="deleting" heading="Deleting your account">
          <LegalText>
            You can delete your account from your{" "}
            <Link
              to="/profile"
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              profile page
            </Link>
            . This permanently removes your account, your profile, your saved
            teams, your posts, comments, likes, follows, blocks, group
            memberships and groups you own, and your notifications
            {IMAGES && ", and the images you attached to posts,"} from our
            servers. It does not remove data stored in your browser; clear your
            browser's site data for that.
          </LegalText>
          <LegalText>
            Moderation records are an exception. These are the actions taken
            against you and their reasons, a copy of the content we removed,
            your appeals and their outcomes, and your suspensions. We keep each
            record for 12 months after the decision (for a suspension, 12 months
            after it ends), even if you delete your account in the meantime, so
            we can explain our decisions and give evidence to the police if the
            law requires it. After you delete your account, the records no
            longer link to it. We delete them automatically once the 12 months
            have passed.
          </LegalText>
          <LegalText>
            Step-by-step instructions are on the{" "}
            <Link
              to="/delete-account"
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              account deletion page
            </Link>
            .
          </LegalText>
        </LegalSection>

        <LegalSection id="changes" heading="Changes to this policy">
          <LegalText>
            We may update this policy as OHKOLab grows. The "last updated" date
            at the top of this page shows the current version.
          </LegalText>
        </LegalSection>

        <LegalSection id="contact" heading="Contact">
          <LegalText>
            Questions about your data? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              {CONTACT_EMAIL}
            </a>
            . See also our{" "}
            <Link
              to="/terms"
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              terms of service
            </Link>
            .
          </LegalText>
        </LegalSection>
      </div>
    </LegalPage>
  );
}
