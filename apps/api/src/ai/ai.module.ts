import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { FounderHubModule } from '../founder-hub/founder-hub.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, FounderHubModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
