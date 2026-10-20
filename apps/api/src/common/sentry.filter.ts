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

const GENERIC_SERVER_ERROR = 'Something went wrong. Please try again.';

function payloadTooLargeStatus(exception: unknown): number | null {
  if (!exception || typeof exception !== 'object') return null;
  const err = exception as { status?: number; type?: string };
  if (err.status === 413 || err.type === 'entity.too.large') {
    return HttpStatus.PAYLOAD_TOO_LARGE;
  }
  return null;
}

/**
 * JSON returned to clients. Server faults stay generic so a Prisma path,
 * SQL fragment, or stack never leaves the process. 4xx copy is unchanged.
 */
export function clientErrorBody(exception: unknown, status: number): object {
  if (status >= 500) {
    return { statusCode: status, message: GENERIC_SERVER_ERROR };
  }
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    return typeof body === 'object' && body !== null ? body : { message: body };
  }
  const message =
    exception instanceof Error ? exception.message : 'Internal server error';
  return { statusCode: status, message };
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
        : (payloadTooLargeStatus(exception) ??
          HttpStatus.INTERNAL_SERVER_ERROR);
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

    const body = clientErrorBody(exception, status);
    res
      .status(status)
      .json(typeof body === 'object' ? body : { message: body });
  }
}
