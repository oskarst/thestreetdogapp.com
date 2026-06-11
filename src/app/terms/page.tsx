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
      <p className="text-sm text-muted-foreground mb-8">
        Please read this before you sign up and start logging street dogs.
      </p>

      <section className="space-y-6 text-[15px] leading-relaxed text-ink">
        <div>
          <h2 className="text-lg font-semibold mb-2">
            1. Your safety is your own
          </h2>
          <p>
            Street Dog is a tool for spotting and logging street dogs. It is not
            a tool for handling them. The app and the people behind it are{" "}
            <strong>not responsible</strong> for anything that happens to you,
            another person, or an animal while you use it — including, but not
            limited to, dog bites, scratches, injuries, illness, or property
            damage.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Use common sense</h2>
          <p>
            You take part entirely at your own risk. Keep a safe distance from
            any dog. You are <strong>never</strong> asked to touch, feed,
            corner, chase, pick up, or otherwise interact with a dog in any way
            that could be dangerous to you or to the animal. If a dog seems
            scared, hurt, or aggressive, stay back and report it instead of
            approaching it. Follow local laws and use good judgement at all
            times.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Data you share</h2>
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
          <h2 className="text-lg font-semibold mb-2">4. Be a good neighbour</h2>
          <p>
            Don&apos;t upload harmful, false, or inappropriate content, and
            don&apos;t use the app to harass people or harm animals. We may
            remove content or accounts that break these rules.
          </p>
        </div>

        <p className="text-sm text-muted-foreground pt-4">
          By creating an account you confirm that you have read and agree to
          these terms.
        </p>
      </section>
    </main>
  );
}
