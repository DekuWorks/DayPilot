import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { MetricsService } from '../health/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse();
    const method = req.method;
    const url = req.url ?? req.path;
    const start = Date.now();

    this.metrics.incrementRequestCount();
    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = res.statusCode;
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms`,
          );
        },
        error: (err) => {
          const duration = Date.now() - start;
          const statusCode = err.status ?? err.statusCode ?? 500;
          this.logger.warn(
            `${method} ${url} ${statusCode} ${duration}ms - ${err.message ?? err}`,
          );
        },
      }),
    );
  }
}
