import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FounderHubController } from './founder-hub.controller';
import { FounderHubService } from './founder-hub.service';

@Module({
  imports: [PrismaModule],
  controllers: [FounderHubController],
  providers: [FounderHubService],
  exports: [FounderHubService],
})
export class FounderHubModule {}
