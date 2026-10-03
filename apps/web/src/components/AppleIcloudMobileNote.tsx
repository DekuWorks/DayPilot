import Link from "next/link";
import { APPLE_CALENDAR_DEEP_LINK } from "@/lib/apple-calendar-deeplink";

/** Shown in the signed-in web app. iCloud sync is done on the phone. */
export function AppleIcloudMobileNote() {
  return (
    <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]">
      <p className="font-medium text-[var(--text-primary)]">
        Sync Apple iCloud on your phone
      </p>
      <p className="mt-1">
        Apple iCloud syncs from the DayPilot mobile app. Open the app, go to
        Sync, and connect Apple Calendar. Google and Outlook can be connected on
        this site.
      </p>
      <p className="mt-2">
        <a
          href={APPLE_CALENDAR_DEEP_LINK}
          className="text-[var(--brand-500)] hover:underline"
        >
          Open the DayPilot app
        </a>
        {" · "}
        <Link
          href="/app/integrations/apple-calendar"
          className="text-[var(--brand-500)] hover:underline"
        >
          Setup instructions
        </Link>
      </p>
    </div>
  );
}
