import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/MarketingNav";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How DayPilot collects, uses, and protects your data — including calendar sync, Supabase, Google, and Apple sign-in.",
};

const updated = "5 August 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <MarketingNav />
      <article className="container-width section-padding py-12 md:py-20">
        <div className="mx-auto max-w-3xl space-y-10">
          <header className="space-y-3">
            <p className="text-sm font-medium tracking-wide text-[var(--brand-500)]">
              Legal
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] leading-tight">
              Privacy Policy
            </h1>
            <p className="text-sm md:text-base text-[var(--text-secondary)]">
              Last updated: {updated}
            </p>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              DayPilot (&quot;we&quot;, &quot;us&quot;) is a calendar and planning product
              operated by DekuWorks. This policy explains what we collect, why we
              collect it, and the choices you have. It covers the website at{" "}
              <a
                href="https://www.daypilot.co"
                className="text-[var(--brand-500)] hover:underline"
              >
                daypilot.co
              </a>
              , the DayPilot iOS app, and related APIs.
            </p>
          </header>

          <Section title="What we collect">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[var(--text-primary)]">Account data</strong>{" "}
                — email address, display name, and authentication identifiers when
                you sign up with email/password or Sign in with Google / Apple.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Calendar data</strong>{" "}
                — event titles, times, locations, descriptions, and calendar
                metadata you sync or create in DayPilot (for example via Google
                Calendar OAuth or iCloud CalDAV).
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">App usage</strong>{" "}
                — basic product analytics and diagnostics (for example crash
                reports) to keep the service reliable. We do not sell this data.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Support</strong>{" "}
                — messages you send to us (for example{" "}
                <a
                  href="mailto:hello@daypilot.co"
                  className="text-[var(--brand-500)] hover:underline"
                >
                  hello@daypilot.co
                </a>
                ).
              </li>
            </ul>
          </Section>

          <Section title="How we use your data">
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide your account, sync, and unified calendar views.</li>
              <li>
                Power optional features such as booking links, tasks, and Pilot
                Brief summaries grounded in your schedule.
              </li>
              <li>Authenticate you and keep your session secure.</li>
              <li>Respond to support requests and improve product reliability.</li>
            </ul>
            <p className="mt-4">
              We do not sell your personal data. We do not use your calendar
              contents for advertising.
            </p>
          </Section>

          <Section title="Services we rely on">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-[var(--text-primary)]">Supabase</strong>{" "}
                — authentication and cloud database hosting for account and app
                data.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Google</strong>{" "}
                — Sign in with Google (optional) and Google Calendar sync when you
                connect a Google account. Google receives only what is needed for
                OAuth and the calendar scopes you approve.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Apple</strong>{" "}
                — Sign in with Apple (optional). iCloud Calendar sync uses CalDAV
                with an Apple ID and an app-specific password that you enter in
                DayPilot; that credential is used to access your calendars and is
                not shared with third parties for marketing.
              </li>
              <li>
                Hosting and infrastructure providers that process data solely to
                run DayPilot (for example our API and static website hosting).
              </li>
            </ul>
            <p className="mt-4">
              Those providers process data under their own terms and privacy
              policies. You can disconnect Google or Apple calendar connections
              at any time in the app.
            </p>
          </Section>

          <Section title="Retention and security">
            <p>
              We retain account and synced data while your account is active, and
              for a limited period afterwards if needed for backups, security, or
              legal obligations. We use industry-standard transport security
              (HTTPS) and access controls. No method of transmission or storage is
              perfectly secure; please use a strong password and protect any
              app-specific passwords you create for iCloud.
            </p>
          </Section>

          <Section title="Your choices">
            <ul className="list-disc pl-5 space-y-2">
              <li>Update or delete calendar events you created in DayPilot.</li>
              <li>Disconnect Google Calendar or iCloud CalDAV sync in the app.</li>
              <li>
                Request account deletion or a copy of your data by emailing{" "}
                <a
                  href="mailto:hello@daypilot.co?subject=Privacy%20request"
                  className="text-[var(--brand-500)] hover:underline"
                >
                  hello@daypilot.co
                </a>
                .
              </li>
              <li>
                For Sign in with Apple, you can also manage the app under Apple ID
                settings on your device.
              </li>
            </ul>
          </Section>

          <Section title="Children">
            <p>
              DayPilot is not directed at children under 13. We do not knowingly
              collect personal data from children under 13. If you believe a child
              has provided data, contact us and we will delete it.
            </p>
          </Section>

          <Section title="International users">
            <p>
              DayPilot may be hosted in the United States or other regions. If you
              access the service from the UK, EEA, or elsewhere, your data may be
              processed outside your country. By using DayPilot you acknowledge
              that transfer. Where required by law, we take steps to protect
              transfers appropriately.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              We may update this policy from time to time. The &quot;Last
              updated&quot; date at the top will change when we do. Continued use
              after an update means you accept the revised policy.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about privacy:{" "}
              <a
                href="mailto:hello@daypilot.co?subject=Privacy%20Policy"
                className="text-[var(--brand-500)] hover:underline"
              >
                hello@daypilot.co
              </a>
              .
            </p>
            <p className="mt-2">
              DekuWorks · DayPilot ·{" "}
              <Link
                href="/"
                className="text-[var(--brand-500)] hover:underline"
              >
                www.daypilot.co
              </Link>
            </p>
          </Section>
        </div>
      </article>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
      <h2 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
