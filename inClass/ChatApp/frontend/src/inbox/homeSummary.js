/**
 * homeSummary: pure helpers for the Chats home (buildPlan.md 13, V6): the
 * greeting in the notch, the unread summary, chats ordered by activity, and
 * the faces in the "recently active" rail.
 */

const MORNING = 5;
const AFTERNOON = 12;
const EVENING = 17;
const NIGHT = 22;

/** @param {number} hour 0-23 */
export function greeting(hour) {
  if (hour >= MORNING && hour < AFTERNOON) return 'good morning';
  if (hour >= AFTERNOON && hour < EVENING) return 'good afternoon';
  if (hour >= EVENING && hour < NIGHT) return 'good evening';
  return 'good night';
}

/**
 * @param {{ messages: number, chats: number }} total from totalUnread
 * @returns {string}
 */
export function unreadSummary({ messages, chats }) {
  if (!messages) return 'all caught up';
  if (chats <= 1) return `${messages} new ${messages === 1 ? 'message' : 'messages'}`;
  return `${messages} new in ${chats} chats`;
}

function activityTime(chat, byChat) {
  return Date.parse(byChat[chat.id]?.latest?.createdAt ?? '') || Date.parse(chat.createdAt) || 0;
}

/**
 * Newest activity first: the latest message if the inbox knows it, else
 * when the chat was created. Returns a new array.
 * @param {{ id: string, createdAt: string }[]} chats
 * @param {Record<string, { latest?: { createdAt: string } }>} byChat
 */
export function byActivity(chats, byChat) {
  return [...chats].sort((a, b) => activityTime(b, byChat) - activityTime(a, byChat));
}

/**
 * Faces for the "recently active" rail: people with at least one message,
 * unread ones first, then the most recent.
 * @param {{ id: string, name: string, unread: number, lastAt: number }[]} rows
 * @param {number} limit
 */
export function activeFaces(rows, limit) {
  return rows
    .filter((row) => row.lastAt > 0)
    .sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0) || b.lastAt - a.lastAt)
    .slice(0, limit);
}
