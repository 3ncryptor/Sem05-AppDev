import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const MAX_TEXT_SHOWN = 40;
const QUIET_PATH_PREFIX = '/docs';

/** Set by LoggingExceptionFilter so the request line can say why it failed. */
export const ERROR_REASON_KEY = 'errorReason';

function statusColour(status: number): string {
  if (status >= 500) return RED;
  if (status >= 400) return YELLOW;
  return GREEN;
}

/** Shortens one body value so long text and base64 never flood the console. */
function summariseValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.length} item(s)]`;
  if (typeof value === 'string') {
    return value.length > MAX_TEXT_SHOWN ? `<${value.length} chars>` : JSON.stringify(value);
  }
  return JSON.stringify(value);
}

function summariseBody(body: unknown): string {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) return '';
  const fields = Object.entries(body).map(([key, value]) => `${key}=${summariseValue(value)}`);
  return ` ${DIM}{${fields.join(', ')}}${RESET}`;
}

/** Who made the request: the logged-in user, or the username a failed login tried. */
function describeUser(req: Request): string {
  const user = (req as Request & { user?: { name: string } }).user;
  if (user) return user.name;
  const header = req.headers.authorization ?? '';
  const attempted = header.startsWith('Basic ') ? header.slice(6).split(':')[0].trim() : '';
  return attempted ? `${attempted}(not logged in)` : 'anonymous';
}

/**
 * Logs one line per finished request to the console:
 *   POST /message 201 14ms user=aarav {conversation_id="…", content="hi"}
 * Passwords and the Authorization header are never printed.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (req.originalUrl.startsWith(QUIET_PATH_PREFIX)) return next();

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const status = res.statusCode;
    const reason = res.locals[ERROR_REASON_KEY];
    const line =
      `${req.method} ${req.originalUrl} ${statusColour(status)}${status}${RESET} ${ms.toFixed(0)}ms ` +
      `user=${describeUser(req)}${summariseBody(req.body)}` +
      (reason ? ` ${YELLOW}reason="${reason}"${RESET}` : '');

    if (status >= 500) logger.error(line);
    else if (status >= 400) logger.warn(line);
    else logger.log(line);
  });
  next();
}
