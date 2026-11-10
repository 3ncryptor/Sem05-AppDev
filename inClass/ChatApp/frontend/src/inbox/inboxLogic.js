/**
 * inboxLogic: the pure parts of the inbox checker (buildPlan.md 13, V5).
 *
 * The backend has no "last message" on a conversation and never updates read
 * receipts, so the app works both out itself: it checks each chat's newest
 * page in turn, spread evenly over a cycle, and counts unread messages
 * against the time this phone last opened that chat.
 */

/** Never check faster than one chat a second, whatever the chat count. */
export const MIN_CHECK_GAP_MS = 1000;
/** Longest wait after repeated failures. */
export const MAX_BACKOFF_MS = 60000;
/** Message ids remembered per chat, enough for one page and then some. */
const SEEN_LIMIT = 40;

/**
 * Time between two checks so one cycle covers every chat once.
 * @param {number} cycleMs
 * @param {number} chatCount
 */
export function checkGapMs(cycleMs, chatCount) {
  if (chatCount <= 0) return cycleMs;
  return Math.max(MIN_CHECK_GAP_MS, Math.round(cycleMs / chatCount));
}

/**
 * Round robin over the chat ids, skipping the chat open on screen.
 * @param {string[]} ids
 * @param {string | null} lastId the chat checked last time
 * @param {string | null} openId
 * @returns {string | null}
 */
export function nextChatToCheck(ids, lastId, openId) {
  const candidates = ids.filter((id) => id !== openId);
  if (!candidates.length) return null;
  const index = candidates.indexOf(lastId);
  if (index === -1 && lastId !== null && ids.includes(lastId)) {
    // the last one is the open chat: continue after it in the full order
    const after = ids.slice(ids.indexOf(lastId) + 1).find((id) => id !== openId);
    return after ?? candidates[0];
  }
  return candidates[(index + 1) % candidates.length];
}

function timeOf(message) {
  return Date.parse(message.createdAt) || 0;
}

/**
 * @param {object[]} messages any order
 * @returns {object | null} the newest one
 */
export function latestMessage(messages) {
  if (!messages.length) return null;
  return messages.reduce((newest, message) =>
    timeOf(message) > timeOf(newest) ? message : newest,
  );
}

/**
 * One-line preview: the text, "photo", or "photo: caption".
 * @param {object | null} message
 */
export function messagePreview(message) {
  if (!message) return '';
  const text = (message.content ?? '').replace(/\s+/g, ' ').trim();
  const isPhoto = message.type === 'IMAGE' || Boolean(message.fileId);
  if (isPhoto) return text ? `photo: ${text}` : 'photo';
  return text;
}

/**
 * Messages from others after the later of: my last visit, my last reply.
 * @param {object[]} messages
 * @param {string} myId
 * @param {string | number} lastReadAt ISO string or epoch ms; 0 = never opened
 */
export function unreadCount(messages, myId, lastReadAt) {
  const myLatest = messages
    .filter((message) => message.senderId === myId)
    .reduce((latest, message) => Math.max(latest, timeOf(message)), 0);
  const readAt = Math.max(new Date(lastReadAt || 0).getTime() || 0, myLatest);
  return messages.filter((message) => message.senderId !== myId && timeOf(message) > readAt).length;
}

/**
 * @param {object[]} messages
 * @param {Set<string>} seenIds ids seen in earlier checks
 * @param {string} myId
 * @returns {object[]} new messages from others, oldest first
 */
export function newFromOthers(messages, seenIds, myId) {
  return messages
    .filter((message) => !seenIds.has(message.id) && message.senderId !== myId)
    .sort((a, b) => timeOf(a) - timeOf(b));
}

/**
 * A chat's inbox entry after a successful check. Returns a new object.
 * @param {object | undefined} previous
 * @param {object[]} messages the newest page
 * @param {{ myId: string, lastReadAt: string | number, now: number }} context
 */
export function applyPage(previous, messages, { myId, lastReadAt, now }) {
  const latest = latestMessage(messages) ?? previous?.latest ?? null;
  const ids = [...(previous?.seenIds ?? []), ...messages.map((message) => message.id)];
  return {
    latest,
    unread: unreadCount(messages, myId, lastReadAt),
    seenIds: [...new Set(ids)].slice(-SEEN_LIMIT),
    checkedAt: now,
    failures: 0,
  };
}

/**
 * @param {Record<string, { unread: number }>} byChat
 * @returns {{ messages: number, chats: number }}
 */
export function totalUnread(byChat) {
  const counts = Object.values(byChat).map((entry) => entry.unread ?? 0);
  return {
    messages: counts.reduce((sum, count) => sum + count, 0),
    chats: counts.filter((count) => count > 0).length,
  };
}

/**
 * Extra wait after `failures` failed checks in a row: 0, base, 2x, 4x ... capped.
 * @param {number} failures
 * @param {number} baseMs
 */
export function backoffMs(failures, baseMs) {
  if (failures <= 0) return 0;
  return Math.min(MAX_BACKOFF_MS, baseMs * 2 ** (failures - 1));
}
