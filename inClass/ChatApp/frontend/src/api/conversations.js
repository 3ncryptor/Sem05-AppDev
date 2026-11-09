/** Conversation endpoints (swagger: /conversation). */
import { request } from './client';

/** Conversations the user belongs to. On the local backend this also marks messages delivered. */
export function listConversations({ isPoll = false } = {}) {
  return request('/conversation', { isPoll });
}

/**
 * @param {{ type: 'DM' | 'GROUP', name?: string, participantIds: string[] }} input
 */
export function createConversation({ type, name, participantIds }) {
  return request('/conversation', {
    method: 'POST',
    body: { type, name, participants_ids: participantIds },
  });
}
