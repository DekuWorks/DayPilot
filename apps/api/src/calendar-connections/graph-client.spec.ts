import {
  GRAPH_CALENDAR_VIEW_PAGE_SIZE,
  collectGraphPageValues,
  graphNextLink,
  graphRetryAfterHeader,
  graphRetryDelayMs,
  graphStatusCode,
  parseRetryAfterSeconds,
  withGraphRetry,
} from './graph-client';

describe('graphNextLink', () => {
  it('reads @odata.nextLink', () => {
    expect(graphNextLink({ '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/x' })).toBe(
      'https://graph.microsoft.com/v1.0/me/x',
    );
    expect(graphNextLink({ value: [] })).toBeNull();
    expect(graphNextLink(null)).toBeNull();
  });
});

describe('graphRetryDelayMs', () => {
  it('retries 429 using Retry-After seconds', () => {
    expect(graphRetryDelayMs(429, '2', 0)).toBe(2000);
  });

  it('retries 503 with exponential backoff when the header is missing', () => {
    expect(graphRetryDelayMs(503, undefined, 0)).toBe(1000);
    expect(graphRetryDelayMs(503, undefined, 1)).toBe(2000);
  });

  it('does not retry other statuses or exhausted attempts', () => {
    expect(graphRetryDelayMs(404, '2', 0)).toBeNull();
    expect(graphRetryDelayMs(429, '1', 4)).toBeNull();
  });
});

describe('parseRetryAfterSeconds', () => {
  it('parses integer seconds', () => {
    expect(parseRetryAfterSeconds('3')).toBe(3000);
  });

  it('returns null for empty values', () => {
    expect(parseRetryAfterSeconds('')).toBeNull();
    expect(parseRetryAfterSeconds(null)).toBeNull();
  });
});

describe('graph error helpers', () => {
  it('reads statusCode and Retry-After from Graph-shaped errors', () => {
    const err = { statusCode: 429, headers: { 'Retry-After': '1' } };
    expect(graphStatusCode(err)).toBe(429);
    expect(graphRetryAfterHeader(err)).toBe('1');
  });
});

describe('collectGraphPageValues', () => {
  it('follows nextLink until the last page', async () => {
    const pages = await collectGraphPageValues(
      { value: [{ id: 'a' }], '@odata.nextLink': 'page-2' },
      async (link) => {
        expect(link).toBe('page-2');
        return { value: [{ id: 'b' }] };
      },
    );
    expect(pages.map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('withGraphRetry', () => {
  it('retries once on 429 then returns', async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const result = await withGraphRetry(
      async () => {
        calls += 1;
        if (calls === 1) {
          const err = Object.assign(new Error('throttled'), {
            statusCode: 429,
            headers: { 'Retry-After': '1' },
          });
          throw err;
        }
        return 'ok';
      },
      async (ms) => {
        sleeps.push(ms);
      },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(2);
    expect(sleeps).toEqual([1000]);
  });

  it('uses page size 100 for calendarView', () => {
    expect(GRAPH_CALENDAR_VIEW_PAGE_SIZE).toBe(100);
  });
});
