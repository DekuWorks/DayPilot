import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { MarketingNav } from "@/components/MarketingNav";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <MarketingNav ctaLabel="Get Started Free" />

      <section className="container-width section-padding pt-16 md:pt-24 lg:pt-28 pb-10 md:pb-14 text-center">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          <p className="text-sm font-medium tracking-wide text-[var(--brand-500)]">
            Plan. Pilot. Perform.
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] leading-tight">
            Plan smarter.{" "}
            <span className="gradient-text">Perform better.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed px-4">
            Bring your calendar, tasks, meetings, and daily planning into one
            intelligent workspace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2 md:pt-4 px-4">
            <Link href="/signup" className="w-full sm:w-auto inline-block">
              <Button size="lg" className="w-full sm:w-auto min-w-[180px]">
                Get Started Free
              </Button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto inline-block">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto min-w-[180px]"
              >
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container-width section-padding pb-16 md:pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[0_0_80px_rgba(66,232,95,0.08)]">
          <Image
            src="/brand/dashboard-preview.png"
            alt="DayPilot dashboard preview"
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
            One workspace for your day
          </h2>
          <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto px-4">
            Calendar, tasks, meetings, notes, and Pilot Brief — unified and
            intelligent.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[
            {
              title: "Connected calendars",
              description:
                "See Google, Outlook, and booking events in one schedule.",
            },
            {
              title: "Tasks & focus",
              description:
                "Prioritize what matters with reminders, due dates, and focus blocks.",
            },
            {
              title: "Pilot Brief",
              description:
                "Start each day with an AI summary grounded in your real schedule.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 md:p-8"
            >
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

      <section className="container-width section-padding py-16 md:py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 md:p-12 lg:p-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
            Ready to pilot your day?
          </h2>
          <p className="text-base md:text-lg text-[var(--text-secondary)]">
            Get started free. Bring your calendars and take control of your
            schedule.
          </p>
          <Link href="/signup" className="inline-block">
            <Button size="lg">Get Started Free</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
