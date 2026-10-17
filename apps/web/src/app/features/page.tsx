import type { Metadata } from "next";
import { AppStoreBadge } from "@/components/AppStoreBadge";
import { Button } from "@/components/Button";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { productPositioning } from "@/lib/product-positioning";

export const metadata: Metadata = {
  title: "Features",
  description: productPositioning,
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <MarketingNav />
      <main id="main">
        <section className="container-width section-padding py-16 md:py-24 lg:py-32 text-center">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] leading-tight px-4">
              {productPositioning}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-[var(--text-secondary)] leading-relaxed px-4">
              These are the parts of DayPilot you can use after you sign in on
              the web. You can add a task or an event before you connect a
              calendar.
            </p>
          </div>
        </section>
        <section className="container-width section-padding pb-16 md:pb-24 lg:pb-32">
          <FeatureGrid />
        </section>
        <section className="container-width section-padding pb-16 md:pb-24 lg:pb-32 text-center">
          <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
              Plan today on the web
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)]">
              Create an account, then add a task or connect a calendar.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button href="/signup" size="lg">
                Start on the web
              </Button>
              <AppStoreBadge />
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
