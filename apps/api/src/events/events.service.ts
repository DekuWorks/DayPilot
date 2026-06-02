import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
import { CalendarConnectionsService } from '../calendar-connections/calendar-connections.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

function toEventPayload(e: {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description: string | null;
  location: string | null;
  source: string;
  externalId: string | null;
}) {
  return {
    id: e.id,
    title: e.title,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    description: e.description ?? undefined,
    location: e.location ?? undefined,
    source: e.source,
    externalId: e.externalId ?? undefined,
  };
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
      start?: { lte?: Date };
      end?: { gte?: Date };
    } = {
      userId,
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
    });
    return events.map(toEventPayload);
  }

  async findOne(userId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, userId },
    });
    if (!event) throw new NotFoundException('Event not found');
    return toEventPayload(event);
  }

  async create(userId: string, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        userId,
        title: dto.title,
        start: new Date(dto.start),
        end: new Date(dto.end),
        description: dto.description ?? null,
        location: dto.location ?? null,
        source: 'native',
      },
    });
    const payload = toEventPayload(event);
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
      },
    });
    const payload = toEventPayload(event);
    this.eventEmitter.emit('event.updated', { userId, event: payload });
    return payload;
  }

  async remove(userId: string, eventId: string) {
    const existing = await this.prisma.event.findFirst({
      where: { id: eventId, userId },
    });
    if (!existing) throw new NotFoundException('Event not found');

    if (
      (existing.source === 'google' || existing.source === 'outlook') &&
      existing.externalId
    ) {
      await this.calendarConnections.pushExternalEventDelete(
        userId,
        existing.source,
        existing.externalId,
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
