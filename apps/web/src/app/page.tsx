import Image from "next/image";
import { Button } from "@/components/Button";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { productPositioning } from "@/lib/product-positioning";

const steps = [
  {
    title: "Start from commitments you already have",
    description:
      "Connect Google, Outlook, or Apple Calendar when you want those events in the plan. You can use DayPilot without connecting one.",
  },
  {
    title: "Add the tasks that still need a place",
    description:
      "Tasks sit next to the calendar so the day includes work that is not already an event.",
  },
  {
    title: "Read the day before you add more",
    description:
      "Pilot Brief summarises what is already scheduled. Schedule suggestions stay suggestions until you add them.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <MarketingNav ctaLabel="Get started" />

      <main>
        <section className="container-width section-padding pt-16 md:pt-24 lg:pt-28 pb-10 md:pb-14 text-center">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
            <p className="text-sm font-medium tracking-wide text-[var(--brand-500)]">
              Calendar and tasks, one day at a time
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] leading-tight">
              {productPositioning}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed px-4">
              DayPilot is for people whose day is already full of meetings and
              leftover tasks. It shows a plan you can finish, and you decide
              what gets added.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2 md:pt-4 px-4">
              <Button
                href="/signup"
                size="lg"
                className="w-full sm:w-auto min-w-[180px]"
              >
                Start on the web
              </Button>
              <Button
                href="/login"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto min-w-[180px]"
              >
                Sign in
              </Button>
            </div>
            <p className="text-sm text-[var(--text-tertiary)] px-4">
              The web app is the way in from this site. The iOS app uses the
              same account after you sign in.
            </p>
          </div>
        </section>

        <section
          className="container-width section-padding pb-16 md:pb-24"
          aria-label="Product preview"
        >
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[0_0_80px_rgba(66,232,95,0.08)]">
            <Image
              src="/brand/dashboard-preview.png"
              alt="DayPilot calendar with the day's events in one view"
              width={1200}
              height={750}
              className="h-auto w-full"
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              unoptimized
            />
          </div>
        </section>

        <section className="container-width section-padding py-16 md:py-24">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3 md:mb-4">
              How a day gets planned
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto px-4">
              Three things you can do on the first visit. None of them require a
              calendar connection.
            </p>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 list-none p-0 m-0">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 md:p-8"
              >
                <p className="text-sm font-medium text-[var(--brand-500)] mb-2">
                  {index + 1}
                </p>
                <h3 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] mb-2 md:mb-3">
                  {step.title}
                </h3>
                <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="container-width section-padding py-16 md:py-24">
          <div className="max-w-3xl mx-auto rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 md:p-12 space-y-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Let someone book a time you already set aside
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Create a booking link and share it. The other person picks from
              the hours you offered, in your timezone, and leaves a name and
              email. Confirmed bookings show on your DayPilot calendar. They can
              save a calendar file, and DayPilot emails that file as a
              confirmation. You can pause the link. New links start with weekday
              hours, 09:00–17:00.
            </p>
            <Button href="/booking-links" size="lg">
              Create a booking link
            </Button>
          </div>
        </section>

        <section className="container-width section-padding py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 md:p-12 lg:p-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
              Plan today on the web
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)]">
              Create an account, then add a task or connect a calendar. You stay
              in control of what goes on the schedule.
            </p>
            <Button href="/signup" size="lg">
              Start on the web
            </Button>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
