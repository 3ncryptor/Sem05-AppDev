import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request, Response } from 'express';
import { ERROR_REASON_KEY } from './request-logger.middleware';

/** Pulls a readable message out of an exception, including validation errors. */
function reasonOf(exception: unknown): string {
  if (exception instanceof HttpException) {
    const body = exception.getResponse();
    const message = typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : body;
    return Array.isArray(message) ? message.join('; ') : String(message ?? exception.message);
  }
  return exception instanceof Error ? exception.message : String(exception);
}

/**
 * Records why a request failed so the request logger can print it, and prints
 * the stack trace for server errors. The response sent to the client is left
 * exactly as Nest would send it.
 */
@Catch()
export class LoggingExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;

    res.locals[ERROR_REASON_KEY] = reasonOf(exception);
    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${req.method} ${req.originalUrl} crashed: ${reasonOf(exception)}`, stack);
    }

    super.catch(exception, host);
  }
}
