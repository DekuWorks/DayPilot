import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { SentryFilter } from './common/sentry.filter';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(
    express.json({
      verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new SentryFilter());
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin:
      corsOrigin === undefined || corsOrigin === ''
        ? true
        : corsOrigin
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  if (process.env.NODE_ENV !== 'test') {
    console.log(`DayPilot API listening on port ${port}`);
  }
}
bootstrap();
