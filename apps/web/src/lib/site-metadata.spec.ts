import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { APP_STORE_NAME, APP_STORE_URL } from "./app-store.ts";
import {
  CANONICAL_ORIGIN,
  canonicalSiteUrl,
  publicOfferCatalog,
  publicSiteJsonLd,
  type PublicOfferPlan,
} from "./site-metadata.ts";

const plans: PublicOfferPlan[] = [
  {
    planId: "free",
    name: "Free",
    description: "Free",
    availability: "available",
    marketingPrice: "$0",
  },
  {
    planId: "founding_pro",
    name: "Founding 25",
    description: "Founding",
    availability: "available",
    marketingPrice: "$5",
  },
  {
    planId: "pro",
    name: "Pro",
    description: "Pro",
    availability: "available",
    marketingPrice: "$10",
  },
  {
    planId: "team",
    name: "Team",
    description: "Team",
    availability: "coming_soon",
    marketingPrice: "$20",
  },
  {
    planId: "enterprise",
    name: "Enterprise",
    description: "Enterprise",
    availability: "coming_soon",
    marketingPrice: "Custom",
  },
];

test("canonical host is www, including when the apex URL is configured", () => {
  assert.equal(canonicalSiteUrl(undefined).origin, CANONICAL_ORIGIN);
  assert.equal(
    canonicalSiteUrl("https://daypilot.co").origin,
    CANONICAL_ORIGIN,
  );
  assert.equal(
    canonicalSiteUrl("https://www.daypilot.co").origin,
    CANONICAL_ORIGIN,
  );
  assert.equal(
    canonicalSiteUrl("http://localhost:3000").origin,
    "http://localhost:3000",
  );
  assert.equal(canonicalSiteUrl("not a url").origin, CANONICAL_ORIGIN);
});

test("structured data names the site and the iOS app, with no ratings", () => {
  const graph = publicSiteJsonLd({
    origin: CANONICAL_ORIGIN,
    appName: APP_STORE_NAME,
    appUrl: APP_STORE_URL,
  });
  const serialized = JSON.stringify(graph);
  assert.equal(graph["@graph"][0].name, "DayPilot");
  assert.equal(graph["@graph"][0].url, CANONICAL_ORIGIN);
  assert.equal(graph["@graph"][1].name, "DayPilot Daily");
  assert.match(serialized, /id6798407960/);
  assert.doesNotMatch(serialized, /aggregateRating|reviewCount|ratingValue/i);
});

test("offer catalog sells free, founding, and pro only", () => {
  const catalog = publicOfferCatalog(plans);
  const names = catalog.itemListElement.map((offer) => offer.name);
  assert.deepEqual(names, ["Free", "Founding 25", "Pro"]);
  const founding = catalog.itemListElement.find(
    (offer) => offer.name === "Founding 25",
  );
  const pro = catalog.itemListElement.find((offer) => offer.name === "Pro");
  assert.equal(founding?.price, "5");
  assert.equal(pro?.price, "10");
  assert.equal("availability" in (founding ?? {}), false);
  assert.equal(pro?.availability, "https://schema.org/InStock");
  assert.doesNotMatch(
    JSON.stringify(catalog),
    /Team|Enterprise|PreOrder|9\.99/,
  );
  const source = readFileSync(
    new URL("../../../../packages/lib/src/pricing/catalog.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /FOUNDING_LIMIT = 25/);
  assert.match(source, /marketingPrice: "\$5"/);
  assert.match(source, /marketingPrice: "\$10"/);
});
