import { Link } from "react-router";

import {
  LegalList,
  LegalPage,
  LegalSection,
  LegalText,
} from "@/features/legal/legal-page";
import { JaTermsSections } from "@/features/legal/ja-terms";
import { CONTACT_EMAIL, LAST_UPDATED } from "@/features/legal/legal-info";
import { useLocale } from "@/lib/i18n/locale";
import { directMessagesEnabled } from "@/lib/messages/flag";
import { imagePostsEnabled } from "@/lib/social";

// The image-post rules (approved by the owner on 2026-11-18) are shown only
// when the VITE_IMAGE_POSTS flag is on; the direct message rules (approved
// 2026-11-19) follow VITE_DIRECT_MESSAGES.
const IMAGES = imagePostsEnabled();
const MESSAGES = directMessagesEnabled();

// Every section exists in both languages with the same id (a test enforces
// it); the Japanese reference translation renders when the locale is ja.
const SECTIONS: Array<{ id: string; heading: string; headingJa: string }> = [
  {
    id: "operator",
    heading: "Who runs OHKOLab",
    headingJa: "OHKOLab の運営者",
  },
  {
    id: "unofficial",
    heading: "An unofficial fan project",
    headingJa: "非公式のファンプロジェクトであること",
  },
  {
    id: "who-can-use",
    heading: "Who can use OHKOLab",
    headingJa: "利用できる人",
  },
  { id: "acceptable-use", heading: "Acceptable use", headingJa: "禁止事項" },
  {
    id: "moderation",
    heading: "Moderation and suspension",
    headingJa: "モデレーションと停止",
  },
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
  ...(IMAGES
    ? [
        {
          id: "images",
          heading: "Images in posts",
          headingJa: "投稿内の画像",
        },
      ]
    : []),
  {
    id: "notifications",
    heading: "Notifications",
    headingJa: "通知",
  },
  {
    id: "removal-notices",
    heading: "Removal notices and appeals",
    headingJa: "削除の通知と申し立て",
  },
  { id: "reporting", heading: "Reporting", headingJa: "報告" },
  {
    id: "your-content",
    heading: "Your content",
    headingJa: "あなたのコンテンツ",
  },
  { id: "no-warranty", heading: "No warranty", headingJa: "無保証" },
  {
    id: "changes",
    heading: "Changes to these terms",
    headingJa: "規約の変更",
  },
  { id: "contact", heading: "Contact", headingJa: "お問い合わせ" },
];

/** The "last updated" line, localized. */
function lastUpdated(locale: string): string {
  if (locale !== "ja") return `Last updated ${LAST_UPDATED}`;
  const date = new Intl.DateTimeFormat("ja", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(LAST_UPDATED));
  return `最終更新: ${date}`;
}

export function TermsPage() {
  const [locale] = useLocale();
  const ja = locale === "ja";
  const sections = SECTIONS.map(({ id, heading, headingJa }) => ({
    id,
    heading: ja ? headingJa : heading,
  }));

  return (
    <LegalPage
      title={ja ? "利用規約" : "Terms of Service"}
      description={lastUpdated(locale)}
      sections={sections}
    >
      {ja ? (
        <JaTermsSections images={IMAGES} messages={MESSAGES} />
      ) : (
        <EnglishTermsSections />
      )}
    </LegalPage>
  );
}

function EnglishTermsSections() {
  return (
    <div className="space-y-8">
      <LegalSection id="operator" heading="Who runs OHKOLab">
        <LegalText>
          OHKOLab is run by Vu Forge (Benny Vu). You can reach us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </LegalText>
      </LegalSection>

      <LegalSection id="unofficial" heading="An unofficial fan project">
        <LegalText>
          OHKOLab is an unofficial fan project for Pokémon Champions. It is not
          affiliated with, endorsed or sponsored by Nintendo, Game Freak,
          Creatures or The Pokémon Company. Pokémon and Pokémon Champions are
          trademarks of their respective owners.
        </LegalText>
      </LegalSection>

      <LegalSection id="who-can-use" heading="Who can use OHKOLab">
        <LegalText>
          You must be at least 16 years old to create an account. By using
          OHKOLab, you confirm that you meet this age requirement.
        </LegalText>
      </LegalSection>

      <LegalSection id="acceptable-use" heading="Acceptable use">
        <LegalText>
          OHKOLab lets you share content, such as public teams, profile details
          and community posts. Do not post or share content that:
        </LegalText>
        <LegalList>
          <li>harasses, threatens or bullies other people,</li>
          <li>promotes hate or discrimination against anyone,</li>
          <li>contains sexual material,</li>
          <li>is spam or deliberately misleading, or</li>
          <li>is illegal, or breaks any law or rule that applies to you.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="moderation" heading="Moderation and suspension">
        <LegalText>
          We may remove content that breaks these terms, and we may suspend or
          delete accounts that break them seriously or repeatedly. We may also
          remove content for other reasons, such as keeping OHKOLab working and
          safe.
        </LegalText>
      </LegalSection>

      <LegalSection id="groups" heading="Groups">
        <LegalText>
          Groups are spaces that members create and run themselves. Group owners
          and group moderators are responsible for what happens in their group,
          including its posts and its members. We may remove a group, or take
          away an owner's or moderator's role, if a group breaks these terms.
        </LegalText>
      </LegalSection>

      {MESSAGES && (
        <LegalSection id="direct-messages" heading="Direct messages">
          <LegalText>
            Direct messages are between you and the other player. Do not use
            them to harass, threaten or spam anyone, and never to send sexual
            content involving minors. You can report a message; reports are
            reviewed using the copy described in the privacy policy. Breaking
            these rules can lead to messages being removed, and to suspension or
            deletion of your account.
          </LegalText>
        </LegalSection>
      )}

      {IMAGES && (
        <LegalSection id="images" heading="Images in posts">
          <LegalText>
            You can attach up to four images to a post. Only attach images you
            have the right to share, and do not upload images that:
          </LegalText>
          <LegalList>
            <li>contain sexual material,</li>
            <li>show violence or gore,</li>
            <li>
              show personal data of other people, such as their face, address or
              messages, without their permission, or
            </li>
            <li>break any of the rules under "Acceptable use".</li>
          </LegalList>
          <LegalText>
            Every image is screened automatically before others can see it.
            Images that fail the screening are not shown, and you are told why.
            We may remove any image at any time, for these reasons or for any
            other reason under "Moderation and suspension", and removed images
            can be appealed like any other removal.
          </LegalText>
        </LegalSection>
      )}

      <LegalSection id="notifications" heading="Notifications">
        <LegalText>
          We send you in-app notifications about activity on your content, such
          as likes, comments and new followers, about group invitations, and
          about moderation actions that affect you, such as a post being
          removed. You can delete your notifications at any time.
        </LegalText>
      </LegalSection>

      <LegalSection id="removal-notices" heading="Removal notices and appeals">
        <LegalText>
          When we remove your content or suspend your account, we tell you why.
          You can appeal a removal or suspension once per action. If we agree
          with your appeal, we restore the removed content or end the
          suspension.
        </LegalText>
      </LegalSection>

      <LegalSection id="reporting" heading="Reporting">
        <LegalText>
          If you are signed in, you can report posts, comments and profiles from
          the site itself. If you are not signed in, you can report content by
          emailing{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </LegalText>
      </LegalSection>

      <LegalSection id="your-content" heading="Your content">
        <LegalText>
          Content you create, such as teams, profile details and posts, stays
          yours. By sharing it on OHKOLab, you give us permission to store it
          and display it as part of the site, for example by showing your public
          teams and profile to other visitors. This permission ends when you
          delete the content or your account.
        </LegalText>
      </LegalSection>

      <LegalSection id="no-warranty" heading="No warranty">
        <LegalText>
          OHKOLab is provided "as is", without warranty of any kind. We do not
          promise that the site will be available, correct or uninterrupted, and
          we are not responsible for any loss that comes from using it.
        </LegalText>
      </LegalSection>

      <LegalSection id="changes" heading="Changes to these terms">
        <LegalText>
          We may update these terms as OHKOLab grows. The "last updated" date at
          the top of this page shows the current version. If you keep using
          OHKOLab after a change, you accept the updated terms.
        </LegalText>
      </LegalSection>

      <LegalSection id="contact" heading="Contact">
        <LegalText>
          Questions about these terms? Email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          . See also our{" "}
          <Link
            to="/privacy"
            className="text-primary underline underline-offset-4"
          >
            privacy policy
          </Link>
          .
        </LegalText>
      </LegalSection>
    </div>
  );
}
