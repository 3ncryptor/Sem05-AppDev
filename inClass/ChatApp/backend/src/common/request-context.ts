import { AsyncLocalStorage } from 'node:async_hooks';
import type { IncomingHttpHeaders } from 'node:http';
import type { NextFunction, Request, Response } from 'express';

/**
 * Per-request details that every log line written while handling the request
 * should carry, so the app's Inspector can group server lines by request.
 */
export interface RequestContext {
  requestId: string | null;
  isPoll: boolean;
}

/** Holds the current request's context across async calls (no parameter passing needed). */
export const requestContext = new AsyncLocalStorage<RequestContext>();

// Ids end up in log lines, so only short, plain ids are accepted (no log injection)
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Reads `X-Request-Id` and `X-Client-Poll` sent by the app. Both are optional. */
export function readRequestContext(headers: IncomingHttpHeaders): RequestContext {
  const rawId = headers['x-request-id'];
  const requestId = typeof rawId === 'string' && REQUEST_ID_PATTERN.test(rawId) ? rawId : null;
  return { requestId, isPoll: headers['x-client-poll'] === '1' };
}

/**
 * Runs the rest of the request inside its context, so any log line written by
 * guards, controllers or services is tagged with the request id.
 * Registered after the body parsers, which can lose async context while reading.
 */
export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  requestContext.run(readRequestContext(req.headers), next);
}
