/** Message endpoints (swagger: /message). Pages of 20, oldest first, with nextCursor. */
import { request } from './client';

/**
 * @param {string} conversationId
 * @param {{ cursor?: string, isPoll?: boolean }} [options]
 * @returns {Promise<{ data: object[], nextCursor?: string, count: number }>}
 */
export function listMessages(conversationId, { cursor, isPoll = false } = {}) {
  return request('/message', {
    query: { conversation_id: conversationId, from_message_cursor: cursor },
    isPoll,
  });
}

/**
 * Text, image (fileId from uploadFile) or both.
 * @param {{ conversationId: string, content?: string, fileId?: string }} input
 */
export function sendMessage({ conversationId, content, fileId }) {
  return request('/message', {
    method: 'POST',
    body: { conversation_id: conversationId, content, file_id: fileId },
  });
}
