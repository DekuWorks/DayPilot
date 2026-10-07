import { decideFoundingClaim, foundingOfferSnapshot } from '@daypilot/lib';

function claim(
  founderNumber: number,
  extras?: { userId?: string | null; periodEnd?: Date; txn?: string },
) {
  return {
    id: `claim-${founderNumber}`,
    founderNumber,
    originalTransactionId: extras?.txn ?? `txn-${founderNumber}`,
    userId:
      extras && 'userId' in extras
        ? (extras.userId ?? null)
        : `user-${founderNumber}`,
    periodEnd: extras?.periodEnd ?? new Date('2026-12-01T00:00:00.000Z'),
  };
}

describe('founding capacity', () => {
  const now = new Date('2026-10-07T00:00:00.000Z');

  it('blocks the 26th new claim', () => {
    const claims = Array.from({ length: 25 }, (_, index) => claim(index + 1));
    expect(
      decideFoundingClaim({
        claims,
        userId: 'new-user',
        originalTransactionId: 'txn-new',
        now,
        offerEnabled: true,
      }),
    ).toEqual({ action: 'reject', reason: 'closed' });
  });

  it('keeps an existing member when the offer is full', () => {
    const claims = Array.from({ length: 25 }, (_, index) => claim(index + 1));
    expect(
      decideFoundingClaim({
        claims,
        userId: 'user-7',
        originalTransactionId: 'txn-7',
        now,
        offerEnabled: false,
      }),
    ).toEqual({ action: 'renew', claimId: 'claim-7', founderNumber: 7 });
  });

  it('does not reopen an expired spot', () => {
    const claims = [
      claim(4, {
        userId: 'expired-user',
        periodEnd: new Date('2026-09-01T00:00:00.000Z'),
      }),
    ];
    expect(
      decideFoundingClaim({
        claims,
        userId: 'expired-user',
        originalTransactionId: 'txn-4',
        now,
        offerEnabled: true,
      }),
    ).toEqual({ action: 'reject', reason: 'lost' });
    expect(
      decideFoundingClaim({
        claims,
        userId: 'someone-else',
        originalTransactionId: 'txn-other',
        now,
        offerEnabled: true,
      }),
    ).toEqual({ action: 'create', founderNumber: 1 });
    const filled = Array.from({ length: 24 }, (_, index) => claim(index + 1));
    filled.push(
      claim(25, {
        userId: 'expired-user',
        periodEnd: new Date('2026-09-01T00:00:00.000Z'),
      }),
    );
    expect(
      decideFoundingClaim({
        claims: filled,
        userId: 'brand-new',
        originalTransactionId: 'txn-brand-new',
        now,
        offerEnabled: true,
      }),
    ).toEqual({ action: 'reject', reason: 'closed' });
    expect(
      foundingOfferSnapshot({
        claimedCount: filled.length,
        offerEnabled: true,
      }),
    ).toEqual({
      limit: 25,
      claimedCount: 25,
      remainingCount: 0,
      offerAvailable: false,
    });
  });
});
