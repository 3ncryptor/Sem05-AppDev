/**
 * "Test connection" on the login screen: GET /user without credentials.
 * Any HTTP answer (401 included) proves the backend is there.
 */
import { friendlyMessage } from './ApiError';
import { request } from './client';

/**
 * @param {string} baseUrl
 * @returns {Promise<{ ok: true } | { ok: false, message: string }>}
 */
export async function testConnection(baseUrl) {
  try {
    await request('/user', { auth: false, connection: { baseUrl } });
    return { ok: true };
  } catch (error) {
    if (error?.kind === 'http' && error.status < 500) return { ok: true };
    return { ok: false, message: friendlyMessage(error) };
  }
}
