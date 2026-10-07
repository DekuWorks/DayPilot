/**
 * Nest billing API.
 *
 * The website does not sell subscriptions. Paid plans are bought in the iOS app.
 */

import { plansForWeb, type PlanId, type PricingPlan } from "@daypilot/lib";
import { getApiUrl, getApiErrorMessage, nestFetch } from "./api";

export type { PlanId, PricingPlan };
export { plansForWeb };

export type SubscriptionTier =
  | "Free"
  | "Personal"
  | "Business"
  | "Enterprise"
  | "Pro"
  | "FoundingPro";

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";

export type Subscription = {
  tier: SubscriptionTier;
  planId?: PlanId;
  displayName?: string;
  founderNumber?: number | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  /** apple when the plan was bought in the App Store. */
  source?: "apple" | "stripe" | null;
  configured?: boolean;
  paid?: boolean;
  hasProAccess?: boolean;
  calendarSync?: boolean;
  calendarConnectionLimit?: number | null;
  bookingLinkLimit?: number | null;
};

export type FoundingOffer = {
  limit: number;
  claimedCount: number;
  remainingCount: number;
  offerAvailable: boolean;
};

export function isPaidSubscription(sub: Subscription | null | undefined) {
  if (!sub) return false;
  if (typeof sub.hasProAccess === "boolean") return sub.hasProAccess;
  if (typeof sub.paid === "boolean") return sub.paid;
  return (
    sub.tier !== "Free" &&
    (sub.status === "active" || sub.status === "trialing")
  );
}

/** Null means unlimited. Missing data falls back to the free cap of 1. */
export function connectionLimitFor(
  sub: Subscription | null | undefined,
): number | null {
  if (isPaidSubscription(sub)) return null;
  if (sub && "calendarConnectionLimit" in sub) {
    return sub.calendarConnectionLimit ?? 1;
  }
  return 1;
}

export async function getSubscription(): Promise<Subscription> {
  const res = await nestFetch(`${getApiUrl()}/billing/subscription`);
  if (!res.ok) throw new Error("Failed to load subscription");
  return res.json();
}

export async function getFoundingOffer(): Promise<FoundingOffer | null> {
  try {
    const res = await fetch(`${getApiUrl()}/billing/founding`);
    if (!res.ok) return null;
    const body = (await res.json()) as FoundingOffer;
    if (
      typeof body.limit !== "number" ||
      typeof body.claimedCount !== "number" ||
      typeof body.remainingCount !== "number" ||
      typeof body.offerAvailable !== "boolean"
    ) {
      return null;
    }
    return body;
  } catch {
    return null;
  }
}

export async function joinPlanWaitlist(input: {
  email: string;
  requestedPlan: "team" | "enterprise";
  companyName?: string;
  teamSize?: string;
  marketingConsent: boolean;
}): Promise<void> {
  const res = await nestFetch(`${getApiUrl()}/billing/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(err, "Could not join the waitlist"));
  }
}
