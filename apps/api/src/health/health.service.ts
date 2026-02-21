import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  async check(): Promise<{ status: 'ok' | 'degraded'; db?: 'ok' | 'error' }> {
    let db: 'ok' | 'error' = 'error';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'ok';
    } catch {
      // leave db as 'error'
    }
    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      db,
    };
  }

  getMetrics(): { uptimeSeconds: number; requestCount: number } {
    return this.metrics.getMetrics();
  }
}
