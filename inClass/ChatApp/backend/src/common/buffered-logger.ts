import { ConsoleLogger, LogLevel } from '@nestjs/common';
import { logBuffer } from './log-buffer';
import { requestContext } from './request-context';

/**
 * Nest's console logger, unchanged on screen, that also copies every line into
 * the in-memory log buffer (tagged with the current request, if any).
 * Passed to NestFactory.create, so every `new Logger(...)` goes through it.
 */
export class BufferedLogger extends ConsoleLogger {
  protected printMessages(
    messages: unknown[],
    context = '',
    logLevel: LogLevel = 'log',
    writeStreamType?: 'stdout' | 'stderr',
    errorStack?: unknown,
  ): void {
    super.printMessages(messages, context, logLevel, writeStreamType, errorStack);

    const request = requestContext.getStore();
    for (const message of messages) {
      const text = typeof message === 'string' ? message : JSON.stringify(message);
      logBuffer.add(logLevel, context, text, request);
    }
  }
}
