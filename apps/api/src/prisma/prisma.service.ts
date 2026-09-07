import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../src/generated/prisma';
import {
  openPrismaConnectionResult,
  sealPrismaConnectionArgs,
} from '../calendar-connections/token-crypto';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
    this.$use(async (params, next) => {
      if (params.model === 'CalendarConnection') {
        sealPrismaConnectionArgs(params.args);
      }
      const result = await next(params);
      if (params.model === 'CalendarConnection') {
        return openPrismaConnectionResult(result);
      }
      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
