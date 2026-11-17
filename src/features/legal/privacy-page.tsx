import { Link } from "react-router";
import { Page } from "@/components/page";
import { CONTACT_EMAIL, LAST_UPDATED } from "@/features/legal/legal-info";

export function PrivacyPage() {
  return (
    <Page
      title="Privacy Policy"
      description={`Last updated ${LAST_UPDATED}`}
      width="narrow"
    >
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            What this page covers
          </h2>
          <p className="text-sm text-muted-foreground">
            This page explains what OHKOLab stores about you and why. OHKOLab
            has no advertising and no analytics: we do not track what you do on
            the site.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Your account
          </h2>
          <p className="text-sm text-muted-foreground">
            When you create an account, our sign-in provider, Supabase, stores
            your email address, a hashed password if you sign up with email, or
            the provider you used if you sign in with Google or Discord. It also
            stores that you confirmed being 13 or older and accepted the terms,
            with the date of that confirmation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Your public profile
          </h2>
          <p className="text-sm text-muted-foreground">
            Your profile stores your username, and an optional display name,
            avatar and bio. Profile pages are public: anyone can view them at
            ohkolab.com/u/your-username.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">Your teams</h2>
          <p className="text-sm text-muted-foreground">
            Teams you save store their name, their format (singles or doubles)
            and their Pokémon sets. Saved teams are private by default: only you
            can see them. If you turn on a team's "Public" switch, other
            visitors can view that team.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Community features
          </h2>
          <p className="text-sm text-muted-foreground">
            OHKOLab is adding community features: posts, comments, likes,
            follows, reports and blocks. These features store the content and
            interactions you create, such as your posts, comments, likes and
            follows, so they can be shown to you and to other people. Reports
            are seen by our moderators, and blocks hide another person's content
            from you.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            What stays in your browser
          </h2>
          <p className="text-sm text-muted-foreground">
            Some data never leaves your browser and is kept in its local
            storage:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
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
              return to it, and
            </li>
            <li>your sign-in session, which keeps you signed in.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Clearing your browser's site data for OHKOLab removes all of this.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Third parties
          </h2>
          <p className="text-sm text-muted-foreground">
            Pokémon sprites are loaded from play.pokemonshowdown.com, so that
            host sees the requests your browser makes for those images. If you
            sign in with Google or Discord, that provider handles your sign-in.
            Other than that, OHKOLab does not send your data to anyone else.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Deleting your account
          </h2>
          <p className="text-sm text-muted-foreground">
            You can delete your account from your{" "}
            <Link
              to="/profile"
              className="text-primary underline underline-offset-4"
            >
              profile page
            </Link>
            . This permanently removes your account, your profile and your saved
            teams from our servers. It does not remove data stored in your
            browser; clear your browser's site data for that.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Changes to this policy
          </h2>
          <p className="text-sm text-muted-foreground">
            We may update this policy as OHKOLab grows. The "last updated" date
            at the top of this page shows the current version.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">Contact</h2>
          <p className="text-sm text-muted-foreground">
            Questions about your data? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
            . See also our{" "}
            <Link
              to="/terms"
              className="text-primary underline underline-offset-4"
            >
              terms of service
            </Link>
            .
          </p>
        </section>
      </div>
    </Page>
  );
}
