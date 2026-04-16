import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingInterceptor } from './common/logging.interceptor';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './ai/ai.module';
import { CalendarConnectionsModule } from './calendar-connections/calendar-connections.module';
import { envSchema } from './env.schema';
import { AuditModule } from './audit/audit.module';

/** `pnpm dev --filter @daypilot/api` runs with cwd `apps/api`; monorepo secrets live in repo-root `.env`. */
const apiEnvFiles = [
  join(process.cwd(), '..', '.env'),
  join(process.cwd(), '.env'),
].filter((p) => existsSync(p));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: apiEnvFiles.length > 0 ? apiEnvFiles : ['.env'],
      validate: (env) => envSchema.parse(env),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('THROTTLE_TTL', 60_000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuditModule,
    HealthModule,
    AuthModule,
    BillingModule,
    EventsModule,
    AiModule,
    CalendarConnectionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
