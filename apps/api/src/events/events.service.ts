import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';
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
  ) {}

  async findAll(userId: string, from?: string, to?: string) {
    const where: { userId: string; start?: { gte?: Date }; end?: { lte?: Date } } = {
      userId,
    };
    if (from) where.start = { gte: new Date(from) };
    if (to) where.end = { lte: new Date(to) };
    const events = await this.prisma.event.findMany({
      where,
      orderBy: { start: 'asc' },
    });
    return events.map(toEventPayload);
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
    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(dto.title != null && { title: dto.title }),
        ...(dto.start != null && { start: new Date(dto.start) }),
        ...(dto.end != null && { end: new Date(dto.end) }),
        ...(dto.description !== undefined && { description: dto.description ?? null }),
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
