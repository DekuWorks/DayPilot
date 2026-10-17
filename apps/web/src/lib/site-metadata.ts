export type PublicOfferPlan = {
  planId: string;
  name: string;
  description: string;
  availability: "available" | "coming_soon";
  marketingPrice: string;
};

/** Live site. daypilot.co redirects here. */
export const CANONICAL_ORIGIN = "https://www.daypilot.co";

/**
 * Prefer the www host. Local and preview origins are left alone.
 * An apex daypilot.co value is rewritten because that host redirects.
 */
export function canonicalSiteUrl(raw: string | undefined | null): URL {
  const fallback = new URL(CANONICAL_ORIGIN);
  if (raw == null || raw.trim() === "") return fallback;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    if (url.hostname === "daypilot.co") {
      url.protocol = "https:";
      url.hostname = "www.daypilot.co";
    }
    return url;
  } catch {
    return fallback;
  }
}

/** Facts we can verify: site name, canonical URL, and the iOS app listing. */
export function publicSiteJsonLd(input: {
  origin: string;
  appName: string;
  appUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "DayPilot",
        url: input.origin,
      },
      {
        "@type": "SoftwareApplication",
        name: input.appName,
        url: input.appUrl,
      },
    ],
  };
}

function offerPrice(plan: PublicOfferPlan): string | null {
  if (plan.marketingPrice === "Custom") return null;
  const price = plan.marketingPrice.replace(/^\$/, "");
  return price.length > 0 ? price : null;
}

/**
 * Public offers only. Team and Enterprise are waitlists, so they are omitted.
 * Founding availability changes with the live cap, so it has no stock claim.
 */
export function publicOfferCatalog(plans: PublicOfferPlan[]) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "DayPilot plans",
    itemListElement: plans
      .filter((plan) => plan.availability === "available")
      .map((plan) => {
        const price = offerPrice(plan);
        return {
          "@type": "Offer",
          name: plan.name,
          description: plan.description,
          priceCurrency: "USD",
          ...(price == null ? {} : { price }),
          ...(plan.planId === "free" || plan.planId === "pro"
            ? { availability: "https://schema.org/InStock" }
            : {}),
        };
      }),
  };
}
