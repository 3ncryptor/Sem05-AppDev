/**
 * Pure list operations for the chat room. The list is NEWEST FIRST, which
 * is what an inverted FlatList wants (index 0 sits at the bottom).
 * Local messages (being sent, or failed) carry `localState` and a temporary
 * id starting with "local-". Every function returns a new array.
 */

const LOCAL_PREFIX = 'local-';

/** @param {{ id: string }} message */
export function isLocal(message) {
  return message.id.startsWith(LOCAL_PREFIX);
}

/** @param {string} suffix */
export function localId(suffix) {
  return `${LOCAL_PREFIX}${suffix}`;
}

function byNewest(a, b) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

/**
 * Merges server messages into the list: new ids are added, known ids are
 * replaced (their receipts change), local messages are kept.
 * @param {object[]} list current, newest first
 * @param {object[]} incoming server messages, any order
 * @returns {{ list: object[], added: object[] }}
 */
export function mergeMessages(list, incoming) {
  const known = new Set(list.map((message) => message.id));
  const incomingById = new Map(incoming.map((message) => [message.id, message]));
  const added = incoming.filter((message) => !known.has(message.id));
  const updated = list.map((message) => incomingById.get(message.id) ?? message);
  return { list: [...updated, ...added].sort(byNewest), added };
}

/** Puts a message being sent at the bottom of the chat. */
export function addLocal(list, message) {
  return [message, ...list];
}

/**
 * Swaps a local message for the server's copy. If a poll already brought the
 * server copy, the local one is simply removed.
 */
export function confirmLocal(list, tempId, serverMessage) {
  const alreadyThere = list.some((message) => message.id === serverMessage.id);
  if (alreadyThere) return list.filter((message) => message.id !== tempId);
  return list.map((message) => (message.id === tempId ? serverMessage : message));
}

/** @param {'sending' | 'failed'} localState */
export function setLocalState(list, tempId, localState) {
  return list.map((message) => (message.id === tempId ? { ...message, localState } : message));
}

/**
 * Where a bubble sits in a run of messages from the same sender, for the
 * inverted list (index 0 = newest = bottom).
 * @param {object[]} list newest first
 * @param {number} index
 * @returns {{ isLastInRun: boolean, isFirstInRun: boolean }}
 *   last = bottom bubble of the run (gets the avatar, time and tail);
 *   first = top bubble (gets the sender name in groups)
 */
export function runPosition(list, index) {
  const current = list[index];
  const newer = list[index - 1];
  const older = list[index + 1];
  return {
    isLastInRun: !newer || newer.senderId !== current.senderId,
    isFirstInRun: !older || older.senderId !== current.senderId,
  };
}
