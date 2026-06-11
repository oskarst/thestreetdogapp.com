import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions · Street Dog",
};

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <Link
        href="/register"
        className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink no-underline"
      >
        ← Back
      </Link>

      <h1 className="text-[28px] font-bold tracking-[-0.02em] mt-4 mb-1">
        Terms &amp; Conditions
      </h1>
      <p className="text-sm text-muted-foreground mb-1">
        Please read this before you sign up and start logging street dogs.
      </p>
      <p className="text-xs text-muted-foreground mb-8">Last updated: 11 June 2026</p>

      <section className="space-y-6 text-[15px] leading-relaxed text-ink">
        <div>
          <h2 className="text-lg font-semibold mb-2">1. Acceptance of terms</h2>
          <p>
            These Terms &amp; Conditions (&quot;Terms&quot;) are an agreement
            between you and The Street Dog App (&quot;Street Dog&quot;,
            &quot;we&quot;, &quot;us&quot;). By creating an account or using the
            app, you agree to these Terms. If you don&apos;t agree, please
            don&apos;t use the app.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Who can use the app</h2>
          <p>
            You must be at least 13 years old, or the minimum age required in
            your country, to use Street Dog. If you are under 18, you confirm
            that a parent or guardian is aware that you use the app. By using it,
            you confirm you can form a binding agreement with us.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Your account</h2>
          <p>
            You are responsible for your account and for keeping your password
            safe. Give accurate information when you sign up, and don&apos;t
            share your login or pretend to be someone else. Tell us right away if
            you think someone else is using your account. You are responsible for
            everything that happens under your account.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>break any law, or use the app for anything illegal;</li>
            <li>
              harass, threaten, or abuse other people, or harm animals in any
              way;
            </li>
            <li>
              upload content that is false, misleading, hateful, sexual,
              violent, or that you don&apos;t have the right to share;
            </li>
            <li>
              impersonate anyone, or post another person&apos;s private
              information;
            </li>
            <li>
              try to break, overload, scrape, reverse-engineer, or get
              unauthorised access to the app or its data;
            </li>
            <li>
              use bots or fake activity to game points, levels, or the
              leaderboard.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">
            5. Your content and the licence you give us
          </h2>
          <p>
            You keep ownership of the photos, notes, and other content you add
            (&quot;Your Content&quot;). By adding it, you give us a worldwide,
            non-exclusive, royalty-free licence to store, display, and share Your
            Content inside the app so it can do its job — helping the community
            find and care for street dogs. You confirm you have the right to
            share what you upload, and that it doesn&apos;t break anyone
            else&apos;s rights.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">
            6. Our intellectual property
          </h2>
          <p>
            The app itself — its name, logo, design, and software — belongs to us
            or our licensors. These Terms don&apos;t give you any right to copy,
            resell, or reuse them beyond normal use of the app.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">7. Third-party services</h2>
          <p>
            The app relies on third-party services (for example map tiles and
            hosting). We don&apos;t control them and aren&apos;t responsible for
            them. Map locations are approximate and may be inaccurate.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">
            8. The app is provided &quot;as is&quot;
          </h2>
          <p>
            We provide the app as it is, without warranties of any kind. We
            don&apos;t promise it will always be available, accurate, error-free,
            or secure, and we don&apos;t guarantee any particular result from
            using it.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">
            9. Limitation of liability
          </h2>
          <p>
            To the fullest extent allowed by law, Street Dog and the people
            behind it are not liable for any indirect, incidental, or
            consequential loss, or for any loss of data, arising from your use of
            the app. This is in addition to the safety terms in section 13 below.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">
            10. Suspension and termination
          </h2>
          <p>
            You can stop using the app and delete your data at any time. We may
            suspend or remove content or accounts that break these Terms or harm
            other users, animals, or the service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">
            11. Changes to these terms
          </h2>
          <p>
            We may update these Terms from time to time. If we make important
            changes, we&apos;ll let you know in the app. Continuing to use Street
            Dog after a change means you accept the updated Terms.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">12. Governing law</h2>
          <p>
            These Terms are governed by the laws of Georgia, without regard to
            its conflict-of-law rules.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">
            13. Safety — handling street dogs
          </h2>
          <p>
            Street Dog is a tool for spotting and logging street dogs. It is not
            a tool for handling them. The app and the people behind it are{" "}
            <strong>not responsible</strong> for anything that happens to you,
            another person, or an animal while you use it — including, but not
            limited to, dog bites, scratches, injuries, illness, or property
            damage.
          </p>
          <p className="mt-2">
            You take part entirely at your own risk. Keep a safe distance from
            any dog. You are <strong>never</strong> asked to touch, feed, corner,
            chase, pick up, or otherwise interact with a dog in any way that
            could be dangerous to you or to the animal. If a dog seems scared,
            hurt, or aggressive, stay back and report it instead of approaching
            it. Always use common sense and follow local laws.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">14. Data you share</h2>
          <p>
            To make the app work, some of your information is shared with other
            users and shown publicly in the app:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              Your <strong>username (nickname)</strong> — for example next to
              dogs you registered and on the leaderboard.
            </li>
            <li>
              The <strong>dog data points</strong> you create — the dogs you
              log, their photos, locations, and sighting details — are shared so
              the whole community can find and help those dogs.
            </li>
          </ul>
          <p className="mt-2">
            Your email and password are never shown to other users. You can
            export or delete your dog data at any time from your account
            settings.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">15. Contact</h2>
          <p>
            Questions about these Terms? Reach us through the{" "}
            <strong>Report a Problem</strong> or <strong>Support</strong> screen
            in the app.
          </p>
        </div>

        <p className="text-sm text-muted-foreground pt-4">
          By creating an account you confirm that you have read and agree to
          these Terms.
        </p>
      </section>
    </main>
  );
}
