/**
 * Pure helpers that turn raw conversations into what the Chats screen shows.
 * The backend gives DMs no name (name: null), so a DM is titled after the
 * other person, looked up in the user list.
 */

const UNKNOWN_USER = 'unknown user';
const UNTITLED_GROUP = 'untitled group';

/**
 * @param {{ type: string, participants_ids: string[] }} conversation
 * @param {string} myId
 * @returns {string | undefined} id of the other person in a DM
 */
export function otherParticipantId(conversation, myId) {
  return conversation.participants_ids.find((id) => id !== myId);
}

/**
 * @param {{ type: string, name?: string | null, participants_ids: string[] }} conversation
 * @param {string} myId
 * @param {Record<string, { name: string }>} usersById
 * @returns {string}
 */
export function conversationTitle(conversation, myId, usersById) {
  if (conversation.type === 'GROUP') return conversation.name?.trim() || UNTITLED_GROUP;
  const otherId = otherParticipantId(conversation, myId);
  if (!otherId) return usersById[myId]?.name ?? UNKNOWN_USER; // a DM with yourself
  return usersById[otherId]?.name ?? UNKNOWN_USER;
}

/**
 * Member usernames, the signed-in user last so their face is the least prominent.
 * @param {{ participants_ids: string[] }} conversation
 * @param {string} myId
 * @param {Record<string, { name: string }>} usersById
 * @returns {string[]}
 */
export function memberNames(conversation, myId, usersById) {
  const others = conversation.participants_ids.filter((id) => id !== myId);
  const ordered = conversation.participants_ids.includes(myId) ? [...others, myId] : others;
  return ordered.map((id) => usersById[id]?.name ?? UNKNOWN_USER);
}

/**
 * Splits into groups and DMs, newest first (the backend sorts by creation time).
 * @param {{ type: string, createdAt: string }[]} conversations
 * @returns {{ groups: object[], dms: object[] }}
 */
export function splitConversations(conversations) {
  const newestFirst = [...conversations].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  return {
    groups: newestFirst.filter((item) => item.type === 'GROUP'),
    dms: newestFirst.filter((item) => item.type !== 'GROUP'),
  };
}

/**
 * A short fingerprint of a list, so a poll can tell "no change" cheaply.
 * @param {{ id: string, participants_ids?: string[], name?: string | null }[]} list
 */
export function listSignature(list) {
  return list
    .map((item) => `${item.id}:${item.name ?? ''}:${(item.participants_ids ?? []).length}`)
    .join('|');
}

/**
 * @param {{ id: string }[]} users
 * @returns {Record<string, object>}
 */
export function indexById(users) {
  return Object.fromEntries(users.map((user) => [user.id, user]));
}
