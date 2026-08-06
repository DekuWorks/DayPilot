import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { PrismaService } from '../prisma/prisma.service';
import type { CalendarProvider } from '../generated/prisma';
import {
  CalDavError,
  decodeCalendarIds,
  encodeCalendarIds,
  fetchIcloudEvents,
  looksLikeAppSpecificPassword,
  normalizeAppSpecificPassword,
  verifyIcloudCalDav,
} from './icloud-caldav';
import type { ImportDeviceEventsDto } from './dto/import-device-events.dto';

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 min
/** Marker token for iOS EventKit imports (no CalDAV credentials). */
const DEVICE_EVENTKIT_TOKEN = 'device-eventkit';
const DEVICE_EVENT_PREFIX = 'device:';

@Injectable()
export class CalendarConnectionsService {
  private readonly logger = new Logger(CalendarConnectionsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(userId: string) {
    const connections = await this.prisma.calendarConnection.findMany({
      where: { userId },
      orderBy: { providerType: 'asc' },
      select: {
        id: true,
        providerType: true,
        email: true,
        syncedAt: true,
        validatedAt: true,
        expiresAt: true,
        refreshToken: true,
        accessToken: true,
        createdAt: true,
      },
    });
    return connections.map((c) => this.toConnectionDto(c));
  }

  /** Public shape for Sync / Integrations UIs (never exposes tokens). */
  private toConnectionDto(c: {
    id: string;
    providerType: CalendarProvider;
    email: string;
    syncedAt: Date | null;
    validatedAt: Date | null;
    expiresAt: Date | null;
    refreshToken: string | null;
    accessToken: string;
    createdAt: Date;
  }) {
    const status = this.computeValidationStatus({
      ...c,
      providerType: c.providerType,
    });
    return {
      id: c.id,
      provider: c.providerType,
      email: c.email,
      syncedAt: c.syncedAt?.toISOString() ?? null,
      validatedAt: c.validatedAt?.toISOString() ?? null,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      connectedAt: c.createdAt.toISOString(),
      status,
      connected: true,
    };
  }

  private computeValidationStatus(c: {
    providerType?: CalendarProvider;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }): 'valid' | 'expired' | 'needs_reconnect' | 'unknown' {
    if (!c.accessToken) return 'needs_reconnect';
    // iCloud CalDAV / EventKit use non-expiring device credentials
    if (
      c.providerType === 'apple' ||
      c.providerType === 'apple_eventkit'
    ) {
      return 'valid';
    }
    if (c.expiresAt == null) return 'unknown';
    if (c.expiresAt.getTime() > Date.now()) return 'valid';
    if (c.refreshToken) return 'expired';
    return 'needs_reconnect';
  }

  getConnectUrl(
    userId: string,
    provider: CalendarProvider,
  ): { redirectUrl: string | null; needsCredentials?: boolean } {
    const state = this.jwtService.sign(
      { sub: userId, provider, purpose: 'calendar-connect' },
      { expiresIn: '10m' },
    );

    if (provider === 'google') {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      if (!clientId)
        throw new BadRequestException('Google Calendar is not configured');
      const redirectUri = `${this.config.get('API_URL') ?? this.config.get('URL') ?? 'http://localhost:3001'}/calendar-connections/google/callback`;
      const scope =
        'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
      return { redirectUrl: url };
    }

    if (provider === 'outlook') {
      const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
      if (!clientId)
        throw new BadRequestException('Outlook Calendar is not configured');
      const redirectUri = `${this.config.get('API_URL') ?? this.config.get('URL') ?? 'http://localhost:3001'}/calendar-connections/outlook/callback`;
      const scope = 'openid email Calendars.ReadWrite offline_access';
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&response_mode=query&state=${encodeURIComponent(state)}`;
      return { redirectUrl: url };
    }

    if (provider === 'apple' || provider === 'apple_eventkit') {
      // Product path is EventKit on iOS (POST /apple/eventkit/sync).
      // CalDAV ASP remains dormant at POST /apple/connect.
      return { redirectUrl: null, needsCredentials: true };
    }

    throw new BadRequestException('Unknown provider');
  }

  /**
   * Connect iCloud Calendar via CalDAV (Apple ID + app-specific password).
   * Stores password in accessToken; calendar URL(s) in calendarId.
   * Sign in with Apple SSO cannot supply this password — Apple limitation.
   */
  async connectAppleCalDav(
    userId: string,
    appleId: string,
    appSpecificPassword: string,
  ) {
    const email = appleId.trim().toLowerCase();
    const password = normalizeAppSpecificPassword(appSpecificPassword);
    if (!email || !password) {
      throw new BadRequestException(
        'Apple ID and app-specific password required',
      );
    }
    if (!looksLikeAppSpecificPassword(password)) {
      throw new BadRequestException(
        'That does not look like an Apple app-specific password (16 characters, often shown as xxxx-xxxx-xxxx-xxxx). Generate one at appleid.apple.com → Sign-In and Security → App-Specific Passwords. Do not use your Apple ID password.',
      );
    }

    let calendarUrl: string;
    let calendarUrls: string[];
    let workingPassword: string;
    try {
      ({ calendarUrl, calendarUrls, workingPassword } = await verifyIcloudCalDav(
        email,
        password,
      ));
      this.logger.log(
        `iCloud CalDAV connected for user ${userId} (${calendarUrls.length} calendar(s); http ok)`,
      );
    } catch (err) {
      if (err instanceof CalDavError) {
        this.logger.warn(
          `iCloud CalDAV connect failed user=${userId} code=${err.code} http=${err.httpStatus ?? 'n/a'}`,
        );
        throw new BadRequestException(err.message);
      }
      const message =
        err instanceof Error ? err.message : 'iCloud CalDAV connect failed';
      this.logger.warn(`iCloud CalDAV connect failed user=${userId}`);
      throw new BadRequestException(message);
    }

    const now = new Date();
    const storedCalendarId = encodeCalendarIds(calendarUrls);
    await this.prisma.calendarConnection.upsert({
      where: {
        userId_providerType_deviceId: {
          userId,
          providerType: 'apple',
          deviceId: '',
        },
      },
      create: {
        userId,
        providerType: 'apple',
        email,
        accessToken: workingPassword,
        refreshToken: null,
        expiresAt: null,
        calendarId: storedCalendarId || calendarUrl,
        validatedAt: now,
      },
      update: {
        email,
        accessToken: workingPassword,
        refreshToken: null,
        expiresAt: null,
        calendarId: storedCalendarId || calendarUrl,
        validatedAt: now,
      },
    });

    await this.syncConnection(userId, 'apple');
    return this.list(userId).then((list) =>
      list.find((c) => c.provider === 'apple'),
    );
  }

  /**
   * Import events read on-device via EventKit (iOS).
   * No Apple app-specific password — used as the phone-side path.
   */
  async importDeviceEvents(userId: string, dto: ImportDeviceEventsDto) {
    const now = new Date();
    const label =
      (dto.deviceLabel?.trim() || 'iPhone Calendar').slice(0, 320) ||
      'iPhone Calendar';

    const existing = await this.prisma.calendarConnection.findUnique({
      where: { userId_providerType_deviceId: {
          userId,
          providerType: 'apple',
          deviceId: '',
        } },
    });
    const keepCalDav =
      !!existing?.accessToken &&
      existing.accessToken !== DEVICE_EVENTKIT_TOKEN;

    if (!keepCalDav) {
      await this.prisma.calendarConnection.upsert({
        where: {
          userId_providerType_deviceId: {
          userId,
          providerType: 'apple',
          deviceId: '',
        },
        },
        create: {
          userId,
          providerType: 'apple',
          email: label,
          accessToken: DEVICE_EVENTKIT_TOKEN,
          refreshToken: null,
          expiresAt: null,
          calendarId: 'device',
          validatedAt: now,
          syncedAt: now,
        },
        update: {
          email: label,
          accessToken: DEVICE_EVENTKIT_TOKEN,
          refreshToken: null,
          expiresAt: null,
          calendarId: 'device',
          validatedAt: now,
          syncedAt: now,
        },
      });
    } else {
      await this.prisma.calendarConnection.update({
        where: { id: existing!.id },
        data: { syncedAt: now, validatedAt: now },
      });
    }

    let imported = 0;
    for (const item of dto.events) {
      const start = new Date(item.startsAt);
      const end = new Date(item.endsAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        continue;
      }
      if (end.getTime() < start.getTime()) {
        continue;
      }
      // Include userId — @@unique([source, externalId]) is global across users.
      const externalId =
        `${DEVICE_EVENT_PREFIX}${userId}:${item.externalId}`.slice(0, 512);
      await this.prisma.event.upsert({
        where: {
          userId_source_externalId: {
            userId,
            source: 'apple',
            externalId,
          },
        },
        create: {
          userId,
          source: 'apple',
          externalId,
          title: item.title.slice(0, 500),
          start,
          end,
          description: item.description?.slice(0, 5000) ?? null,
          location: item.location?.slice(0, 1000) ?? null,
        },
        update: {
          title: item.title.slice(0, 500),
          start,
          end,
          description: item.description?.slice(0, 5000) ?? null,
          location: item.location?.slice(0, 1000) ?? null,
        },
      });
      imported += 1;
    }

    this.logger.log(
      `EventKit import user=${userId} events=${imported} keepCalDav=${keepCalDav}`,
    );
    this.eventEmitter.emit('calendar.synced', { userId });
    return {
      ok: true,
      imported,
      connection: await this.list(userId).then((list) =>
        list.find((c) => c.provider === 'apple'),
      ),
    };
  }

  async handleCallback(
    provider: CalendarProvider,
    code: string,
    state: string,
  ) {
    let payload: { sub: string; provider: CalendarProvider; purpose: string };
    try {
      payload = this.jwtService.verify(state);
      if (
        payload.purpose !== 'calendar-connect' ||
        payload.provider !== provider
      )
        throw new Error('Invalid state');
    } catch {
      throw new BadRequestException('Invalid or expired state');
    }
    const userId = payload.sub;

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    if (provider === 'google') {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
      if (!clientId || !clientSecret)
        throw new BadRequestException('Google Calendar is not configured');
      const redirectUri = `${this.config.get('API_URL') ?? this.config.get('URL') ?? 'http://localhost:3001'}/calendar-connections/google/callback`;
      const oauth2 = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
      );
      const { tokens } = await oauth2.getToken(code);
      oauth2.setCredentials(tokens);
      const oauth2Client = google.oauth2({ version: 'v2', auth: oauth2 });
      const { data: userInfo } = await oauth2Client.userinfo.get();
      const email = userInfo.email ?? userInfo.id ?? 'google';
      const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null;
      await this.prisma.calendarConnection.upsert({
        where: {
          userId_providerType_deviceId: {
          userId,
          providerType: 'google',
          deviceId: '',
        },
        },
        create: {
          userId,
          providerType: 'google',
          email,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt,
          validatedAt: new Date(),
        },
        update: {
          email,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token ?? undefined,
          expiresAt,
          validatedAt: new Date(),
        },
      });
      await this.syncConnection(userId, 'google');
      return { redirectUrl: `${frontendUrl}/sync?connected=google` };
    }

    if (provider === 'outlook') {
      const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
      const clientSecret = this.config.get<string>('MICROSOFT_CLIENT_SECRET');
      if (!clientId || !clientSecret)
        throw new BadRequestException('Outlook Calendar is not configured');
      const redirectUri = `${this.config.get('API_URL') ?? this.config.get('URL') ?? 'http://localhost:3001'}/calendar-connections/outlook/callback`;
      const tokenUrl =
        'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new BadRequestException(err || 'Failed to exchange Outlook code');
      }
      const data = await res.json();
      const accessToken = data.access_token as string;
      const refreshToken = data.refresh_token as string | undefined;
      const expiresIn = (data.expires_in as number) ?? 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      const client = Client.init({
        authProvider: () => Promise.resolve(accessToken),
      });
      const me = await client.api('/me').get();
      const email = (me.mail ?? me.userPrincipalName ?? 'outlook') as string;
      await this.prisma.calendarConnection.upsert({
        where: {
          userId_providerType_deviceId: {
          userId,
          providerType: 'outlook',
          deviceId: '',
        },
        },
        create: {
          userId,
          providerType: 'outlook',
          email,
          accessToken,
          refreshToken: refreshToken ?? null,
          expiresAt,
          validatedAt: new Date(),
        },
        update: {
          email,
          accessToken,
          refreshToken: refreshToken ?? undefined,
          expiresAt,
          validatedAt: new Date(),
        },
      });
      await this.syncConnection(userId, 'outlook');
      return { redirectUrl: `${frontendUrl}/sync?connected=outlook` };
    }

    return { redirectUrl: `${frontendUrl}/sync` };
  }

  async disconnect(userId: string, connectionId: string) {
    const conn = await this.prisma.calendarConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!conn) throw new NotFoundException('Connection not found');
    const source = conn.providerType as
      | 'google'
      | 'outlook'
      | 'apple'
      | 'apple_eventkit';
    await this.prisma.event.deleteMany({
      where: { userId, source },
    });
    await this.prisma.calendarConnection.delete({
      where: { id: connectionId },
    });
    this.eventEmitter.emit('calendar.synced', { userId });
    return { ok: true };
  }

  async syncConnectionById(userId: string, connectionId: string) {
    const conn = await this.prisma.calendarConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!conn) throw new NotFoundException('Connection not found');
    return this.syncConnection(userId, conn.providerType);
  }

  async syncConnection(userId: string, provider: CalendarProvider) {
    const conn = await this.prisma.calendarConnection.findFirst({
      where: { userId, providerType: provider },
    });
    if (!conn) throw new NotFoundException('Connection not found');

    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 7);
    const rangeEnd = new Date(now);
    rangeEnd.setDate(rangeEnd.getDate() + 60);

    if (provider === 'google') {
      await this.syncGoogleCalendar(userId, conn, rangeStart, rangeEnd);
    } else if (provider === 'outlook') {
      await this.syncOutlookCalendar(userId, conn, rangeStart, rangeEnd);
    } else if (
      provider === 'apple' ||
      provider === 'apple_eventkit'
    ) {
      if (
        provider === 'apple_eventkit' ||
        conn.accessToken === DEVICE_EVENTKIT_TOKEN
      ) {
        // Device calendars refresh from the iOS app via EventKit sync.
        await this.prisma.calendarConnection.update({
          where: { id: conn.id },
          data: { syncedAt: now, validatedAt: now },
        });
        this.eventEmitter.emit('calendar.synced', { userId });
        return {
          ok: true,
          message:
            'iPhone calendars refresh from the DayPilot iOS app (EventKit). Open Sync → Connect Apple Calendar.',
        };
      }
      await this.syncAppleCalendar(userId, conn, rangeStart, rangeEnd);
    }

    const syncedAt = new Date();
    await this.prisma.calendarConnection.update({
      where: { id: conn.id },
      data: { syncedAt, validatedAt: syncedAt },
    });
    this.eventEmitter.emit('calendar.synced', { userId });
    return { ok: true };
  }

  /**
   * Live token check for Sync UI — refreshes if needed and pings the provider.
   */
  async validateConnection(userId: string, connectionId: string) {
    const conn = await this.prisma.calendarConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!conn) throw new NotFoundException('Connection not found');

    const now = new Date();
    try {
      if (conn.providerType === 'google') {
        await this.pingGoogle(conn);
      } else if (conn.providerType === 'outlook') {
        await this.pingOutlook(conn);
      } else if (conn.providerType === 'apple') {
        await this.pingApple(conn);
      } else if (conn.providerType === 'apple_eventkit') {
        // EventKit connections are validated on-device; mark valid if present.
      } else {
        throw new BadRequestException('Unknown provider');
      }

      await this.prisma.calendarConnection.update({
        where: { id: conn.id },
        data: { validatedAt: now },
      });

      const fresh = await this.prisma.calendarConnection.findUniqueOrThrow({
        where: { id: conn.id },
      });
      return {
        ok: true,
        valid: true,
        status: this.computeValidationStatus(fresh),
        validatedAt: now.toISOString(),
        expiresAt: fresh.expiresAt?.toISOString() ?? null,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Token validation failed';
      return {
        ok: false,
        valid: false,
        status: 'needs_reconnect' as const,
        validatedAt: null,
        error: message,
      };
    }
  }

  private async pingGoogle(conn: {
    id: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google Calendar is not configured');
    }
    const accessToken = await this.ensureGoogleAccessToken(conn);
    const oauth2 = new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.googleRedirectUri(),
    );
    oauth2.setCredentials({
      access_token: accessToken,
      refresh_token: conn.refreshToken ?? undefined,
    });
    const oauth2Client = google.oauth2({ version: 'v2', auth: oauth2 });
    await oauth2Client.userinfo.get();
  }

  private async pingOutlook(conn: {
    id: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }) {
    const accessToken = await this.ensureOutlookAccessToken(conn);
    const client = Client.init({
      authProvider: () => Promise.resolve(accessToken),
    });
    await client.api('/me').get();
  }

  private async pingApple(conn: {
    email: string;
    accessToken: string;
    calendarId: string | null;
  }) {
    if (!conn.accessToken || !conn.email) {
      throw new BadRequestException('iCloud credentials missing — reconnect');
    }
    if (conn.accessToken === DEVICE_EVENTKIT_TOKEN) {
      return;
    }
    await verifyIcloudCalDav(conn.email, conn.accessToken);
  }

  private async syncAppleCalendar(
    userId: string,
    conn: {
      id: string;
      email: string;
      accessToken: string;
      calendarId: string | null;
    },
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    if (!conn.accessToken || !conn.email) {
      throw new BadRequestException('iCloud credentials missing — reconnect');
    }
    let calendarUrls = decodeCalendarIds(conn.calendarId);
    if (calendarUrls.length === 0) {
      try {
        const discovered = await verifyIcloudCalDav(
          conn.email,
          conn.accessToken,
        );
        calendarUrls = discovered.calendarUrls;
        await this.prisma.calendarConnection.update({
          where: { id: conn.id },
          data: { calendarId: encodeCalendarIds(calendarUrls) },
        });
      } catch (err) {
        if (err instanceof CalDavError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
    }

    const seenUids = new Set<string>();
    for (const calendarUrl of calendarUrls) {
      let items;
      try {
        items = await fetchIcloudEvents(
          conn.email,
          conn.accessToken,
          calendarUrl,
          rangeStart,
          rangeEnd,
        );
      } catch (err) {
        if (err instanceof CalDavError) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
      for (const item of items) {
        if (seenUids.has(item.uid)) continue;
        seenUids.add(item.uid);
        await this.prisma.event.upsert({
          where: {
            userId_source_externalId: {
              userId,
              source: 'apple',
              externalId: item.uid,
            },
          },
          create: {
            userId,
            source: 'apple',
            externalId: item.uid,
            title: item.title,
            start: item.start,
            end: item.end,
            description: item.description ?? null,
            location: item.location ?? null,
          },
          update: {
            title: item.title,
            start: item.start,
            end: item.end,
            description: item.description ?? null,
            location: item.location ?? null,
          },
        });
      }
    }
    this.logger.log(
      `iCloud sync user=${userId} calendars=${calendarUrls.length} events=${seenUids.size}`,
    );
  }

  private googleRedirectUri(): string {
    return `${this.config.get('API_URL') ?? this.config.get('URL') ?? 'http://localhost:3001'}/calendar-connections/google/callback`;
  }

  private async refreshGoogleTokens(
    connectionId: string,
    accessToken: string,
    refreshToken: string | null,
  ): Promise<string> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) return accessToken;

    const oauth2 = new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.googleRedirectUri(),
    );
    oauth2.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken ?? undefined,
    });

    const { credentials } = await oauth2.refreshAccessToken();
    const nextAccess = credentials.access_token ?? accessToken;
    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : null;

    await this.prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: nextAccess,
        ...(credentials.refresh_token
          ? { refreshToken: credentials.refresh_token }
          : {}),
        ...(expiresAt ? { expiresAt } : {}),
      },
    });

    return nextAccess;
  }

  private async ensureGoogleAccessToken(conn: {
    id: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }): Promise<string> {
    const expiresSoon =
      conn.expiresAt != null &&
      conn.expiresAt.getTime() < Date.now() + 60_000;
    if (!expiresSoon && conn.accessToken) return conn.accessToken;
    if (!conn.refreshToken) return conn.accessToken;
    return this.refreshGoogleTokens(
      conn.id,
      conn.accessToken,
      conn.refreshToken,
    );
  }

  private async refreshOutlookTokens(
    connectionId: string,
    refreshToken: string,
  ): Promise<string> {
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
    const clientSecret = this.config.get<string>('MICROSOFT_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Outlook Calendar is not configured');
    }

    const tokenUrl =
      'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(err || 'Failed to refresh Outlook token');
    }

    const data = await res.json();
    const accessToken = data.access_token as string;
    const nextRefresh = (data.refresh_token as string | undefined) ?? refreshToken;
    const expiresIn = (data.expires_in as number) ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        accessToken,
        refreshToken: nextRefresh,
        expiresAt,
      },
    });

    return accessToken;
  }

  private async ensureOutlookAccessToken(conn: {
    id: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }): Promise<string> {
    const expiresSoon =
      conn.expiresAt != null &&
      conn.expiresAt.getTime() < Date.now() + 60_000;
    if (!expiresSoon && conn.accessToken) return conn.accessToken;
    if (!conn.refreshToken) return conn.accessToken;
    return this.refreshOutlookTokens(conn.id, conn.refreshToken);
  }

  private async syncGoogleCalendar(
    userId: string,
    conn: {
      id: string;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
      calendarId: string | null;
    },
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) return;

    const accessToken = await this.ensureGoogleAccessToken(conn);
    const oauth2 = new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.googleRedirectUri(),
    );
    oauth2.setCredentials({
      access_token: accessToken,
      refresh_token: conn.refreshToken ?? undefined,
    });
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const calId = conn.calendarId ?? 'primary';
    const { data } = await calendar.events.list({
      calendarId: calId,
      timeMin: rangeStart.toISOString(),
      timeMax: rangeEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    const items = data.items ?? [];
    for (const item of items) {
      if (!item.id || !item.start || !item.end) continue;
      const start = item.start.dateTime
        ? new Date(item.start.dateTime)
        : new Date(item.start.date!);
      const end = item.end.dateTime
        ? new Date(item.end.dateTime)
        : new Date(item.end.date!);
      await this.prisma.event.upsert({
        where: {
          userId_source_externalId: {
            userId,
            source: 'google',
            externalId: item.id,
          },
        },
        create: {
          userId,
          source: 'google',
          externalId: item.id,
          title: item.summary ?? 'Event',
          start,
          end,
          description: item.description ?? null,
          location: item.location ?? null,
        },
        update: {
          title: item.summary ?? 'Event',
          start,
          end,
          description: item.description ?? null,
          location: item.location ?? null,
        },
      });
    }
    if (!conn.calendarId) {
      await this.prisma.calendarConnection.update({
        where: { id: conn.id },
        data: { calendarId: calId },
      });
    }
  }

  private async syncOutlookCalendar(
    userId: string,
    conn: {
      id: string;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
    },
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    const accessToken = await this.ensureOutlookAccessToken(conn);
    const client = Client.init({
      authProvider: () => Promise.resolve(accessToken),
    });
    const res = await client
      .api('/me/calendarView')
      .query({
        startDateTime: rangeStart.toISOString(),
        endDateTime: rangeEnd.toISOString(),
      })
      .get();
    const events = (res.value ?? []) as Array<{
      id: string;
      subject?: string;
      start?: { dateTime: string; timeZone?: string };
      end?: { dateTime: string; timeZone?: string };
      body?: { content?: string };
      location?: { displayName?: string };
    }>;
    for (const ev of events) {
      if (!ev.id || !ev.start?.dateTime || !ev.end?.dateTime) continue;
      const start = new Date(ev.start.dateTime);
      const end = new Date(ev.end.dateTime);
      await this.prisma.event.upsert({
        where: {
          userId_source_externalId: {
            userId,
            source: 'outlook',
            externalId: ev.id,
          },
        },
        create: {
          userId,
          source: 'outlook',
          externalId: ev.id,
          title: ev.subject ?? 'Event',
          start,
          end,
          description: ev.body?.content ?? null,
          location: ev.location?.displayName ?? null,
        },
        update: {
          title: ev.subject ?? 'Event',
          start,
          end,
          description: ev.body?.content ?? null,
          location: ev.location?.displayName ?? null,
        },
      });
    }
  }

  /** Push DayPilot edits back to Google Calendar or Outlook. */
  async pushExternalEventUpdate(
    userId: string,
    source: 'google' | 'outlook',
    externalId: string,
    patch: {
      title: string;
      start: Date;
      end: Date;
      description: string | null;
      location: string | null;
    },
  ): Promise<void> {
    const conn = await this.prisma.calendarConnection.findFirst({
      where: { userId, providerType: source },
    });
    if (!conn) {
      throw new BadRequestException(
        `${source === 'google' ? 'Google' : 'Outlook'} calendar is not connected`,
      );
    }

    if (source === 'google') {
      await this.pushGoogleEventUpdate(conn, externalId, patch);
    } else {
      await this.pushOutlookEventUpdate(conn, externalId, patch);
    }
  }

  /** Delete event in Google Calendar or Outlook when removed in DayPilot. */
  async pushExternalEventDelete(
    userId: string,
    source: 'google' | 'outlook',
    externalId: string,
  ): Promise<void> {
    const conn = await this.prisma.calendarConnection.findFirst({
      where: { userId, providerType: source },
    });
    if (!conn) {
      throw new BadRequestException(
        `${source === 'google' ? 'Google' : 'Outlook'} calendar is not connected`,
      );
    }

    if (source === 'google') {
      await this.pushGoogleEventDelete(conn, externalId);
    } else {
      await this.pushOutlookEventDelete(conn, externalId);
    }
  }

  private async pushGoogleEventUpdate(
    conn: {
      id: string;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
      calendarId: string | null;
    },
    externalId: string,
    patch: {
      title: string;
      start: Date;
      end: Date;
      description: string | null;
      location: string | null;
    },
  ): Promise<void> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google Calendar is not configured');
    }

    const accessToken = await this.ensureGoogleAccessToken(conn);
    const oauth2 = new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.googleRedirectUri(),
    );
    oauth2.setCredentials({
      access_token: accessToken,
      refresh_token: conn.refreshToken ?? undefined,
    });
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const calId = conn.calendarId ?? 'primary';

    try {
      await calendar.events.patch({
        calendarId: calId,
        eventId: externalId,
        requestBody: {
          summary: patch.title,
          description: patch.description ?? undefined,
          location: patch.location ?? undefined,
          start: { dateTime: patch.start.toISOString(), timeZone: 'UTC' },
          end: { dateTime: patch.end.toISOString(), timeZone: 'UTC' },
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update Google event';
      throw new BadRequestException(message);
    }
  }

  private async pushGoogleEventDelete(
    conn: {
      id: string;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
      calendarId: string | null;
    },
    externalId: string,
  ): Promise<void> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google Calendar is not configured');
    }

    const accessToken = await this.ensureGoogleAccessToken(conn);
    const oauth2 = new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.googleRedirectUri(),
    );
    oauth2.setCredentials({
      access_token: accessToken,
      refresh_token: conn.refreshToken ?? undefined,
    });
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const calId = conn.calendarId ?? 'primary';

    try {
      await calendar.events.delete({
        calendarId: calId,
        eventId: externalId,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete Google event';
      throw new BadRequestException(message);
    }
  }

  private async pushOutlookEventUpdate(
    conn: {
      id: string;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
    },
    externalId: string,
    patch: {
      title: string;
      start: Date;
      end: Date;
      description: string | null;
      location: string | null;
    },
  ): Promise<void> {
    const accessToken = await this.ensureOutlookAccessToken(conn);
    const client = Client.init({
      authProvider: () => Promise.resolve(accessToken),
    });

    try {
      await client.api(`/me/events/${externalId}`).patch({
        subject: patch.title,
        body: {
          contentType: 'text',
          content: patch.description ?? '',
        },
        start: { dateTime: patch.start.toISOString(), timeZone: 'UTC' },
        end: { dateTime: patch.end.toISOString(), timeZone: 'UTC' },
        location: { displayName: patch.location ?? '' },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update Outlook event';
      throw new BadRequestException(message);
    }
  }

  private async pushOutlookEventDelete(
    conn: {
      id: string;
      accessToken: string;
      refreshToken: string | null;
      expiresAt: Date | null;
    },
    externalId: string,
  ): Promise<void> {
    const accessToken = await this.ensureOutlookAccessToken(conn);
    const client = Client.init({
      authProvider: () => Promise.resolve(accessToken),
    });

    try {
      await client.api(`/me/events/${externalId}`).delete();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete Outlook event';
      throw new BadRequestException(message);
    }
  }
}
