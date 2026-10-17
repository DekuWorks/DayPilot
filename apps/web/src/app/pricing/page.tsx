import type { Metadata } from "next";
import { plansForWeb } from "@daypilot/lib";
import { AppStoreBadge } from "@/components/AppStoreBadge";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import { PlanCatalog } from "@/components/pricing/PlanCatalog";
import { publicOfferCatalog } from "@/lib/site-metadata";

const description =
  "Free forever. Founding 25 is $5/month for the first 25 paid members. Pro is $10/month. Team is planned at $20/month and Enterprise is custom. Team and Enterprise are coming soon.";

export const metadata: Metadata = {
  title: "Pricing",
  description,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "DayPilot pricing",
    description,
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(publicOfferCatalog(plansForWeb())),
        }}
      />
      <MarketingNav />
      <section className="container-width section-padding py-16 text-center md:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl space-y-4 md:space-y-6">
          <h1 className="px-4 text-3xl font-bold leading-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl lg:text-6xl">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h1>
          <p className="px-4 text-base leading-relaxed text-[var(--text-secondary)] md:text-lg lg:text-xl">
            Free stays free. Founding 25 and Pro are bought in the DayPilot iOS
            app. Team and Enterprise are coming soon.
          </p>
          <div className="flex justify-center pt-2">
            <AppStoreBadge />
          </div>
        </div>
      </section>
      <section className="container-width section-padding pb-16 md:pb-24 lg:pb-32">
        <PlanCatalog />
      </section>
      <section className="container-width section-padding pb-16 text-center md:pb-24 lg:pb-32">
        <div className="mx-auto max-w-2xl space-y-3 px-4 md:space-y-4">
          <p className="text-base text-[var(--text-secondary)] md:text-lg">
            Prices shown are the intended US dollar prices. The App Store shows
            the price for your country. Paid plans are bought in the DayPilot
            iOS app, and they apply on the website too.
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Questions?{" "}
            <a
              href="mailto:dekuworks1@gmail.com?subject=DayPilot%20question"
              className="font-medium text-[var(--brand-500)] hover:underline"
            >
              Contact us
            </a>
          </p>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
