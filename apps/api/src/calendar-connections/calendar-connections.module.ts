import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from '../common/jwt-secret';
import { CalendarConnectionsController } from './calendar-connections.controller';
import { CalendarConnectionsService } from './calendar-connections.service';
import { EventKitSyncService } from './eventkit-sync.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config.get<string>('JWT_SECRET')),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CalendarConnectionsController],
  providers: [CalendarConnectionsService, EventKitSyncService],
  exports: [CalendarConnectionsService, EventKitSyncService],
})
export class CalendarConnectionsModule {}
