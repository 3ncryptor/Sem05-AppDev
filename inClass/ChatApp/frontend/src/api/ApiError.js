/**
 * ApiError: every failed request becomes one of these (buildPlan.md 1,
 * "Errors"). `kind` says what went wrong so the UI can pick a friendly
 * message; the raw detail still goes to the logs.
 */

export class ApiError extends Error {
  /**
   * @param {object} details
   * @param {'http' | 'network' | 'timeout'} details.kind
   * @param {string} details.message
   * @param {number} [details.status] HTTP status for kind "http"
   * @param {string} [details.requestId]
   */
  constructor({ kind, message, status = 0, requestId }) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.requestId = requestId;
  }
}

/**
 * Pulls the message out of a NestJS error body ({ message: string | string[] }).
 * @param {unknown} body
 * @param {number} status
 * @returns {string}
 */
export function messageFromBody(body, status) {
  const message = body && typeof body === 'object' ? body.message : undefined;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message) return message;
  return `Request failed (${status})`;
}

/**
 * Text for the user. Keeps server messages for 4xx (they are written for
 * people, e.g. "Invalid password"), and plain words for everything else.
 * @param {unknown} error
 * @returns {string}
 */
export function friendlyMessage(error) {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (error.kind === 'timeout') return 'The server took too long to answer.';
  if (error.kind === 'network') return 'Cannot reach the server. Check the address and Wi-Fi.';
  if (error.status >= 500) return 'The server had a problem. Please try again.';
  return error.message;
}
