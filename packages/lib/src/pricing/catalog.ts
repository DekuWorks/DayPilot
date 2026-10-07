/**
 * Canonical DayPilot launch pricing.
 * Web and the Nest API both import this module. The iOS app reads the same
 * fields from GET /billing/catalog and GET /billing/founding.
 *
 * Purchase buttons on iOS must use StoreKit's localized displayPrice.
 * `marketingPrice` is the intended USD price for comparison copy only.
 */

export const FOUNDING_LIMIT = 25;

export const FREE_BOOKING_LINK_LIMIT = 1;
export const FREE_CALENDAR_CONNECTION_LIMIT = 1;

/** Days of access granted when the app confirms a StoreKit transaction. */
export const APPLE_CONFIRM_PERIOD_DAYS = 30;

export const STOREKIT_FOUNDING_MONTHLY = "daypilot.pro.founding.monthly";
export const STOREKIT_PRO_MONTHLY = "daypilot.pro.monthly";

/** Kept so existing 1.0 / 1.0.1 receipts still map to Pro access. Not for sale. */
export const LEGACY_STOREKIT_PERSONAL = "co.daypilot.personal.monthly";
export const LEGACY_STOREKIT_BUSINESS = "co.daypilot.business.monthly";
export const LEGACY_STOREKIT_ENTERPRISE = "co.daypilot.enterprise.monthly";

export type PlanId = "free" | "founding_pro" | "pro" | "team" | "enterprise";

export type PlanAvailability = "available" | "coming_soon";

export type PlanEntitlement = "free" | "pro" | "team" | "enterprise";

export type PricingPlan = {
  planId: PlanId;
  name: string;
  description: string;
  availability: PlanAvailability;
  /** Intended USD comparison price. Not a StoreKit charge. */
  marketingPrice: string;
  marketingPriceDetail: string;
  storeKitProductId: string | null;
  billingPeriod: "month" | null;
  entitlement: PlanEntitlement;
  features: string[];
  limits: {
    bookingLinks: number | null;
    calendarConnections: number | null;
  };
  badge: string | null;
  cta: string;
  webDisplayOrder: number;
  mobileDisplayOrder: number;
  purchasable: boolean;
  highlighted: boolean;
};

export const PRO_ENTITLEMENT_NOTE =
  "Included with Pro. A Pro subscription covers this set. Some of these tools are still rolling out.";

export const FOUNDING_COPY = {
  kicker: "FOUNDING 25",
  headline: "Help shape the future of DayPilot.",
  body: "Join the first 25 paid members and unlock every Pro feature for only $5/month.",
  rate: "Your founding rate remains active while you stay subscribed.",
} as const;

export const TEAM_COPY = {
  kicker: "TEAM — COMING SOON",
  body: "Coordinate schedules, availability and bookings across your entire team.",
  price: "$20/month planned.",
} as const;

export const ENTERPRISE_COPY = {
  kicker: "ENTERPRISE — COMING SOON",
  body: "Advanced scheduling, administration and security for large organizations.",
  price: "Custom pricing.",
} as const;

const FREE_FEATURES = [
  "Day, week, and month calendar views",
  "Create, edit, and delete events",
  "Recurring events",
  "Reminders",
  "Basic calendar search",
  "Color-coded calendars",
  "1 external calendar connection",
  "Personal tasks",
  "1 personal booking link",
  "Basic smart suggestions",
  "Basic daily overview",
  "Limited AI usage",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Multiple calendar connections",
  "Google, Outlook, and Apple/iCloud calendars where available",
  "Advanced scheduling",
  "Availability search",
  "Conflict detection",
  "Suggested times",
  "Travel time and buffers",
  "Working hours",
  "Focus time",
  "Rescheduling",
  "Natural-language events",
  "AI scheduling",
  "Schedule optimization",
  "Conflict explanations",
  "Daily agenda",
  "Weekly planning",
  "Smart reminders",
  "Insights",
  "Pilot Brief",
  "Unlimited booking links",
  "Custom availability",
  "Minimum notice",
  "Maximum booking window",
  "Meeting buffers",
  "Daily meeting limits",
  "Custom booking questions",
  "Confirmation messages",
  "Cancellation and rescheduling",
  "Booking conflict checking",
  "Google Meet, Zoom, and Teams",
  "Slack and Discord destinations where supported",
  "Phone and in-person booking",
  "Booking-page profile image and colors",
  "Custom booking info",
  "Reduced branding",
  "Priority support",
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    planId: "free",
    name: "Free",
    description: "Your calendar, tasks, and one booking link. $0 forever.",
    availability: "available",
    marketingPrice: "$0",
    marketingPriceDetail: "forever",
    storeKitProductId: null,
    billingPeriod: null,
    entitlement: "free",
    features: FREE_FEATURES,
    limits: {
      bookingLinks: FREE_BOOKING_LINK_LIMIT,
      calendarConnections: FREE_CALENDAR_CONNECTION_LIMIT,
    },
    badge: null,
    cta: "Get Started Free",
    webDisplayOrder: 1,
    mobileDisplayOrder: 3,
    purchasable: false,
    highlighted: false,
  },
  {
    planId: "founding_pro",
    name: "Founding 25",
    description: FOUNDING_COPY.body,
    availability: "available",
    marketingPrice: "$5",
    marketingPriceDetail: "month",
    storeKitProductId: STOREKIT_FOUNDING_MONTHLY,
    billingPeriod: "month",
    entitlement: "pro",
    features: [
      "Every Pro feature",
      "Founding Member badge",
      "Early access to selected beta features",
      "Priority feedback opportunities",
      "Founding rate stays while you stay subscribed",
    ],
    limits: { bookingLinks: null, calendarConnections: null },
    badge: "FOUNDING 25",
    cta: "Become a Founding Member",
    webDisplayOrder: 2,
    mobileDisplayOrder: 1,
    purchasable: true,
    highlighted: true,
  },
  {
    planId: "pro",
    name: "Pro",
    description:
      "Manage and optimize your time with advanced scheduling, booking and AI tools.",
    availability: "available",
    marketingPrice: "$10",
    marketingPriceDetail: "month",
    storeKitProductId: STOREKIT_PRO_MONTHLY,
    billingPeriod: "month",
    entitlement: "pro",
    features: PRO_FEATURES,
    limits: { bookingLinks: null, calendarConnections: null },
    badge: null,
    cta: "Upgrade to Pro",
    webDisplayOrder: 3,
    mobileDisplayOrder: 2,
    purchasable: true,
    highlighted: false,
  },
  {
    planId: "team",
    name: "Team",
    description: TEAM_COPY.body,
    availability: "coming_soon",
    marketingPrice: "$20",
    marketingPriceDetail: "month planned",
    storeKitProductId: null,
    billingPeriod: "month",
    entitlement: "team",
    features: [
      "Everything in Pro (planned)",
      "Workspaces (planned)",
      "Roles (planned)",
      "Invitations (planned)",
      "Shared calendars (planned)",
      "Team scheduling (planned)",
      "Round-robin booking (planned)",
    ],
    limits: { bookingLinks: null, calendarConnections: null },
    badge: "Coming Soon",
    cta: "Join the Team Waitlist",
    webDisplayOrder: 4,
    mobileDisplayOrder: 4,
    purchasable: false,
    highlighted: false,
  },
  {
    planId: "enterprise",
    name: "Enterprise",
    description: ENTERPRISE_COPY.body,
    availability: "coming_soon",
    marketingPrice: "Custom",
    marketingPriceDetail: "pricing",
    storeKitProductId: null,
    billingPeriod: null,
    entitlement: "enterprise",
    features: [
      "Advanced scheduling for large organizations (planned)",
      "Administration controls (planned)",
      "Security controls for large organizations (planned)",
    ],
    limits: { bookingLinks: null, calendarConnections: null },
    badge: "Coming Soon",
    cta: "Join the Enterprise Waitlist",
    webDisplayOrder: 5,
    mobileDisplayOrder: 5,
    purchasable: false,
    highlighted: false,
  },
];

export function plansForWeb(): PricingPlan[] {
  return [...PRICING_PLANS].sort(
    (a, b) => a.webDisplayOrder - b.webDisplayOrder,
  );
}

export function plansForMobile(): PricingPlan[] {
  return [...PRICING_PLANS].sort(
    (a, b) => a.mobileDisplayOrder - b.mobileDisplayOrder,
  );
}

export function planById(planId: string): PricingPlan | undefined {
  return PRICING_PLANS.find((plan) => plan.planId === planId);
}

const PRO_ACCESS_PLAN_IDS = new Set<PlanId>([
  "founding_pro",
  "pro",
  "team",
  "enterprise",
]);

export function resolvePlanId(
  tier?: string | null,
  planId?: string | null,
): PlanId {
  if (planId === "founding_pro" || tier === "FoundingPro")
    return "founding_pro";
  if (planId === "enterprise" || tier === "Enterprise") return "enterprise";
  if (planId === "team" || tier === "Business") return "team";
  if (planId === "pro" || tier === "Pro" || tier === "Personal") return "pro";
  return "free";
}

export function planGrantsProAccess(planId: PlanId): boolean {
  return PRO_ACCESS_PLAN_IDS.has(planId);
}

export function subscriptionHasProAccess(input: {
  tier?: string | null;
  planId?: string | null;
  status?: string | null;
  currentPeriodEnd?: Date | string | null;
  now?: Date;
}): boolean {
  const planId = resolvePlanId(input.tier, input.planId);
  if (!planGrantsProAccess(planId)) return false;
  const status = (input.status ?? "active").toLowerCase();
  const now = input.now ?? new Date();
  const end = input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null;
  const endMs = end && !Number.isNaN(end.getTime()) ? end.getTime() : null;
  if (endMs != null && endMs <= now.getTime()) return false;
  if (status === "active" || status === "trialing" || status === "past_due") {
    return true;
  }
  // Canceling keeps access until the stored period end. With no end date,
  // a canceled row is treated as already finished.
  if (status === "canceled") return endMs != null && endMs > now.getTime();
  return false;
}

export function entitlementsForSubscription(input: {
  tier: string;
  planId?: string | null;
  status?: string | null;
  currentPeriodEnd?: Date | string | null;
  now?: Date;
}): {
  paid: boolean;
  hasProAccess: boolean;
  planId: PlanId;
  calendarSync: boolean;
  calendarConnectionLimit: number | null;
  bookingLinkLimit: number | null;
} {
  const planId = resolvePlanId(input.tier, input.planId);
  const hasProAccess = subscriptionHasProAccess(input);
  return {
    paid: hasProAccess,
    hasProAccess,
    planId,
    // Historical flag: true only for Pro-level access. Free accounts use
    // calendarConnectionLimit (1) and keep calendars they already connected.
    calendarSync: hasProAccess,
    calendarConnectionLimit: hasProAccess
      ? null
      : FREE_CALENDAR_CONNECTION_LIMIT,
    bookingLinkLimit: hasProAccess ? null : FREE_BOOKING_LINK_LIMIT,
  };
}

export function formatFounderNumber(founderNumber: number): string {
  return String(founderNumber).padStart(2, "0");
}

export function formatFoundingMemberLabel(founderNumber: number): string {
  return `Founding Member #${formatFounderNumber(founderNumber)}`;
}

export function formatSubscriptionDisplayName(input: {
  tier?: string | null;
  planId?: string | null;
  founderNumber?: number | null;
}): string {
  const planId = resolvePlanId(input.tier, input.planId);
  if (planId === "founding_pro") {
    return input.founderNumber
      ? formatFoundingMemberLabel(input.founderNumber)
      : "Founding Member";
  }
  if (input.tier === "Personal") return "Personal";
  if (input.tier === "Business") return "Business";
  if (input.tier === "Enterprise") return "Enterprise";
  return planById(planId)?.name ?? "Free";
}

export type AppleProductMapping = {
  tier: "FoundingPro" | "Pro" | "Personal" | "Business" | "Enterprise";
  planId: PlanId;
  founding: boolean;
};

export function appleProductMapping(
  productId: string,
  overrides?: {
    founding?: string;
    pro?: string;
    personal?: string;
    business?: string;
    enterprise?: string;
  },
): AppleProductMapping | null {
  const founding = overrides?.founding || STOREKIT_FOUNDING_MONTHLY;
  const pro = overrides?.pro || STOREKIT_PRO_MONTHLY;
  const personal = overrides?.personal || LEGACY_STOREKIT_PERSONAL;
  const business = overrides?.business || LEGACY_STOREKIT_BUSINESS;
  const enterprise = overrides?.enterprise || LEGACY_STOREKIT_ENTERPRISE;
  if (productId === founding) {
    return { tier: "FoundingPro", planId: "founding_pro", founding: true };
  }
  if (productId === pro) {
    return { tier: "Pro", planId: "pro", founding: false };
  }
  if (productId === personal) {
    return { tier: "Personal", planId: "pro", founding: false };
  }
  if (productId === business) {
    return { tier: "Business", planId: "team", founding: false };
  }
  if (productId === enterprise) {
    return { tier: "Enterprise", planId: "enterprise", founding: false };
  }
  return null;
}

export function purchasableStoreKitProductIds(): string[] {
  return PRICING_PLANS.map((plan) => plan.storeKitProductId).filter(
    (id): id is string => Boolean(id) && planIsPurchasable(id),
  );
}

function planIsPurchasable(productId: string | null | undefined): boolean {
  return PRICING_PLANS.some(
    (plan) => plan.purchasable && plan.storeKitProductId === productId,
  );
}

export type FoundingClaimRecord = {
  id: string;
  founderNumber: number;
  originalTransactionId: string;
  userId: string | null;
  periodEnd: Date;
};

export type FoundingDecision =
  | { action: "renew"; claimId: string; founderNumber: number }
  | { action: "create"; founderNumber: number }
  | { action: "reject"; reason: "closed" | "lost" | "taken" };

/**
 * Pure founding reservation. Expired claims stay in the list, so their
 * numbers are not reused and the 25 cap does not reopen.
 * Apple billing-retry grace is not modeled here: there is no App Store
 * Server Notification pipeline. Access follows periodEnd from the last
 * confirm or restore only.
 */
export function decideFoundingClaim(input: {
  claims: FoundingClaimRecord[];
  userId: string;
  originalTransactionId: string;
  now: Date;
  offerEnabled: boolean;
  limit?: number;
}): FoundingDecision {
  const limit = input.limit ?? FOUNDING_LIMIT;
  const txn = input.originalTransactionId.trim();
  const byTxn = input.claims.find(
    (claim) => claim.originalTransactionId === txn,
  );
  if (byTxn) {
    if (byTxn.userId == null) return { action: "reject", reason: "lost" };
    if (byTxn.userId !== input.userId)
      return { action: "reject", reason: "taken" };
    if (byTxn.periodEnd.getTime() <= input.now.getTime()) {
      return { action: "reject", reason: "lost" };
    }
    return {
      action: "renew",
      claimId: byTxn.id,
      founderNumber: byTxn.founderNumber,
    };
  }

  const byUser = input.claims.find((claim) => claim.userId === input.userId);
  if (byUser) {
    if (byUser.periodEnd.getTime() <= input.now.getTime()) {
      return { action: "reject", reason: "lost" };
    }
    return {
      action: "renew",
      claimId: byUser.id,
      founderNumber: byUser.founderNumber,
    };
  }

  if (!input.offerEnabled || input.claims.length >= limit) {
    return { action: "reject", reason: "closed" };
  }

  const used = new Set(input.claims.map((claim) => claim.founderNumber));
  let next = 0;
  for (let number = 1; number <= limit; number += 1) {
    if (!used.has(number)) {
      next = number;
      break;
    }
  }
  if (next === 0) return { action: "reject", reason: "closed" };
  return { action: "create", founderNumber: next };
}

export function foundingOfferSnapshot(input: {
  claimedCount: number;
  offerEnabled: boolean;
  limit?: number;
}): {
  limit: number;
  claimedCount: number;
  remainingCount: number;
  offerAvailable: boolean;
} {
  const limit = input.limit ?? FOUNDING_LIMIT;
  const claimedCount = Math.max(0, input.claimedCount);
  const remainingCount = Math.max(0, limit - claimedCount);
  return {
    limit,
    claimedCount,
    remainingCount,
    offerAvailable: input.offerEnabled && remainingCount > 0,
  };
}

/** Unset or empty enables the offer. 0, false, off, or disabled closes it. */
export function foundingOfferEnabled(raw: string | undefined | null): boolean {
  if (raw == null || raw.trim() === "") return true;
  const value = raw.trim().toLowerCase();
  return !["0", "false", "off", "disabled", "no"].includes(value);
}

export function catalogContainsObsoletePrice(serialized: string): boolean {
  return (
    serialized.includes("9.99") ||
    serialized.includes("29.99") ||
    serialized.includes("99.99") ||
    serialized.includes("$12") ||
    serialized.includes("$29") ||
    serialized.includes("12/month") ||
    serialized.includes("29/month")
  );
}
