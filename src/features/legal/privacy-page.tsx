import { Link } from "react-router";
import { Page } from "@/components/page";
import { TelemetrySwitch } from "@/features/feedback/telemetry-switch";
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
            has no advertising. We collect anonymous, cookieless usage
            statistics and crash reports to find and fix problems, and you can
            turn both off at any time (see "Crash reports and usage statistics"
            below).
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
            follows, reports, blocks, groups and notifications. These features
            store the content and interactions you create, such as your posts,
            comments, likes and follows, so they can be shown to you and to
            other people. Reports are seen by our moderators, and blocks hide
            another person's content from you.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">Groups</h2>
          <p className="text-sm text-muted-foreground">
            Groups store their name, description, whether they are public or
            invite-only, and their owner. For each member, we store their role
            and membership status. Anyone can see a group's name and
            description, and who belongs to a public group. In an invite-only
            group, only members can see the member list. You can always see your
            own memberships.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Notifications
          </h2>
          <p className="text-sm text-muted-foreground">
            Notifications store what happened, such as a like, comment, follow
            or group invitation, who did it, when it happened, and whether you
            have read it. Only you can see your notifications.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Crash reports and usage statistics
          </h2>
          <p className="text-sm text-muted-foreground">
            To keep OHKOLab working, we collect two kinds of telemetry, and both
            are anonymous and cookieless:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <strong className="font-medium">Crash reports.</strong> When
              something breaks, the app sends a report to Sentry (hosted in the
              EU). It contains the error, the page you were on, your app
              version, browser and screen size, a random session id and, when
              you are signed in, your account id (a random code, not your name
              or email). It never contains your posts, comments, bio, team
              details beyond Pokémon and move names, username, display name,
              email, password, auth tokens or IP address. Crash reports are kept
              for about 30 days.
            </li>
            <li>
              <strong className="font-medium">Usage statistics.</strong> We use
              PostHog (hosted in the EU) to count which pages are visited and
              which features are used, so we know what to improve. Page views
              are recorded by page name only, never by full URL, and nothing is
              written to cookies. Usage statistics are kept for up to 1 year.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            You can turn crash reports and usage statistics off with the switch
            below. Turning them off stops both immediately. If your browser
            sends a Global Privacy Control or Do Not Track signal, we honour it
            by turning usage statistics off; crash reports stay on unless you
            use the switch.
          </p>
          <TelemetrySwitch />
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">Feedback</h2>
          <p className="text-sm text-muted-foreground">
            When you send feedback through the site, we store your message, its
            kind (bug, idea or other), and, if you leave the technical details
            checkbox on, the page you were on, your app version, browser, screen
            size and the id of a crash if one just happened. Feedback is tied to
            your account so we can follow up, and is seen by our moderators. We
            keep feedback until it has been handled plus 12 months, and it is
            deleted with your account.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base leading-tight font-semibold">
            Moderation and appeals
          </h2>
          <p className="text-sm text-muted-foreground">
            When content is removed or an account is suspended, we store what
            was removed or suspended, the reason, which moderator handled it,
            and when. If you appeal, we store your appeal message and its
            outcome. Moderators can see moderation actions and appeals. You can
            see actions that affect you and your own appeals.
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
              return to it,
            </li>
            <li>
              whether you have turned crash reports and usage statistics off,
              and
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
            Crash reports go to Sentry and usage statistics go to PostHog, both
            hosted in the EU, as described above; see Sentry's{" "}
            <a
              href="https://sentry.io/privacy/"
              className="text-primary underline underline-offset-4"
            >
              privacy policy
            </a>{" "}
            and PostHog's{" "}
            <a
              href="https://posthog.com/privacy/"
              className="text-primary underline underline-offset-4"
            >
              privacy policy
            </a>
            . Other than that, OHKOLab does not send your data to anyone else.
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
            . This permanently removes your account, your profile, your saved
            teams, your posts, comments, likes, follows, blocks, group
            memberships and groups you own, your notifications and your appeals
            from our servers. We keep records of moderation actions, but once
            your account is deleted they no longer link to you. It does not
            remove data stored in your browser; clear your browser's site data
            for that.
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
