import { Link } from "react-router";

import {
  LegalList,
  LegalPage,
  LegalSection,
  LegalText,
} from "@/features/legal/legal-page";
import { CONTACT_EMAIL, LAST_UPDATED } from "@/features/legal/legal-info";

const SECTIONS = [
  { id: "operator", heading: "Who runs OHKOLab" },
  { id: "unofficial", heading: "An unofficial fan project" },
  { id: "who-can-use", heading: "Who can use OHKOLab" },
  { id: "acceptable-use", heading: "Acceptable use" },
  { id: "moderation", heading: "Moderation and suspension" },
  { id: "groups", heading: "Groups" },
  { id: "notifications", heading: "Notifications" },
  { id: "removal-notices", heading: "Removal notices and appeals" },
  { id: "reporting", heading: "Reporting" },
  { id: "your-content", heading: "Your content" },
  { id: "no-warranty", heading: "No warranty" },
  { id: "changes", heading: "Changes to these terms" },
  { id: "contact", heading: "Contact" },
];

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description={`Last updated ${LAST_UPDATED}`}
      sections={SECTIONS}
    >
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
            OHKOLab is an unofficial fan project for Pokémon Champions. It is
            not affiliated with, endorsed or sponsored by Nintendo, Game Freak,
            Creatures or The Pokémon Company. Pokémon and Pokémon Champions are
            trademarks of their respective owners.
          </LegalText>
        </LegalSection>

        <LegalSection id="who-can-use" heading="Who can use OHKOLab">
          <LegalText>
            You must be at least 13 years old to create an account. By using
            OHKOLab, you confirm that you meet this age requirement.
          </LegalText>
        </LegalSection>

        <LegalSection id="acceptable-use" heading="Acceptable use">
          <LegalText>
            OHKOLab lets you share content, such as public teams, profile
            details and community posts. Do not post or share content that:
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
            remove content for other reasons, such as keeping OHKOLab working
            and safe.
          </LegalText>
        </LegalSection>

        <LegalSection id="groups" heading="Groups">
          <LegalText>
            Groups are spaces that members create and run themselves. Group
            owners and group moderators are responsible for what happens in
            their group, including its posts and its members. We may remove a
            group, or take away an owner's or moderator's role, if a group
            breaks these terms.
          </LegalText>
        </LegalSection>

        <LegalSection id="notifications" heading="Notifications">
          <LegalText>
            We send you in-app notifications about activity on your content,
            such as likes, comments and new followers, about group invitations,
            and about moderation actions that affect you, such as a post being
            removed. You can delete your notifications at any time.
          </LegalText>
        </LegalSection>

        <LegalSection
          id="removal-notices"
          heading="Removal notices and appeals"
        >
          <LegalText>
            When we remove your content or suspend your account, we tell you
            why. You can appeal a removal or suspension once per action. If we
            agree with your appeal, we restore the removed content or end the
            suspension.
          </LegalText>
        </LegalSection>

        <LegalSection id="reporting" heading="Reporting">
          <LegalText>
            If you are signed in, you can report posts, comments and profiles
            from the site itself. If you are not signed in, you can report
            content by emailing{" "}
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
            and display it as part of the site, for example by showing your
            public teams and profile to other visitors. This permission ends
            when you delete the content or your account.
          </LegalText>
        </LegalSection>

        <LegalSection id="no-warranty" heading="No warranty">
          <LegalText>
            OHKOLab is provided "as is", without warranty of any kind. We do not
            promise that the site will be available, correct or uninterrupted,
            and we are not responsible for any loss that comes from using it.
          </LegalText>
        </LegalSection>

        <LegalSection id="changes" heading="Changes to these terms">
          <LegalText>
            We may update these terms as OHKOLab grows. The "last updated" date
            at the top of this page shows the current version. If you keep using
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
    </LegalPage>
  );
}
