/**
 * Minimal iCloud CalDAV client (Apple ID + app-specific password).
 * Discover principal → calendar-home → VEVENT calendars → import.
 *
 * Notes:
 * - Sign in with Apple does NOT grant CalDAV access.
 * - Username is the Apple ID email (icloud.com, gmail.com, etc. all valid).
 * - Password must be an app-specific password (2FA required).
 * - Never log credentials.
 */

const ICLOUD_CALDAV_ROOTS = [
  'https://caldav.icloud.com/',
  'https://caldav.icloud.com/.well-known/caldav',
] as const;

const CALDAV_USER_AGENT =
  'DayPilot/1.0 (CalDAV; +https://www.daypilot.co)';

export type CalDavEvent = {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
};

export class CalDavError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'auth'
      | 'forbidden'
      | 'discovery'
      | 'sync'
      | 'network',
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'CalDavError';
  }
}

/** Strip whitespace / unicode spaces; keep hyphens for Apple's xxxx-xxxx form. */
export function normalizeAppSpecificPassword(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\s\u00A0\u202F\u2007]+/g, '')
    .trim();
}

/**
 * Apple app-specific passwords are 16 alphanumeric chars, often shown as
 * xxxx-xxxx-xxxx-xxxx or with spaces. Try both hyphenated and bare forms.
 */
export function appSpecificPasswordVariants(raw: string): string[] {
  const normalized = normalizeAppSpecificPassword(raw);
  const bare = normalized.replace(/-/g, '');
  const variants: string[] = [];
  const push = (v: string) => {
    if (v && !variants.includes(v)) variants.push(v);
  };
  push(normalized);
  push(bare);
  if (/^[a-zA-Z0-9]{16}$/.test(bare)) {
    push(
      `${bare.slice(0, 4)}-${bare.slice(4, 8)}-${bare.slice(8, 12)}-${bare.slice(12, 16)}`,
    );
  }
  return variants;
}

export function looksLikeAppSpecificPassword(raw: string): boolean {
  const bare = normalizeAppSpecificPassword(raw).replace(/-/g, '');
  return /^[a-zA-Z0-9]{16}$/.test(bare);
}

function basicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

function xmlHref(xml: string, localName: string): string | null {
  const re = new RegExp(
    `<(?:[a-zA-Z0-9_]+:)?${localName}[^>]*>\\s*<d:href>([^<]+)</d:href>`,
    'i',
  );
  const m = xml.match(re);
  if (m?.[1]) return m[1].trim();
  const re2 = new RegExp(
    `<(?:[a-zA-Z0-9_]+:)?${localName}[^>]*>\\s*<(?:[a-zA-Z0-9_]+:)?href>([^<]+)</(?:[a-zA-Z0-9_]+:)?href>`,
    'i',
  );
  const m2 = xml.match(re2);
  return m2?.[1]?.trim() ?? null;
}

function allHrefs(xml: string): string[] {
  const out: string[] = [];
  const re = /<(?:[a-zA-Z0-9_]+:)?href>([^<]+)<\/(?:[a-zA-Z0-9_]+:)?href>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

function resolveUrl(base: string, href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  const u = new URL(base);
  if (href.startsWith('/')) return `${u.origin}${href}`;
  return new URL(href, base).toString();
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function throwForAuthStatus(status: number, phase: string): never {
  if (status === 401) {
    throw new CalDavError(
      'iCloud CalDAV auth failed (401). Use your Apple ID email and a fresh app-specific password from appleid.apple.com (not your Apple ID password). Gmail-based Apple IDs are fine.',
      'auth',
      401,
    );
  }
  if (status === 403) {
    throw new CalDavError(
      `iCloud CalDAV forbidden (403) during ${phase}. Confirm 2FA is on, generate a new app-specific password, and that iCloud Calendar is enabled for this Apple ID.`,
      'forbidden',
      403,
    );
  }
  throw new CalDavError(
    `iCloud CalDAV ${phase} failed (HTTP ${status}).`,
    'discovery',
    status,
  );
}

/**
 * Follow redirects manually so Authorization is re-sent on partition hosts
 * (pXX-caldav.icloud.com). fetch() strips auth on cross-origin redirects.
 */
async function caldavRequest(
  url: string,
  method: string,
  username: string,
  password: string,
  body: string,
  depth: string,
  contentType = 'application/xml; charset=utf-8',
  maxRedirects = 5,
): Promise<{ status: number; text: string; url: string }> {
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    let res: Response;
    try {
      res = await fetch(current, {
        method,
        redirect: 'manual',
        headers: {
          Authorization: basicAuth(username, password),
          Depth: depth,
          'Content-Type': contentType,
          Accept: 'text/xml, application/xml, */*',
          'User-Agent': CALDAV_USER_AGENT,
        },
        body,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'network error';
      throw new CalDavError(
        `iCloud CalDAV network error during request: ${msg}`,
        'network',
      );
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      // Drain body so the socket can close cleanly
      await res.text().catch(() => '');
      if (!loc) {
        throw new CalDavError(
          `iCloud CalDAV redirect without Location (${res.status})`,
          'discovery',
          res.status,
        );
      }
      current = resolveUrl(current, loc);
      continue;
    }

    const text = await res.text();
    return { status: res.status, text, url: current };
  }
  throw new CalDavError('iCloud CalDAV too many redirects', 'discovery');
}

function parseIcsDate(raw: string, params: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  if (params.includes('VALUE=DATE') || /^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const mo = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    return new Date(Date.UTC(y, mo, d));
  }
  const m = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/,
  );
  if (!m) return null;
  const [, ys, mos, ds, hs, mis, ss, z] = m;
  if (z) {
    return new Date(
      Date.UTC(+ys!, +mos! - 1, +ds!, +hs!, +mis!, +ss!),
    );
  }
  return new Date(Date.UTC(+ys!, +mos! - 1, +ds!, +hs!, +mis!, +ss!));
}

function unfoldIcs(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

export function parseIcsEvents(ics: string): CalDavEvent[] {
  const text = unfoldIcs(ics);
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  const events: CalDavEvent[] = [];
  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] ?? '';
    const get = (name: string): { params: string; value: string } | null => {
      const re = new RegExp(`^${name}([^:\\n]*):([^\\n]+)$`, 'im');
      const m = body.match(re);
      if (!m) return null;
      return { params: m[1] ?? '', value: m[2]?.trim() ?? '' };
    };
    const uid = get('UID')?.value;
    const summary = get('SUMMARY')?.value ?? 'Event';
    const dtStart = get('DTSTART');
    const dtEnd = get('DTEND');
    const duration = get('DURATION')?.value;
    if (!uid || !dtStart) continue;
    const start = parseIcsDate(dtStart.value, dtStart.params);
    if (!start) continue;
    let end: Date | null = null;
    if (dtEnd) {
      end = parseIcsDate(dtEnd.value, dtEnd.params);
    } else if (duration && /^PT(\d+)H/i.test(duration)) {
      const hours = Number(duration.match(/^PT(\d+)H/i)?.[1] ?? 1);
      end = new Date(start.getTime() + hours * 3600_000);
    } else if (dtStart.params.includes('VALUE=DATE')) {
      end = new Date(start.getTime() + 86400_000);
    } else {
      end = new Date(start.getTime() + 3600_000);
    }
    if (!end) continue;
    const description = get('DESCRIPTION')?.value?.replace(/\\n/g, '\n');
    const location = get('LOCATION')?.value;
    events.push({
      uid,
      title: summary.replace(/\\,/g, ','),
      start,
      end,
      description,
      location: location?.replace(/\\,/g, ','),
    });
  }
  return events;
}

type ResponseCollection = {
  href: string;
  displayName: string;
  isCalendar: boolean;
  supportsVevent: boolean;
};

function parseCalendarResponses(xml: string, homeUrl: string): ResponseCollection[] {
  const chunks = xml.split(/<(?:[a-zA-Z0-9_]+:)?response(?:\s[^>]*)?>/i).slice(1);
  const out: ResponseCollection[] = [];
  for (const chunk of chunks) {
    const hrefMatch = chunk.match(
      /<(?:[a-zA-Z0-9_]+:)?href>([^<]+)<\/(?:[a-zA-Z0-9_]+:)?href>/i,
    );
    if (!hrefMatch?.[1]) continue;
    const href = resolveUrl(homeUrl, hrefMatch[1].trim());
    const display =
      chunk.match(
        /<(?:[a-zA-Z0-9_]+:)?displayname[^>]*>([^<]*)<\/(?:[a-zA-Z0-9_]+:)?displayname>/i,
      )?.[1]?.trim() ?? '';
    const resourceType = (
      chunk.match(
        /<(?:[a-zA-Z0-9_]+:)?resourcetype[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?resourcetype>/i,
      )?.[1] ?? ''
    ).toLowerCase();
    const isCalendar = resourceType.includes('calendar');
    const compSet = (
      chunk.match(
        /<(?:[a-zA-Z0-9_]+:)?supported-calendar-component-set[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?supported-calendar-component-set>/i,
      )?.[1] ?? ''
    ).toLowerCase();
    // If Apple omits the set, assume VEVENT is allowed for calendar collections
    const supportsVevent =
      !compSet ||
      compSet.includes('name="vevent"') ||
      compSet.includes("name='vevent'") ||
      /name\s*=\s*"vevent"/i.test(compSet);
    out.push({ href, displayName: display, isCalendar, supportsVevent });
  }
  return out;
}

function pickCalendarUrls(
  collections: ResponseCollection[],
  homeUrl: string,
): string[] {
  const calendars = collections.filter(
    (c) =>
      c.isCalendar &&
      c.supportsVevent &&
      c.href !== homeUrl &&
      !/\/(notification|inbox|outbox|dropbox|freebusy|principals?)\//i.test(
        c.href,
      ),
  );
  if (calendars.length === 0) {
    // Fallback: path heuristic from bare hrefs
    return collections
      .map((c) => c.href)
      .filter(
        (u) =>
          u !== homeUrl &&
          /\/calendars\/[^/]+\/?$/i.test(u) &&
          !/\/(notification|inbox|outbox)\//i.test(u),
      );
  }
  // Prefer "Home" / "Calendar" / "Work" style names first, keep the rest
  const rank = (name: string) => {
    const n = name.toLowerCase();
    if (n === 'home' || n === 'calendar' || n === 'personal') return 0;
    if (n.includes('work')) return 1;
    if (n.includes('reminders')) return 9;
    return 5;
  };
  return [...calendars]
    .sort((a, b) => rank(a.displayName) - rank(b.displayName))
    .map((c) => c.href);
}

async function discoverWithCredentials(
  appleId: string,
  password: string,
): Promise<{ calendarUrls: string[]; primaryCalendarUrl: string }> {
  let lastAuthError: CalDavError | null = null;

  for (const root of ICLOUD_CALDAV_ROOTS) {
    const propfindPrincipal = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal/></d:prop>
</d:propfind>`;

    const rootRes = await caldavRequest(
      root,
      'PROPFIND',
      appleId,
      password,
      propfindPrincipal,
      '0',
    );

    if (rootRes.status === 401 || rootRes.status === 403) {
      lastAuthError =
        rootRes.status === 401
          ? new CalDavError(
              'iCloud CalDAV auth failed (401). Use your Apple ID email and a fresh app-specific password from appleid.apple.com (not your Apple ID password). Gmail-based Apple IDs are fine.',
              'auth',
              401,
            )
          : new CalDavError(
              'iCloud CalDAV forbidden (403). Confirm 2FA is on, generate a new app-specific password, and that iCloud Calendar is enabled for this Apple ID.',
              'forbidden',
              403,
            );
      continue;
    }
    if (!isSuccessStatus(rootRes.status)) {
      continue;
    }

    const principalHref = xmlHref(rootRes.text, 'current-user-principal');
    if (!principalHref) {
      continue;
    }
    const principalUrl = resolveUrl(rootRes.url, principalHref);

    const propfindHome = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-home-set/></d:prop>
</d:propfind>`;

    const homeRes = await caldavRequest(
      principalUrl,
      'PROPFIND',
      appleId,
      password,
      propfindHome,
      '0',
    );
    if (homeRes.status === 401 || homeRes.status === 403) {
      throwForAuthStatus(homeRes.status, 'calendar-home discovery');
    }
    if (!isSuccessStatus(homeRes.status)) {
      throw new CalDavError(
        `iCloud calendar-home discovery failed (${homeRes.status})`,
        'discovery',
        homeRes.status,
      );
    }

    const homeHref = xmlHref(homeRes.text, 'calendar-home-set');
    if (!homeHref) {
      throw new CalDavError(
        'Could not find iCloud calendar home',
        'discovery',
        homeRes.status,
      );
    }
    const homeUrl = resolveUrl(principalUrl, homeHref);

    const propfindCals = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <c:supported-calendar-component-set/>
  </d:prop>
</d:propfind>`;

    const calsRes = await caldavRequest(
      homeUrl,
      'PROPFIND',
      appleId,
      password,
      propfindCals,
      '1',
    );
    if (calsRes.status === 401 || calsRes.status === 403) {
      throwForAuthStatus(calsRes.status, 'calendar list');
    }
    if (!isSuccessStatus(calsRes.status)) {
      throw new CalDavError(
        `iCloud calendar list failed (${calsRes.status})`,
        'discovery',
        calsRes.status,
      );
    }

    const collections = parseCalendarResponses(calsRes.text, homeUrl);
    let calendarUrls = pickCalendarUrls(collections, homeUrl);
    if (calendarUrls.length === 0) {
      // Last resort: any href under /calendars/
      calendarUrls = allHrefs(calsRes.text)
        .map((h) => resolveUrl(homeUrl, h))
        .filter((u) => u !== homeUrl && /\/calendars\/[^/]+\/?$/i.test(u));
    }
    if (calendarUrls.length === 0) {
      throw new CalDavError(
        'No iCloud calendars found for this account',
        'discovery',
      );
    }

    return {
      calendarUrls,
      primaryCalendarUrl: calendarUrls[0]!,
    };
  }

  if (lastAuthError) throw lastAuthError;
  throw new CalDavError(
    'iCloud CalDAV discovery failed for all endpoints',
    'discovery',
  );
}

export async function verifyIcloudCalDav(
  appleId: string,
  appSpecificPassword: string,
): Promise<{
  calendarUrl: string;
  calendarUrls: string[];
  /** Password variant Apple accepted (never log). */
  workingPassword: string;
}> {
  const email = appleId.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new CalDavError(
      'Apple ID must be the full email address (e.g. name@gmail.com or name@icloud.com).',
      'auth',
    );
  }

  const variants = appSpecificPasswordVariants(appSpecificPassword);
  if (variants.length === 0) {
    throw new CalDavError(
      'App-specific password is required.',
      'auth',
    );
  }

  let lastError: unknown;
  for (const password of variants) {
    try {
      const discovered = await discoverWithCredentials(email, password);
      return {
        calendarUrl: discovered.primaryCalendarUrl,
        calendarUrls: discovered.calendarUrls,
        workingPassword: password,
      };
    } catch (err) {
      lastError = err;
      // Wrong password variant → try next. Hard discovery/network errors stop early
      // only when not auth-related.
      if (
        err instanceof CalDavError &&
        err.code !== 'auth' &&
        err.code !== 'forbidden'
      ) {
        throw err;
      }
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new CalDavError(
    'iCloud CalDAV auth failed. Check Apple ID and app-specific password.',
    'auth',
  );
}

export async function fetchIcloudEvents(
  appleId: string,
  appSpecificPassword: string,
  calendarUrl: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalDavEvent[]> {
  const start = rangeStart
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const end = rangeEnd
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  const report = `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${start}" end="${end}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

  const variants = appSpecificPasswordVariants(appSpecificPassword);
  let lastError: unknown;
  for (const password of variants) {
    try {
      const res = await caldavRequest(
        calendarUrl.endsWith('/') ? calendarUrl : `${calendarUrl}/`,
        'REPORT',
        appleId.trim().toLowerCase(),
        password,
        report,
        '1',
        'application/xml; charset=utf-8',
      );
      if (res.status === 401 || res.status === 403) {
        throwForAuthStatus(res.status, 'event sync');
      }
      if (!isSuccessStatus(res.status)) {
        throw new CalDavError(
          `iCloud calendar sync failed (${res.status})`,
          'sync',
          res.status,
        );
      }

      const events: CalDavEvent[] = [];
      const re =
        /<(?:[a-zA-Z0-9_]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?calendar-data>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(res.text)) !== null) {
        const ics = m[1]
          .replace(/<!\[CDATA\[/g, '')
          .replace(/\]\]>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
        events.push(...parseIcsEvents(ics));
      }
      return events;
    } catch (err) {
      lastError = err;
      if (
        err instanceof CalDavError &&
        err.code !== 'auth' &&
        err.code !== 'forbidden'
      ) {
        throw err;
      }
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new CalDavError(
    'iCloud CalDAV auth failed. Reconnect with a new app-specific password.',
    'auth',
  );
}

/** Encode one or more calendar URLs for calendar_connections.calendar_id. */
export function encodeCalendarIds(urls: string[]): string {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length <= 1) return unique[0] ?? '';
  return JSON.stringify(unique);
}

export function decodeCalendarIds(stored: string | null | undefined): string[] {
  if (!stored) return [];
  const trimmed = stored.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && !!x);
      }
    } catch {
      /* fall through */
    }
  }
  return [trimmed];
}
