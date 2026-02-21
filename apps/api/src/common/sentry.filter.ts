import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { url?: string; method?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException
        ? (typeof exception.getResponse() === 'string'
            ? exception.getResponse()
            : (exception.getResponse() as { message?: string }).message ?? exception.message)
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    if (status >= 500 && typeof Sentry.captureException === 'function') {
      Sentry.captureException(exception, {
        extra: {
          url: req?.url,
          method: req?.method,
          status,
        },
      });
    }

    const logLine = `${req?.method ?? '?'} ${req?.url ?? '?'} ${status} - ${message}`;
    if (status >= 500) {
      this.logger.error(logLine);
    } else {
      this.logger.warn(logLine);
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message };
    res.status(status).json(typeof body === 'object' ? body : { message: body });
  }
}
