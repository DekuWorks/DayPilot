import {
  FREE_BOOKING_LINK_LIMIT,
  FREE_CALENDAR_CONNECTION_LIMIT,
  PRICING_PLANS,
  STOREKIT_FOUNDING_MONTHLY,
  STOREKIT_PRO_MONTHLY,
  catalogContainsObsoletePrice,
  entitlementsForSubscription,
  planById,
  subscriptionHasProAccess,
} from '@daypilot/lib';

describe('launch pricing entitlements', () => {
  it('keeps Free on one booking link and one calendar connection', () => {
    expect(
      entitlementsForSubscription({ tier: 'Free', status: 'active' }),
    ).toEqual({
      paid: false,
      hasProAccess: false,
      planId: 'free',
      calendarSync: false,
      calendarConnectionLimit: FREE_CALENDAR_CONNECTION_LIMIT,
      bookingLinkLimit: FREE_BOOKING_LINK_LIMIT,
    });
  });

  it('treats an active founding subscription as full Pro access', () => {
    expect(
      entitlementsForSubscription({
        tier: 'FoundingPro',
        planId: 'founding_pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      }),
    ).toMatchObject({
      paid: true,
      hasProAccess: true,
      planId: 'founding_pro',
      calendarConnectionLimit: null,
      bookingLinkLimit: null,
    });
  });

  it('keeps Pro access for legacy Personal, Business, and Enterprise rows', () => {
    for (const tier of ['Personal', 'Business', 'Enterprise'] as const) {
      expect(
        subscriptionHasProAccess({
          tier,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 86_400_000),
        }),
      ).toBe(true);
    }
  });

  it('keeps access after cancel until the paid period ends', () => {
    expect(
      subscriptionHasProAccess({
        tier: 'FoundingPro',
        planId: 'founding_pro',
        status: 'canceled',
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      }),
    ).toBe(true);
  });

  it('drops access when the paid period has ended', () => {
    expect(
      subscriptionHasProAccess({
        tier: 'Pro',
        planId: 'pro',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() - 86_400_000),
      }),
    ).toBe(false);
  });

  it('does not treat a canceled plan without a remaining period as paid', () => {
    expect(
      entitlementsForSubscription({ tier: 'Business', status: 'canceled' })
        .paid,
    ).toBe(false);
  });

  it('does not sell Team or Enterprise', () => {
    expect(planById('team')).toMatchObject({
      availability: 'coming_soon',
      purchasable: false,
      storeKitProductId: null,
      marketingPrice: '$20',
    });
    expect(planById('enterprise')).toMatchObject({
      availability: 'coming_soon',
      purchasable: false,
      storeKitProductId: null,
      marketingPrice: 'Custom',
    });
  });

  it('sells founding and pro on the new StoreKit ids', () => {
    expect(planById('founding_pro')?.storeKitProductId).toBe(
      STOREKIT_FOUNDING_MONTHLY,
    );
    expect(planById('pro')?.storeKitProductId).toBe(STOREKIT_PRO_MONTHLY);
    expect(planById('founding_pro')?.entitlement).toBe('pro');
    expect(planById('pro')?.entitlement).toBe('pro');
  });

  it('does not keep the old prices in the shared catalog', () => {
    expect(catalogContainsObsoletePrice(JSON.stringify(PRICING_PLANS))).toBe(
      false,
    );
    expect(PRICING_PLANS.map((plan) => plan.marketingPrice).sort()).toEqual([
      '$0',
      '$10',
      '$20',
      '$5',
      'Custom',
    ]);
  });
});
