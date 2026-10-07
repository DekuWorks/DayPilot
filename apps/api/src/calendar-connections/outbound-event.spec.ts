import { readOutbound, withOutbound } from './outbound-event';

describe('outbound event links', () => {
  it('reads provider ids and ignores empty ones', () => {
    expect(
      readOutbound({
        workspaceId: 'w1',
        outbound: {
          google: { id: 'g-1' },
          outlook: { id: '' },
          apple: { id: 'a-1' },
        },
      }),
    ).toEqual({
      google: { id: 'g-1' },
      apple: { id: 'a-1' },
    });
  });

  it('merges a new link without dropping workspace metadata', () => {
    const next = withOutbound(
      { workspaceId: 'w1', outbound: { google: { id: 'g-1' } } },
      { outlook: { id: 'o-1' } },
    );
    expect(next.workspaceId).toBe('w1');
    expect(next.outbound).toEqual({
      google: { id: 'g-1' },
      outlook: { id: 'o-1' },
    });
  });
});
