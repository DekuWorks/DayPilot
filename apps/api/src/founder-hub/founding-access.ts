import { subscriptionHasProAccess } from '@daypilot/lib';

export type FounderPhase = 'none' | 'active' | 'grace' | 'expired';

export type SubscriptionSnapshot = {
  tier?: string | null;
  planId?: string | null;
  status?: string | null;
  currentPeriodEnd?: Date | string | null;
  founderNumber?: number | null;
};

/**
 * Apple billing-retry grace is not delivered to this API. There is no App
 * Store Server Notification pipeline, so a purchase confirm never writes
 * `past_due`. Access stays open until `currentPeriodEnd`, including after
 * the user turns renewal off (`canceled` with a future period end), then
 * becomes expired.
 *
 * If a row is already `past_due` and `currentPeriodEnd` is still in the
 * future, that is the grace phase. `past_due` after the period end is expired.
 */
export function foundingPhase(
  subscription: SubscriptionSnapshot | null,
  hasFoundingClaim: boolean,
  now = new Date(),
): FounderPhase {
  const planId = subscription?.planId ?? null;
  const tier = subscription?.tier ?? null;
  const isFounding = planId === 'founding_pro' || tier === 'FoundingPro';
  if (!isFounding) {
    return hasFoundingClaim ? 'expired' : 'none';
  }
  const status = (subscription?.status ?? 'active').toLowerCase();
  const end = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const endMs =
    end && !Number.isNaN(end.getTime()) ? end.getTime() : null;
  const periodOpen = endMs == null || endMs > now.getTime();
  if (
    status === 'past_due' &&
    periodOpen &&
    subscriptionHasProAccess({ ...subscription, now })
  ) {
    return 'grace';
  }
  if (subscriptionHasProAccess({ ...subscription, now })) return 'active';
  return 'expired';
}

export function founderAccess(phase: FounderPhase): {
  canRead: boolean;
  canWrite: boolean;
  betaEligible: boolean;
} {
  if (phase === 'active' || phase === 'grace') {
    return { canRead: true, canWrite: true, betaEligible: true };
  }
  if (phase === 'expired') {
    return { canRead: true, canWrite: false, betaEligible: false };
  }
  return { canRead: false, canWrite: false, betaEligible: false };
}
