/**
 * Local-only GET /debug/logs (hidden from Swagger). The class server does
 * not have it; the Inspector treats 404/401 as "server logs unavailable".
 */
import { request } from './client';

/**
 * @param {{ after?: number, limit?: number }} [options]
 * @returns {Promise<{ entries: object[], latestSeq: number, oldestSeq: number }>}
 */
export function fetchServerLogs({ after, limit } = {}) {
  return request('/debug/logs', { query: { after, limit }, isPoll: true });
}
