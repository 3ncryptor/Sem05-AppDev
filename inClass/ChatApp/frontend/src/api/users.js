/** User endpoints (swagger: /user, /user/profile). */
import { request } from './client';

/**
 * Own profile, or another user's with userId. Also how login checks a
 * password: the backend auto-registers unknown names on first request.
 * @param {{ userId?: string, connection?: import('./client').Connection }} [options]
 */
export function getProfile({ userId, connection } = {}) {
  return request('/user/profile', { query: { user_id: userId }, connection });
}

/** Everyone registered on the server. */
export function listUsers({ isPoll = false } = {}) {
  return request('/user', { isPoll });
}
