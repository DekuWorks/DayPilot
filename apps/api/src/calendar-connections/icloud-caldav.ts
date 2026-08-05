/**
 * Minimal iCloud CalDAV client (Apple ID + app-specific password).
 * Discover principal → calendar-home → first writable calendar → VEVENT import.
 */

const ICLOUD_CALDAV_ROOT = 'https://caldav.icloud.com/';

export type CalDavEvent = {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
};

function basicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function xmlHref(xml: string, localName: string): string | null {
  const re = new RegExp(
    `<(?:[a-zA-Z0-9_]+:)?${localName}[^>]*>\\s*<d:href>([^<]+)</d:href>`,
    'i',
  );
  const m = xml.match(re);
  if (m?.[1]) return m[1].trim();
  // Apple sometimes uses bare <href> without prefix inside prop
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

async function caldavRequest(
  url: string,
  method: string,
  username: string,
  password: string,
  body: string,
  depth: string,
  contentType = 'application/xml; charset=utf-8',
): Promise<{ status: number; text: string }> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: basicAuth(username, password),
      Depth: depth,
      'Content-Type': contentType,
      Accept: '*/*',
    },
    body,
  });
  const text = await res.text();
  return { status: res.status, text };
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
  // YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
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
  // Treat floating local as UTC for import window (good enough for list sync)
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
      const re = new RegExp(
        `^${name}([^:\\n]*):([^\\n]+)$`,
        'im',
      );
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

export async function verifyIcloudCalDav(
  appleId: string,
  appSpecificPassword: string,
): Promise<{ calendarUrl: string }> {
  const propfindPrincipal = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal/></d:prop>
</d:propfind>`;

  const root = await caldavRequest(
    ICLOUD_CALDAV_ROOT,
    'PROPFIND',
    appleId,
    appSpecificPassword,
    propfindPrincipal,
    '0',
  );
  if (root.status === 401 || root.status === 403) {
    throw new Error(
      'iCloud CalDAV auth failed. Check Apple ID and app-specific password.',
    );
  }
  if (root.status < 200 || root.status >= 300) {
    throw new Error(`iCloud CalDAV discovery failed (${root.status})`);
  }

  const principalHref = xmlHref(root.text, 'current-user-principal');
  if (!principalHref) {
    throw new Error('Could not find iCloud calendar principal');
  }
  const principalUrl = resolveUrl(ICLOUD_CALDAV_ROOT, principalHref);

  const propfindHome = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-home-set/></d:prop>
</d:propfind>`;

  const homeRes = await caldavRequest(
    principalUrl,
    'PROPFIND',
    appleId,
    appSpecificPassword,
    propfindHome,
    '0',
  );
  if (homeRes.status < 200 || homeRes.status >= 300) {
    throw new Error(`iCloud calendar-home discovery failed (${homeRes.status})`);
  }

  const homeHref = xmlHref(homeRes.text, 'calendar-home-set');
  if (!homeHref) {
    throw new Error('Could not find iCloud calendar home');
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
    appSpecificPassword,
    propfindCals,
    '1',
  );
  if (calsRes.status < 200 || calsRes.status >= 300) {
    throw new Error(`iCloud calendar list failed (${calsRes.status})`);
  }

  // Prefer a collection that looks like a calendar (not the home itself)
  const hrefs = allHrefs(calsRes.text)
    .map((h) => resolveUrl(homeUrl, h))
    .filter((u) => u !== homeUrl && !u.endsWith('/principal/'));

  // Heuristic: calendar URLs under /calendars/ with a trailing segment
  const calendarUrl =
    hrefs.find((u) => /\/calendars\/[^/]+\/?$/i.test(u)) ??
    hrefs[0] ??
    homeUrl;

  return { calendarUrl };
}

export async function fetchIcloudEvents(
  appleId: string,
  appSpecificPassword: string,
  calendarUrl: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<CalDavEvent[]> {
  const start = rangeStart.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = rangeEnd.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

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

  const res = await caldavRequest(
    calendarUrl.endsWith('/') ? calendarUrl : `${calendarUrl}/`,
    'REPORT',
    appleId,
    appSpecificPassword,
    report,
    '1',
    'application/xml; charset=utf-8',
  );
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      'iCloud CalDAV auth failed. Reconnect with a new app-specific password.',
    );
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`iCloud calendar sync failed (${res.status})`);
  }

  // Extract calendar-data CDATA / text nodes
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
}
