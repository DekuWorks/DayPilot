import type { Client } from '@microsoft/microsoft-graph-client';

/** Graph calendarView default page is 10. Ask for 100 and follow @odata.nextLink. */
export const GRAPH_CALENDAR_VIEW_PAGE_SIZE = 100;
export const GRAPH_MAX_RETRIES = 4;
export const GRAPH_MAX_PAGES = 50;

export type GraphPagedResponse<T> = {
  value?: T[];
  '@odata.nextLink'?: string;
};

export function graphNextLink(
  payload: GraphPagedResponse<unknown> | null | undefined,
): string | null {
  const link = payload?.['@odata.nextLink'];
  return typeof link === 'string' && link.length > 0 ? link : null;
}

export function graphStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const n = (err as { statusCode?: unknown }).statusCode;
  return typeof n === 'number' ? n : undefined;
}

export function graphRetryAfterHeader(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const headers = (err as { headers?: Record<string, unknown> }).headers;
  if (!headers) return undefined;
  const raw =
    headers['Retry-After'] ??
    headers['retry-after'] ??
    headers['Retry-after'];
  return typeof raw === 'string' ? raw : undefined;
}

/** Delay before retrying a 429/503. Null means do not retry. */
export function graphRetryDelayMs(
  statusCode: number | undefined,
  retryAfterHeader: string | undefined | null,
  attempt: number,
): number | null {
  if (statusCode !== 429 && statusCode !== 503) return null;
  if (attempt >= GRAPH_MAX_RETRIES) return null;
  const fromHeader = parseRetryAfterSeconds(retryAfterHeader);
  if (fromHeader != null) return fromHeader;
  return Math.min(1000 * 2 ** attempt, 16_000);
}

export function parseRetryAfterSeconds(
  header: string | undefined | null,
): number | null {
  if (!header?.trim()) return null;
  const seconds = Number(header.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.round(seconds * 1000), 60_000);
  }
  const when = Date.parse(header);
  if (Number.isNaN(when)) return null;
  return Math.min(Math.max(when - Date.now(), 0), 60_000);
}

export async function collectGraphPageValues<T>(
  first: GraphPagedResponse<T>,
  fetchNext: (nextLink: string) => Promise<GraphPagedResponse<T>>,
  maxPages = GRAPH_MAX_PAGES,
): Promise<T[]> {
  const out = [...(first.value ?? [])];
  let next = graphNextLink(first);
  let pages = 1;
  while (next && pages < maxPages) {
    const page = await fetchNext(next);
    out.push(...(page.value ?? []));
    next = graphNextLink(page);
    pages += 1;
  }
  return out;
}

export async function withGraphRetry<T>(
  fn: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = delay,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const wait = graphRetryDelayMs(
        graphStatusCode(err),
        graphRetryAfterHeader(err),
        attempt,
      );
      if (wait == null) throw err;
      await sleep(wait);
      attempt += 1;
    }
  }
}

export async function graphGetPaged<T>(
  client: Client,
  path: string,
  query: Record<string, string | number>,
): Promise<T[]> {
  const first = (await withGraphRetry(() =>
    client
      .api(path)
      .query(query)
      .header('Prefer', `odata.maxpagesize=${GRAPH_CALENDAR_VIEW_PAGE_SIZE}`)
      .get(),
  )) as GraphPagedResponse<T>;

  return collectGraphPageValues(first, (nextLink) =>
    withGraphRetry(() => client.api(nextLink).get() as Promise<GraphPagedResponse<T>>),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
