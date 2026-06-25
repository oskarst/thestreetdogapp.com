import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Street Dog",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-10">
      <Link
        href="/register"
        className="font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground hover:text-ink no-underline"
      >
        ← Back
      </Link>

      <h1 className="text-[28px] font-bold tracking-[-0.02em] mt-4 mb-1">
        Privacy Policy
      </h1>
      <p className="text-sm text-muted-foreground mb-1">
        How The Street Dog App collects, uses, and shares your information.
      </p>
      <p className="text-xs text-muted-foreground mb-8">
        Last updated: 11 June 2026
      </p>

      <section className="space-y-6 text-[15px] leading-relaxed text-ink">
        <div>
          <h2 className="text-lg font-semibold mb-2">1. Who we are</h2>
          <p>
            The Street Dog App (&quot;Street Dog&quot;, &quot;we&quot;,
            &quot;us&quot;) is a community tool for spotting and logging street
            dogs in Tbilisi. This policy explains what data we handle and your
            choices. It sits alongside our{" "}
            <Link
              href="/terms"
              className="text-ink underline underline-offset-2"
            >
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. What we collect</h2>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>
              <strong>Account:</strong> your email address, a nickname, and a
              password (stored only as a secure hash by our auth provider).
            </li>
            <li>
              <strong>Dog data you create:</strong> photos of dogs and ear tags,
              the location (GPS coordinates) of a sighting, and details you enter
              (tag id, size, character, age, gender, notes).
            </li>
            <li>
              <strong>Location:</strong> precise location is read only when you
              log a sighting or use the map, and only with your device&apos;s
              permission.
            </li>
            <li>
              <strong>Technical:</strong> basic logs (e.g. error and abuse-
              prevention data) generated when you use the app.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. How we use it</h2>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Run the app and show logged dogs to the community.</li>
            <li>
              Power gameplay features — your score, level, and the leaderboard.
            </li>
            <li>
              Screen uploaded images for inappropriate content and keep the
              service safe and free of abuse.
            </li>
            <li>Respond to your reports and support requests.</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> sell your personal data, and we do not use
            it for third-party advertising.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. What&apos;s public</h2>
          <p>
            To make the app work, some information is visible to other users:
            your <strong>nickname</strong> (e.g. on dogs you registered and on
            the leaderboard) and the <strong>dog data points</strong> you create
            (the dogs, photos, locations, and sighting details). Your email and
            password are never shown to other users.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">
            5. Service providers we use
          </h2>
          <p>
            We share data with a small set of processors purely to operate the
            app:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>Supabase</strong> — database, authentication, and image
              storage.
            </li>
            <li>
              <strong>Vercel</strong> — application hosting and delivery.
            </li>
            <li>
              <strong>OpenAI</strong> — automated screening of uploaded images
              for inappropriate content.
            </li>
            <li>
              <strong>Map providers</strong> (OpenStreetMap / CARTO) — map tiles
              for the map view.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">6. Cookies</h2>
          <p>
            We use only the cookies needed to keep you signed in. We don&apos;t
            use advertising or cross-site tracking cookies.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">7. Retention</h2>
          <p>
            We keep your data while your account is active. When you delete your
            dog data, it is soft-deleted, so it is hidden from the app and from
            scores. Backups are rotated on a regular schedule.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">8. Your rights</h2>
          <p>
            You can access, export, correct, or delete your data at any time from{" "}
            <strong>Account → Privacy &amp; Data</strong> in the app
            (export your data as a file, or delete it). Depending on where you
            live, you may also have the right to object to or restrict certain
            processing, and to complain to your local data-protection authority.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">9. Children</h2>
          <p>
            Street Dog is not intended for children under 13 (or the minimum age
            in your country). We don&apos;t knowingly collect data from children
            under that age.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">10. Security</h2>
          <p>
            Data is encrypted in transit, access is restricted by row-level
            security, and passwords are never stored in plain text. No system is
            perfectly secure, but we take reasonable measures to protect your
            data.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">
            11. International transfers
          </h2>
          <p>
            Our providers may process data on servers outside your country. We
            rely on those providers&apos; safeguards for any such transfers.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">12. Changes</h2>
          <p>
            We may update this policy from time to time. If we make important
            changes, we&apos;ll let you know in the app.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">13. Contact</h2>
          <p>
            Questions about your privacy? Reach us through the{" "}
            <strong>Support</strong> screen in the app, or at{" "}
            <a
              href="mailto:hello@developers-alliance.com"
              className="text-ink underline underline-offset-2"
            >
              hello@developers-alliance.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
