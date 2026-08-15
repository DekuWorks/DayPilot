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

function payloadTooLargeStatus(exception: unknown): number | null {
  if (!exception || typeof exception !== 'object') return null;
  const err = exception as { status?: number; type?: string };
  if (err.status === 413 || err.type === 'entity.too.large') {
    return HttpStatus.PAYLOAD_TOO_LARGE;
  }
  return null;
}

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
        : payloadTooLargeStatus(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException
        ? typeof exception.getResponse() === 'string'
          ? exception.getResponse()
          : ((exception.getResponse() as { message?: string }).message ??
            exception.message)
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

    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    const logLine = `${req?.method ?? '?'} ${req?.url ?? '?'} ${status} - ${msg}`;
    if (status >= 500) {
      this.logger.error(logLine);
    } else {
      this.logger.warn(logLine);
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message };
    res
      .status(status)
      .json(typeof body === 'object' ? body : { message: body });
  }
}
