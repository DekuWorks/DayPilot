import Link from "next/link";

/** Universal-link style handoff page for Apple Calendar setup on iPhone. */
export default function AppleCalendarHandoffPage() {
  const deepLink = "com.daypilot.daypilot://integrations/apple-calendar";

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] px-6 py-16">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Apple Calendar setup</h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          iCloud calendars connect through the DayPilot iOS app using Apple
          EventKit. Sign in with Apple only authenticates your account — it does
          not grant calendar access.
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-[var(--text-secondary)]">
          <li>Open the DayPilot app on your iPhone.</li>
          <li>Go to Profile → Sync → Connect Apple Calendar.</li>
          <li>Allow calendar access and select calendars.</li>
          <li>Return here — events appear on the web calendar (read-only).</li>
        </ol>
        <a
          href={deepLink}
          className="inline-flex items-center justify-center rounded-xl bg-[var(--brand-500)] text-black font-semibold px-4 py-3"
        >
          Open DayPilot app
        </a>
        <p className="text-sm text-[var(--text-tertiary)]">
          Already signed in on web?{" "}
          <Link href="/sync" className="text-[var(--brand-500)] hover:underline">
            Back to Sync
          </Link>
        </p>
      </div>
    </main>
  );
}
