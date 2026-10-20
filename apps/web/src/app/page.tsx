import type { Metadata } from "next";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingNav } from "@/components/MarketingNav";
import {
  HomeHero,
  IosScreens,
  ScreenCards,
  ValueStrip,
} from "@/components/marketing/HomeSections";
import { LaunchPricing } from "@/components/marketing/LaunchPricing";
import { APP_STORE_NAME, APP_STORE_URL } from "@/lib/app-store";
import { canonicalSiteUrl, publicSiteJsonLd } from "@/lib/site-metadata";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const site = canonicalSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            publicSiteJsonLd({
              origin: site.origin,
              appName: APP_STORE_NAME,
              appUrl: APP_STORE_URL,
            }),
          ),
        }}
      />
      <MarketingNav ctaLabel="Get started" />

      <main id="main">
        <HomeHero />
        <ValueStrip />
        <ScreenCards />
        <IosScreens />
        <LaunchPricing />
      </main>
      <MarketingFooter />
    </div>
  );
}
