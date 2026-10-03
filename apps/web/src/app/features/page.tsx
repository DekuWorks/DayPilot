import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { productPositioning } from "@/lib/product-positioning";

export const metadata: Metadata = {
  title: "Features",
  description: productPositioning,
};

const features = [
  {
    icon: "📅",
    title: "Connected calendars",
    description:
      "Bring in Google, Outlook, or Apple Calendar when you want those events in one schedule. Connecting is optional.",
  },
  {
    icon: "✅",
    title: "Tasks",
    description:
      "Keep the work that is not already an event next to the calendar, with a due date.",
  },
  {
    icon: "📝",
    title: "Pilot Brief",
    description:
      "A short read of the day from your schedule and tasks. It does not change the calendar on its own.",
  },
  {
    icon: "🔗",
    title: "Booking links",
    description:
      "Share a link. The other person picks a time from the hours you set, in your timezone. Confirmed bookings show on your calendar. They can save a calendar file, and DayPilot emails that file as a confirmation. You can pause the link. New links start on weekdays, 09:00–17:00.",
  },
  {
    icon: "💬",
    title: "Schedule suggestions",
    description:
      "Describe a block of time, such as two hours for deep work tomorrow morning. DayPilot suggests slots. You choose what to add.",
  },
  {
    icon: "🔁",
    title: "Recurring events",
    description:
      "Events can keep a recurrence rule when a connected calendar provides one.",
  },
  {
    icon: "👥",
    title: "Meetings",
    description:
      "Track meetings separately from the rest of the day, including where they happen.",
  },
  {
    icon: "🎯",
    title: "Focus",
    description:
      "Start a focus session and see how long you have spent in focus this week.",
  },
  {
    icon: "📒",
    title: "Notes",
    description: "Write notes in the same account as your calendar and tasks.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <section className="container-width section-padding py-16 md:py-24 lg:py-32 text-center">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] leading-tight px-4">
            {productPositioning}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-[var(--text-secondary)] leading-relaxed px-4">
            These are the parts of DayPilot you can use after you sign in on the
            web.
          </p>
        </div>
      </section>
      <section className="container-width section-padding pb-16 md:pb-24 lg:pb-32">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-effect rounded-2xl p-6 md:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-4xl md:text-5xl mb-4" aria-hidden>
                {feature.icon}
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] mb-2 md:mb-3">
                {feature.title}
              </h3>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="container-width section-padding pb-16 md:pb-24 lg:pb-32 text-center">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
            Plan today on the web
          </h2>
          <p className="text-base md:text-lg text-[var(--text-secondary)]">
            Create an account, then add a task or connect a calendar.
          </p>
          <Button href="/signup" size="lg">
            Start on the web
          </Button>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
