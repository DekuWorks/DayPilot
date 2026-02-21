import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditPayload {
  action: string;
  entityType: string;
  entityId?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(payload: AuditPayload): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId ?? null,
          userId: payload.userId ?? null,
          organizationId: payload.organizationId ?? null,
          metadata:
            payload.metadata === null || payload.metadata === undefined
              ? undefined
              : (payload.metadata as Prisma.InputJsonValue),
        },
      });
    } catch (err) {
      // Don't fail the request if audit write fails; log and continue
      console.error('[Audit] Failed to write audit log:', err);
    }
  }
}
