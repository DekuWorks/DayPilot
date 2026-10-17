import { plansForWeb } from '@daypilot/lib';
import { toPeopleDirectory } from './people-directory';

describe('people directory', () => {
  it('keeps founding and waitlist fields and drops secrets', () => {
    const directory = toPeopleDirectory({
      founding: [
        {
          email: 'member@example.com',
          firstName: 'Bea',
          lastName: 'Member',
          planId: 'founding_pro',
          tier: 'FoundingPro',
          status: 'active',
          founderNumber: 3,
          currentPeriodEnd: new Date('2026-11-07T16:00:00.000Z'),
          subscribedAt: new Date('2026-10-01T16:00:00.000Z'),
          claimCreatedAt: new Date('2026-10-01T12:00:00.000Z'),
          ...({
            passwordHash: 'secret-hash',
            accessToken: 'token-value',
          } as object),
        },
      ],
      waitlist: [
        {
          id: 'w1',
          email: 'Team@Example.com',
          requestedPlan: 'team',
          status: 'open',
          companyName: 'Acme',
          teamSize: '8',
          createdAt: new Date('2026-10-02T12:00:00.000Z'),
          ...({ refreshToken: 'refresh-value' } as object),
        },
      ],
    });

    expect(directory.founding).toEqual([
      {
        email: 'member@example.com',
        name: 'Bea Member',
        plan: 'founding_pro',
        status: 'active',
        founderNumber: 3,
        currentPeriodEnd: '2026-11-07T16:00:00.000Z',
        subscribedAt: '2026-10-01T16:00:00.000Z',
        claimCreatedAt: '2026-10-01T12:00:00.000Z',
      },
    ]);
    expect(directory.waitlist).toEqual([
      {
        id: 'w1',
        email: 'team@example.com',
        plan: 'team',
        status: 'open',
        companyName: 'Acme',
        teamSize: '8',
        createdAt: '2026-10-02T12:00:00.000Z',
      },
    ]);
    const serialized = JSON.stringify(directory);
    expect(serialized).not.toContain('secret-hash');
    expect(serialized).not.toContain('token-value');
    expect(serialized).not.toContain('refresh-value');
    expect(serialized).not.toContain('password');
  });
});

describe('active plan list', () => {
  it('lists features for every plan and sells only Founding 25 and Pro', () => {
    const plans = plansForWeb();
    expect(plans.map((plan) => plan.planId)).toEqual([
      'free',
      'founding_pro',
      'pro',
      'team',
      'enterprise',
    ]);
    for (const plan of plans) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
    expect(
      plans.filter((plan) => plan.purchasable).map((plan) => plan.planId),
    ).toEqual(['founding_pro', 'pro']);
    expect(plans.find((plan) => plan.planId === 'founding_pro')).toMatchObject({
      marketingPrice: '$5',
      storeKitProductId: 'daypilot.pro.founding.monthly',
    });
    expect(plans.find((plan) => plan.planId === 'pro')).toMatchObject({
      marketingPrice: '$10',
      storeKitProductId: 'daypilot.pro.monthly',
    });
    expect(
      plans.find((plan) => plan.planId === 'team')?.storeKitProductId,
    ).toBe(null);
    expect(
      plans.find((plan) => plan.planId === 'enterprise')?.storeKitProductId,
    ).toBe(null);
  });
});
