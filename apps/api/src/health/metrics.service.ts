import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private requestCount = 0;

  incrementRequestCount(): void {
    this.requestCount++;
  }

  getMetrics(): { uptimeSeconds: number; requestCount: number } {
    return {
      uptimeSeconds: Math.floor(process.uptime()),
      requestCount: this.requestCount,
    };
  }
}
