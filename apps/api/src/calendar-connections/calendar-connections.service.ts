import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { PrismaService } from '../prisma/prisma.service';
import type { CalendarProvider } from '../generated/prisma';

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 min

@Injectable()
export class CalendarConnectionsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
        createdAt: true,
      },
    });
    return connections.map((c) => ({
      id: c.id,
      provider: c.providerType,
      email: c.email,
      syncedAt: c.syncedAt?.toISOString() ?? null,
      connectedAt: c.createdAt.toISOString(),
    }));
  }

  getConnectUrl(userId: string, provider: CalendarProvider): { redirectUrl: string } {
    const state = this.jwtService.sign(
      { sub: userId, provider, purpose: 'calendar-connect' },
      { expiresIn: '10m' },
    );
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    if (provider === 'google') {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      if (!clientId) throw new BadRequestException('Google Calendar is not configured');
      const redirectUri = `${this.config.get('API_URL') ?? this.config.get('URL') ?? 'http://localhost:3001'}/calendar-connections/google/callback`;
      const scope = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
      return { redirectUrl: url };
    }

    if (provider === 'outlook') {
      const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
      if (!clientId) throw new BadRequestException('Outlook Calendar is not configured');
      const redirectUri = `${this.config.get('API_URL') ?? this.config.get('URL') ?? 'http://localhost:3001'}/calendar-connections/outlook/callback`;
      const scope = 'openid email Calendars.Read offline_access';
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&response_mode=query&state=${encodeURIComponent(state)}`;
      return { redirectUrl: url };
    }

    if (provider === 'apple') {
      // Apple: CalDAV or Sign in with Apple + CalDAV. Placeholder – link to docs or same-origin setup.
      const redirectUri = `${frontendUrl}/integrations?connected=apple&setup=1`;
      return { redirectUrl: redirectUri };
    }

    throw new BadRequestException('Unknown provider');
  }

  async handleCallback(provider: CalendarProvider, code: string, state: string) {
    let payload: { sub: string; provider: CalendarProvider; purpose: string };
    try {
      payload = this.jwtService.verify(state);
      if (payload.purpose !== 'calendar-connect' || payload.provider !== provider) throw new Error('Invalid state');
    } catch {
      throw new BadRequestException('Invalid or expired state');
    }
    const userId = payload.sub;

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    if (provider === 'google') {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
      if (!clientId || !clientSecret) throw new BadRequestException('Google Calendar is not configured');
      const redirectUri = `${this.config.get('API_URL') ?? this.config.get('URL') ?? 'http://localhost:3001'}/calendar-connections/google/callback`;
      const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2.getToken(code);
      oauth2.setCredentials(tokens);
      const oauth2Client = google.oauth2({ version: 'v2', auth: oauth2 });
      const { data: userInfo } = await oauth2Client.userinfo.get();
      const email = (userInfo.email ?? userInfo.id ?? 'google') as string;
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
      await this.prisma.calendarConnection.upsert({
        where: {
          userId_providerType: { userId, providerType: 'google' },
        },
        create: {
          userId,
          providerType: 'google',
          email,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt,
        },
        update: {
          email,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token ?? undefined,
          expiresAt,
        },
      });
      await this.syncConnection(userId, 'google');
      return { redirectUrl: `${frontendUrl}/integrations?connected=google` };
    }

    if (provider === 'outlook') {
      const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
      const clientSecret = this.config.get<string>('MICROSOFT_CLIENT_SECRET');
      if (!clientId || !clientSecret) throw new BadRequestException('Outlook Calendar is not configured');
      const redirectUri = `${this.config.get('API_URL') ?? this.config.get('URL') ?? 'http://localhost:3001'}/calendar-connections/outlook/callback`;
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
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
      const client = Client.init({ authProvider: () => Promise.resolve(accessToken) });
      const me = await client.api('/me').get();
      const email = (me.mail ?? me.userPrincipalName ?? 'outlook') as string;
      await this.prisma.calendarConnection.upsert({
        where: {
          userId_providerType: { userId, providerType: 'outlook' },
        },
        create: {
          userId,
          providerType: 'outlook',
          email,
          accessToken,
          refreshToken: refreshToken ?? null,
          expiresAt,
        },
        update: {
          email,
          accessToken,
          refreshToken: refreshToken ?? undefined,
          expiresAt,
        },
      });
      await this.syncConnection(userId, 'outlook');
      return { redirectUrl: `${frontendUrl}/integrations?connected=outlook` };
    }

    return { redirectUrl: `${frontendUrl}/integrations` };
  }

  async disconnect(userId: string, connectionId: string) {
    const conn = await this.prisma.calendarConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!conn) throw new NotFoundException('Connection not found');
    const source = conn.providerType as 'google' | 'outlook' | 'apple';
    await this.prisma.event.deleteMany({
      where: { userId, source },
    });
    await this.prisma.calendarConnection.delete({ where: { id: connectionId } });
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
      await this.syncGoogleCalendar(userId, conn.id, conn.accessToken, conn.refreshToken, conn.calendarId, rangeStart, rangeEnd);
    } else if (provider === 'outlook') {
      await this.syncOutlookCalendar(userId, conn.id, conn.accessToken, rangeStart, rangeEnd);
    }
    // apple: CalDAV sync can be added later

    await this.prisma.calendarConnection.update({
      where: { id: conn.id },
      data: { syncedAt: new Date() },
    });
    return { ok: true };
  }

  private async syncGoogleCalendar(
    userId: string,
    connectionId: string,
    accessToken: string,
    refreshToken: string | null,
    calendarId: string | null,
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) return;
    const redirectUri = `${this.config.get('API_URL') ?? 'http://localhost:3001'}/calendar-connections/google/callback`;
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken ?? undefined });
    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const calId = calendarId ?? 'primary';
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
      const start = item.start.dateTime ? new Date(item.start.dateTime) : new Date(item.start.date!);
      const end = item.end.dateTime ? new Date(item.end.dateTime) : new Date(item.end.date!);
      await this.prisma.event.upsert({
        where: {
          source_externalId: { source: 'google', externalId: item.id },
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
    // Store primary calendar id for next sync if not set
    if (!calendarId) {
      const conn = await this.prisma.calendarConnection.findFirst({
        where: { userId, providerType: 'google' },
      });
      if (conn) {
        await this.prisma.calendarConnection.update({
          where: { id: conn.id },
          data: { calendarId: calId },
        });
      }
    }
  }

  private async syncOutlookCalendar(userId: string, connectionId: string, accessToken: string, rangeStart: Date, rangeEnd: Date) {
    const client = Client.init({ authProvider: () => Promise.resolve(accessToken) });
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
          source_externalId: { source: 'outlook', externalId: ev.id },
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
}
