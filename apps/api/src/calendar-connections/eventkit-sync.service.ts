import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  classifyDeviceCalendarSource,
  detectDuplicateCalendar,
  detectDuplicateEvent,
  generateEventFingerprint,
  normalizeEventKitEvent,
} from '@daypilot/lib';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type {
  DisconnectEventKitDto,
  EventKitSyncDto,
  PatchExternalCalendarsDto,
} from './dto/eventkit-sync.dto';

const EVENTKIT_TOKEN = 'device-eventkit';

@Injectable()
export class EventKitSyncService {
  private readonly logger = new Logger(EventKitSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getStatus(userId: string, deviceId?: string) {
    const where = deviceId
      ? {
          userId,
          providerType: 'apple_eventkit' as const,
          deviceId,
        }
      : { userId, providerType: 'apple_eventkit' as const };

    const connections = await this.prisma.calendarConnection.findMany({
      where,
      orderBy: { syncedAt: 'desc' },
      include: {
        externalCalendars: { orderBy: { title: 'asc' } },
      },
    });

    const cloud = await this.prisma.calendarConnection.findMany({
      where: {
        userId,
        providerType: { in: ['google', 'outlook'] },
      },
      select: { providerType: true },
    });
    const hasGoogle = cloud.some((c) => c.providerType === 'google');
    const hasMicrosoft = cloud.some((c) => c.providerType === 'outlook');

    return {
      authSeparate: true,
      hasGoogleConnection: hasGoogle,
      hasMicrosoftConnection: hasMicrosoft,
      connections: connections.map((c) => ({
        id: c.id,
        provider: 'apple_eventkit',
        displayName: c.displayName || c.email,
        deviceId: c.deviceId,
        authStatus: c.authStatus,
        calendarStatus: c.calendarStatus,
        syncStatus: c.syncStatus,
        syncError: c.syncError,
        lastSyncedAt: c.syncedAt?.toISOString() ?? null,
        connectionMethod: c.connectionMethod,
        calendars: c.externalCalendars.map((cal) => ({
          id: cal.id,
          externalCalendarId: cal.externalCalendarId,
          title: cal.title,
          calendarType: cal.calendarType,
          sourceName: cal.sourceName,
          color: cal.color,
          isPrimary: cal.isPrimary,
          isReadOnly: cal.isReadOnly,
          isSelected: cal.isSelected,
          isVisible: cal.isVisible,
          deviceId: cal.deviceId,
          metadata: cal.metadata,
        })),
      })),
    };
  }

  async sync(userId: string, dto: EventKitSyncDto) {
    const startedAt = new Date();
    const deviceId = dto.deviceId.trim();
    const label = (dto.deviceLabel?.trim() || 'iPhone').slice(0, 320);

    const cloud = await this.prisma.calendarConnection.findMany({
      where: { userId, providerType: { in: ['google', 'outlook'] } },
      select: { providerType: true },
    });
    const hasGoogle = cloud.some((c) => c.providerType === 'google');
    const hasMicrosoft = cloud.some((c) => c.providerType === 'outlook');

    const connection = await this.prisma.calendarConnection.upsert({
      where: {
        userId_providerType_deviceId: {
          userId,
          providerType: 'apple_eventkit',
          deviceId,
        },
      },
      create: {
        userId,
        providerType: 'apple_eventkit',
        email: label,
        displayName: label,
        accessToken: EVENTKIT_TOKEN,
        deviceId,
        connectionMethod: 'eventkit',
        authStatus: 'connected',
        calendarStatus: 'connected',
        syncStatus: 'syncing',
        validatedAt: startedAt,
        syncedAt: startedAt,
      },
      update: {
        email: label,
        displayName: label,
        accessToken: EVENTKIT_TOKEN,
        connectionMethod: 'eventkit',
        authStatus: 'connected',
        calendarStatus: 'connected',
        syncStatus: 'syncing',
        syncError: null,
        validatedAt: startedAt,
      },
    });

    const calendarIdByExternal = new Map<string, string>();
    for (const cal of dto.calendars) {
      const sourceClass = classifyDeviceCalendarSource({
        title: cal.title,
        sourceName: cal.sourceName,
        calendarType: cal.calendarType,
      });
      const dup = detectDuplicateCalendar({
        sourceClass,
        hasGoogleConnection: hasGoogle,
        hasMicrosoftConnection: hasMicrosoft,
      });
      const selected = dup.isDuplicate
        ? false
        : cal.isSelected !== false;

      const row = await this.prisma.externalCalendar.upsert({
        where: {
          userId_provider_externalCalendarId_deviceId: {
            userId,
            provider: 'apple_eventkit',
            externalCalendarId: cal.externalCalendarId,
            deviceId,
          },
        },
        create: {
          userId,
          connectionId: connection.id,
          provider: 'apple_eventkit',
          externalCalendarId: cal.externalCalendarId,
          title: cal.title.slice(0, 500),
          calendarType: cal.calendarType ?? sourceClass,
          sourceName: cal.sourceName ?? null,
          color: cal.color ?? null,
          isPrimary: !!cal.isPrimary,
          isReadOnly: !!cal.isReadOnly,
          isSelected: selected,
          isVisible: cal.isVisible !== false,
          deviceId,
          metadata: {
            sourceClass,
            duplicatePrevented: dup.isDuplicate,
            duplicateReason: dup.reason ?? null,
          },
        },
        update: {
          connectionId: connection.id,
          title: cal.title.slice(0, 500),
          calendarType: cal.calendarType ?? sourceClass,
          sourceName: cal.sourceName ?? null,
          color: cal.color ?? null,
          isPrimary: !!cal.isPrimary,
          isReadOnly: !!cal.isReadOnly,
          isSelected: selected,
          isVisible: cal.isVisible !== false,
          metadata: {
            sourceClass,
            duplicatePrevented: dup.isDuplicate,
            duplicateReason: dup.reason ?? null,
          },
        },
      });
      calendarIdByExternal.set(cal.externalCalendarId, row.id);
    }

    const selectedExternals = new Set(
      (
        await this.prisma.externalCalendar.findMany({
          where: {
            userId,
            connectionId: connection.id,
            isSelected: true,
          },
          select: { externalCalendarId: true },
        })
      ).map((c) => c.externalCalendarId),
    );

    const existingCloud = await this.prisma.event.findMany({
      where: {
        userId,
        source: { in: ['google', 'outlook'] },
        deletedAt: null,
      },
      select: {
        title: true,
        start: true,
        end: true,
        externalId: true,
      },
    });
    const fingerprints = new Set(
      existingCloud.map((e) =>
        generateEventFingerprint({
          uid: e.externalId,
          title: e.title,
          startsAt: e.start,
          endsAt: e.end,
        }),
      ),
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const seenExternalIds = new Set<string>();

    for (const raw of dto.events) {
      if (!selectedExternals.has(raw.externalCalendarId)) {
        skipped += 1;
        continue;
      }
      const normalized = normalizeEventKitEvent({
        externalEventId: raw.externalEventId,
        externalCalendarId: raw.externalCalendarId,
        title: raw.title,
        description: raw.description,
        location: raw.location,
        startsAt: raw.startsAt,
        endsAt: raw.endsAt,
        allDay: raw.allDay,
        timezone: raw.timezone,
        recurrenceRule: raw.recurrenceRule,
        sourceUpdatedAt: raw.sourceUpdatedAt,
      });
      const fp = generateEventFingerprint({
        uid: normalized.externalEventId,
        title: normalized.title,
        startsAt: normalized.startsAt,
        endsAt: normalized.endsAt,
      });
      if (detectDuplicateEvent(fp, fingerprints)) {
        skipped += 1;
        continue;
      }

      const externalId = `ek:${deviceId}:${raw.externalCalendarId}:${raw.externalEventId}`.slice(
        0,
        512,
      );
      seenExternalIds.add(externalId);
      const calendarRowId =
        calendarIdByExternal.get(raw.externalCalendarId) ?? null;

      const existing = await this.prisma.event.findUnique({
        where: {
          userId_source_externalId: {
            userId,
            source: 'apple_eventkit',
            externalId,
          },
        },
        select: { id: true },
      });

      await this.prisma.event.upsert({
        where: {
          userId_source_externalId: {
            userId,
            source: 'apple_eventkit',
            externalId,
          },
        },
        create: {
          userId,
          source: 'apple_eventkit',
          externalId,
          externalCalendarId: raw.externalCalendarId,
          calendarId: calendarRowId,
          title: normalized.title.slice(0, 500),
          start: normalized.startsAt,
          end: normalized.endsAt,
          description: normalized.description?.slice(0, 5000) ?? null,
          location: normalized.location?.slice(0, 1000) ?? null,
          allDay: normalized.allDay,
          timezone: normalized.timezone,
          recurrenceRule: normalized.recurrenceRule,
          syncState: 'synced',
          syncDirection: 'imported',
          sourceUpdatedAt: normalized.sourceUpdatedAt,
          deletedAt: null,
          metadata: normalized.metadata as Prisma.InputJsonValue,
        },
        update: {
          externalCalendarId: raw.externalCalendarId,
          calendarId: calendarRowId,
          title: normalized.title.slice(0, 500),
          start: normalized.startsAt,
          end: normalized.endsAt,
          description: normalized.description?.slice(0, 5000) ?? null,
          location: normalized.location?.slice(0, 1000) ?? null,
          allDay: normalized.allDay,
          timezone: normalized.timezone,
          recurrenceRule: normalized.recurrenceRule,
          syncState: 'synced',
          syncDirection: 'imported',
          sourceUpdatedAt: normalized.sourceUpdatedAt,
          deletedAt: null,
          metadata: normalized.metadata as Prisma.InputJsonValue,
        },
      });
      if (existing) updated += 1;
      else created += 1;
    }

    let deleted = 0;
    if (dto.reconcileDeletes && dto.rangeStart && dto.rangeEnd) {
      const rangeStart = new Date(dto.rangeStart);
      const rangeEnd = new Date(dto.rangeEnd);
      const stale = await this.prisma.event.findMany({
        where: {
          userId,
          source: 'apple_eventkit',
          deletedAt: null,
          externalId: { startsWith: `ek:${deviceId}:` },
          start: { gte: rangeStart, lte: rangeEnd },
        },
        select: { id: true, externalId: true },
      });
      for (const row of stale) {
        if (row.externalId && !seenExternalIds.has(row.externalId)) {
          await this.prisma.event.update({
            where: { id: row.id },
            data: { deletedAt: new Date(), syncState: 'synced' },
          });
          deleted += 1;
        }
      }
    }

    const finishedAt = new Date();
    await this.prisma.calendarConnection.update({
      where: { id: connection.id },
      data: {
        syncedAt: finishedAt,
        validatedAt: finishedAt,
        syncStatus: 'idle',
        calendarStatus: 'connected',
        syncError: null,
      },
    });

    await this.prisma.calendarSyncLog.create({
      data: {
        userId,
        connectionId: connection.id,
        provider: 'apple_eventkit',
        deviceId,
        syncStartedAt: startedAt,
        syncFinishedAt: finishedAt,
        status: 'completed',
        eventsCreated: created,
        eventsUpdated: updated,
        eventsDeleted: deleted,
        eventsSkipped: skipped,
        metadata: {
          calendars: dto.calendars.length,
          eventsReceived: dto.events.length,
        },
      },
    });

    this.logger.log(
      `EventKit sync user=${userId} device=${deviceId} +${created} ~${updated} -${deleted} skip=${skipped}`,
    );
    this.eventEmitter.emit('calendar.synced', { userId });

    return {
      ok: true,
      created,
      updated,
      deleted,
      skipped,
      connection: await this.getStatus(userId, deviceId),
    };
  }

  async patchCalendars(userId: string, dto: PatchExternalCalendarsDto) {
    const deviceId = dto.deviceId?.trim() || '';
    const connection = await this.prisma.calendarConnection.findFirst({
      where: {
        userId,
        providerType: 'apple_eventkit',
        ...(deviceId ? { deviceId } : {}),
      },
    });
    if (!connection) {
      throw new NotFoundException('Apple Calendar connection not found');
    }

    for (const cal of dto.calendars) {
      await this.prisma.externalCalendar.updateMany({
        where: {
          userId,
          connectionId: connection.id,
          externalCalendarId: cal.externalCalendarId,
        },
        data: {
          isSelected: cal.isSelected ?? undefined,
          isVisible: cal.isVisible ?? undefined,
          title: cal.title,
        },
      });
    }
    return this.getStatus(userId, connection.deviceId);
  }

  async disconnect(userId: string, dto: DisconnectEventKitDto) {
    const deviceId = dto.deviceId?.trim();
    const connections = await this.prisma.calendarConnection.findMany({
      where: {
        userId,
        providerType: 'apple_eventkit',
        ...(deviceId ? { deviceId } : {}),
      },
    });
    if (connections.length === 0) {
      throw new NotFoundException('Apple Calendar connection not found');
    }

    for (const conn of connections) {
      await this.prisma.externalCalendar.deleteMany({
        where: { connectionId: conn.id },
      });
      if (!dto.keepEvents) {
        await this.prisma.event.updateMany({
          where: {
            userId,
            source: 'apple_eventkit',
            externalId: { startsWith: `ek:${conn.deviceId}:` },
          },
          data: { deletedAt: new Date() },
        });
      }
      await this.prisma.calendarConnection.delete({ where: { id: conn.id } });
    }

    this.eventEmitter.emit('calendar.synced', { userId });
    return { ok: true };
  }
}
