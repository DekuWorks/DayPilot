import { getApiUrl, getAuthHeaders } from "./api";

export type SubscriptionTier = "Free" | "Personal" | "Business" | "Enterprise";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";

export type Subscription = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
};

export async function getSubscription(): Promise<Subscription> {
  const res = await fetch(`${getApiUrl()}/billing/subscription`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load subscription");
  return res.json();
}

export async function createCheckoutSession(priceId: string): Promise<{ url: string }> {
  const res = await fetch(`${getApiUrl()}/billing/checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ priceId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to create checkout session");
  }
  return res.json();
}

export async function createPortalSession(): Promise<{ url: string }> {
  const res = await fetch(`${getApiUrl()}/billing/portal-session`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to open billing portal");
  }
  return res.json();
}
