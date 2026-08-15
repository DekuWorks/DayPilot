import { shouldDeleteStaleEventKitRow } from './eventkit-sync.service';

describe('shouldDeleteStaleEventKitRow', () => {
  const seen = new Set(['ek:phone:cal:keep']);
  const batchStartedAt = new Date('2026-08-15T22:00:00.000Z');

  it('keeps ids from the current chunk', () => {
    expect(
      shouldDeleteStaleEventKitRow({
        externalId: 'ek:phone:cal:keep',
        seenExternalIds: seen,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        batchStartedAt,
      }),
    ).toBe(false);
  });

  it('keeps rows written by earlier chunks of the same upload', () => {
    expect(
      shouldDeleteStaleEventKitRow({
        externalId: 'ek:phone:cal:earlier',
        seenExternalIds: seen,
        updatedAt: new Date('2026-08-15T22:00:05.000Z'),
        batchStartedAt,
      }),
    ).toBe(false);
  });

  it('deletes stale rows not touched in this upload', () => {
    expect(
      shouldDeleteStaleEventKitRow({
        externalId: 'ek:phone:cal:old',
        seenExternalIds: seen,
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
        batchStartedAt,
      }),
    ).toBe(true);
  });

  it('deletes unseen rows when there is no batch start (single request)', () => {
    expect(
      shouldDeleteStaleEventKitRow({
        externalId: 'ek:phone:cal:old',
        seenExternalIds: seen,
        updatedAt: new Date('2026-08-15T22:00:05.000Z'),
        batchStartedAt: null,
      }),
    ).toBe(true);
  });
});
