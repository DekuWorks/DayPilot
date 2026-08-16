import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { CalendarConnectionsService } from '../calendar-connections/calendar-connections.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

function readEventMeta(metadata: unknown): {
  workspaceId?: string;
  calendarColor?: string;
} {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  const raw = metadata as Record<string, unknown>;
  return {
    workspaceId:
      typeof raw.workspaceId === 'string' ? raw.workspaceId : undefined,
    calendarColor:
      typeof raw.calendarColor === 'string' ? raw.calendarColor : undefined,
  };
}

function mergeEventMeta(
  current: unknown,
  patch: { workspaceId?: string; calendarColor?: string },
): Record<string, unknown> {
  const base = readEventMeta(current);
  const next: Record<string, unknown> =
    current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  if (patch.workspaceId !== undefined) next.workspaceId = patch.workspaceId;
  else if (base.workspaceId) next.workspaceId = base.workspaceId;
  if (patch.calendarColor !== undefined) next.calendarColor = patch.calendarColor;
  else if (base.calendarColor) next.calendarColor = base.calendarColor;
  return next;
}

function toEventPayload(e: {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description: string | null;
  location: string | null;
  source: string;
  externalId: string | null;
  allDay?: boolean;
  externalCalendarId?: string | null;
  calendarId?: string | null;
  calendarColor?: string | null;
  workspaceId?: string | null;
  syncState?: string | null;
  syncDirection?: string | null;
  readOnly?: boolean;
}) {
  const appleReadOnly =
    e.source === 'apple_eventkit' || e.source === 'apple';
  return {
    id: e.id,
    title: e.title,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    description: e.description ?? undefined,
    location: e.location ?? undefined,
    source: e.source,
    externalId: e.externalId ?? undefined,
    allDay: e.allDay ?? false,
    externalCalendarId: e.externalCalendarId ?? undefined,
    calendarId: e.calendarId ?? undefined,
    calendarColor: e.calendarColor ?? undefined,
    workspaceId: e.workspaceId ?? undefined,
    syncState: e.syncState ?? undefined,
    syncDirection: e.syncDirection ?? undefined,
    readOnly: appleReadOnly || !canUserDeleteEvent(e),
    providerLabel:
      e.source === 'apple_eventkit' || e.source === 'apple'
        ? 'Apple Calendar'
        : e.source === 'google'
          ? 'Google Calendar'
          : e.source === 'outlook'
            ? 'Microsoft Outlook'
            : e.source === 'native'
              ? 'DayPilot'
              : e.source,
  };
}

/** Only DayPilot-created events. Imported EventKit/Google/Outlook stay read-only. */
export function canUserDeleteEvent(event: {
  source?: string | null;
  syncDirection?: string | null;
}): boolean {
  if (event.syncDirection === 'imported') return false;
  return (event.source ?? 'native') === 'native';
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: AuditService,
    private readonly calendarConnections: CalendarConnectionsService,
  ) {}

  async findAll(userId: string, from?: string, to?: string) {
    const where: {
      userId: string;
      deletedAt: null;
      start?: { lte?: Date };
      end?: { gte?: Date };
    } = {
      userId,
      deletedAt: null,
    };
    // Overlap with [from, to]: event.start <= to AND event.end >= from
    if (from && to) {
      where.start = { lte: new Date(to) };
      where.end = { gte: new Date(from) };
    } else if (from) {
      where.end = { gte: new Date(from) };
    } else if (to) {
      where.start = { lte: new Date(to) };
    }
    const events = await this.prisma.event.findMany({
      where,
      orderBy: { start: 'asc' },
      include: { externalCalendar: { select: { color: true } } },
    });
    const colorByExternal = await this.calendarColorsByExternal(
      userId,
      events.map((e) => e.externalCalendarId),
    );
    return events.map((e) => {
      const meta = readEventMeta(e.metadata);
      return toEventPayload({
        ...e,
        workspaceId: meta.workspaceId ?? null,
        calendarColor:
          e.externalCalendar?.color ??
          (e.externalCalendarId
            ? colorByExternal.get(e.externalCalendarId)
            : undefined) ??
          meta.calendarColor ??
          null,
      });
    });
  }

  async findOne(userId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, userId },
      include: { externalCalendar: { select: { color: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    const colorByExternal = await this.calendarColorsByExternal(userId, [
      event.externalCalendarId,
    ]);
    const meta = readEventMeta(event.metadata);
    return toEventPayload({
      ...event,
      workspaceId: meta.workspaceId ?? null,
      calendarColor:
        event.externalCalendar?.color ??
        (event.externalCalendarId
          ? colorByExternal.get(event.externalCalendarId)
          : undefined) ??
        meta.calendarColor ??
        null,
    });
  }

  private async calendarColorsByExternal(
    userId: string,
    externalIds: Array<string | null | undefined>,
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(externalIds.filter((id): id is string => Boolean(id))),
    ];
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.externalCalendar.findMany({
      where: { userId, externalCalendarId: { in: ids } },
      select: { externalCalendarId: true, color: true },
    });
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.color) map.set(row.externalCalendarId, row.color);
    }
    return map;
  }

  async create(userId: string, dto: CreateEventDto) {
    const metadata = mergeEventMeta(
      {},
      {
        workspaceId: dto.workspaceId,
        calendarColor: dto.calendarColor,
      },
    );
    const event = await this.prisma.event.create({
      data: {
        userId,
        title: dto.title,
        start: new Date(dto.start),
        end: new Date(dto.end),
        description: dto.description ?? null,
        location: dto.location ?? null,
        source: 'native',
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    const meta = readEventMeta(event.metadata);
    const payload = toEventPayload({
      ...event,
      workspaceId: meta.workspaceId ?? null,
      calendarColor: meta.calendarColor ?? null,
    });
    this.eventEmitter.emit('event.created', { userId, event: payload });
    await this.audit.log({
      action: 'event.created',
      entityType: 'event',
      entityId: event.id,
      userId,
    });
    return payload;
  }

  async update(userId: string, eventId: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findFirst({
      where: { id: eventId, userId },
    });
    if (!existing) throw new NotFoundException('Event not found');

    const nextTitle = dto.title ?? existing.title;
    const nextStart = dto.start != null ? new Date(dto.start) : existing.start;
    const nextEnd = dto.end != null ? new Date(dto.end) : existing.end;
    const nextDescription =
      dto.description !== undefined ? dto.description ?? null : existing.description;
    const nextLocation =
      dto.location !== undefined ? dto.location ?? null : existing.location;

    if (
      (existing.source === 'google' || existing.source === 'outlook') &&
      existing.externalId
    ) {
      await this.calendarConnections.pushExternalEventUpdate(
        userId,
        existing.source,
        existing.externalId,
        {
          title: nextTitle,
          start: nextStart,
          end: nextEnd,
          description: nextDescription,
          location: nextLocation,
        },
      );
    }

    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(dto.title != null && { title: dto.title }),
        ...(dto.start != null && { start: new Date(dto.start) }),
        ...(dto.end != null && { end: new Date(dto.end) }),
        ...(dto.description !== undefined && {
          description: dto.description ?? null,
        }),
        ...(dto.location !== undefined && { location: dto.location ?? null }),
        ...((dto.workspaceId !== undefined || dto.calendarColor !== undefined) && {
          metadata: mergeEventMeta(existing.metadata, {
            workspaceId: dto.workspaceId,
            calendarColor: dto.calendarColor,
          }) as Prisma.InputJsonValue,
        }),
      },
    });
    const meta = readEventMeta(event.metadata);
    const payload = toEventPayload({
      ...event,
      workspaceId: meta.workspaceId ?? null,
      calendarColor: meta.calendarColor ?? null,
    });
    this.eventEmitter.emit('event.updated', { userId, event: payload });
    return payload;
  }

  async remove(userId: string, eventId: string) {
    const existing = await this.prisma.event.findFirst({
      where: { id: eventId, userId },
    });
    if (!existing) throw new NotFoundException('Event not found');

    if (!canUserDeleteEvent(existing)) {
      throw new ForbiddenException(
        'Imported calendar events cannot be deleted in DayPilot',
      );
    }

    await this.prisma.event.delete({ where: { id: eventId } });
    this.eventEmitter.emit('event.deleted', { userId, eventId });
    await this.audit.log({
      action: 'event.deleted',
      entityType: 'event',
      entityId: eventId,
      userId,
    });
    return { id: eventId };
  }
}
