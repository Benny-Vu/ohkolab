import { Link } from "react-router";
import { Page } from "@/components/page";
import { CONTACT_EMAIL, LAST_UPDATED } from "@/features/legal/legal-info";

export function TermsPage() {
  return (
    <Page
      title="Terms of Service"
      description={`Last updated ${LAST_UPDATED}`}
      width="narrow"
    >
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            An unofficial fan project
          </h2>
          <p className="text-sm text-muted-foreground">
            OHKOLab is an unofficial fan project for Pokémon Champions. It is
            not affiliated with, endorsed or sponsored by Nintendo, Game Freak,
            Creatures or The Pokémon Company. Pokémon and Pokémon Champions are
            trademarks of their respective owners.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Who can use OHKOLab
          </h2>
          <p className="text-sm text-muted-foreground">
            You must be at least 13 years old to create an account. By using
            OHKOLab, you confirm that you meet this age requirement.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Acceptable use
          </h2>
          <p className="text-sm text-muted-foreground">
            OHKOLab lets you share content, such as public teams, profile
            details and community posts. Do not post or share content that:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>harasses, threatens or bullies other people,</li>
            <li>promotes hate or discrimination against anyone,</li>
            <li>contains sexual material,</li>
            <li>is spam or deliberately misleading, or</li>
            <li>is illegal, or breaks any law or rule that applies to you.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Moderation and suspension
          </h2>
          <p className="text-sm text-muted-foreground">
            We may remove content that breaks these terms, and we may suspend or
            delete accounts that break them seriously or repeatedly. We may also
            remove content for other reasons, such as keeping OHKOLab working
            and safe.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Your content
          </h2>
          <p className="text-sm text-muted-foreground">
            Content you create, such as teams, profile details and posts, stays
            yours. By sharing it on OHKOLab, you give us permission to store it
            and display it as part of the site, for example by showing your
            public teams and profile to other visitors. This permission ends
            when you delete the content or your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">No warranty</h2>
          <p className="text-sm text-muted-foreground">
            OHKOLab is provided "as is", without warranty of any kind. We do not
            promise that the site will be available, correct or uninterrupted,
            and we are not responsible for any loss that comes from using it.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Changes to these terms
          </h2>
          <p className="text-sm text-muted-foreground">
            We may update these terms as OHKOLab grows. The "last updated" date
            at the top of this page shows the current version. If you keep using
            OHKOLab after a change, you accept the updated terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">Contact</h2>
          <p className="text-sm text-muted-foreground">
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
          </p>
        </section>
      </div>
    </Page>
  );
}
