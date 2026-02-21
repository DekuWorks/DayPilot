import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, MetricsService],
  exports: [MetricsService],
})
export class HealthModule {}
