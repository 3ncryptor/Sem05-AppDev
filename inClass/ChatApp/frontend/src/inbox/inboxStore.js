/**
 * inboxStore: what the inbox checker knows about every chat (V5).
 *
 * state:
 *   byChat      { [chatId]: { latest, unread, seenIds, checkedAt, failures } }
 *   lastReadAt  { [chatId]: epoch ms } when this phone last had the chat open,
 *               saved per user so unread survives a restart
 *   openChatId  the chat on screen; it is never checked here (it polls itself)
 *
 * The first time a chat is checked on this phone its current messages count
 * as read, so a fresh install does not light up every old chat.
 * New messages from others are handed to listeners (the island, V7).
 */
import { createStore } from '../store/createStore';
import { loadJson, saveJson } from '../store/persist';
import { sessionStore } from '../store/sessionStore';
import { log } from '../utils/logger';
import { applyPage, latestMessage, newFromOthers } from './inboxLogic';

/** Read times kept on the phone (SecureStore values should stay small). */
const MAX_READ_ENTRIES = 40;

const initialState = { byChat: {}, lastReadAt: {}, openChatId: null, userKey: '' };

export const inboxStore = createStore(initialState);

const listeners = new Set();

/**
 * @param {(news: { chatId: string, messages: object[] }) => void} listener
 * @returns {() => void} unsubscribe
 */
export function onInboxNews(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function storageKey(userName) {
  return `huddle.inbox.${userName.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

function trimmed(lastReadAt) {
  return Object.fromEntries(
    Object.entries(lastReadAt)
      .sort(([, a], [, b]) => b - a)
      .slice(0, MAX_READ_ENTRIES),
  );
}

function saveReadTimes() {
  const { userKey, lastReadAt } = inboxStore.get();
  if (userKey) saveJson(storageKey(userKey), trimmed(lastReadAt));
}

/**
 * Loads this user's read times; call once after sign in, before checking.
 * Merges: anything marked read in memory meanwhile wins over the saved copy.
 */
export async function restoreInbox(userName) {
  const saved = await loadJson(storageKey(userName));
  inboxStore.set((state) => ({
    userKey: userName,
    lastReadAt: { ...(saved ?? {}), ...state.lastReadAt },
  }));
}

/**
 * @param {string} chatId
 * @param {number} [now]
 */
export function markChatRead(chatId, now = Date.now()) {
  inboxStore.set((state) => {
    const entry = state.byChat[chatId];
    return {
      lastReadAt: { ...state.lastReadAt, [chatId]: now },
      byChat: entry ? { ...state.byChat, [chatId]: { ...entry, unread: 0 } } : state.byChat,
    };
  });
  saveReadTimes();
}

/** The chat screen calls this on open (id) and close (null). */
export function setOpenChat(chatId) {
  const previous = inboxStore.get().openChatId;
  inboxStore.set({ openChatId: chatId });
  if (chatId) markChatRead(chatId);
  else if (previous) markChatRead(previous);
}

/**
 * Records a successful check of one chat and announces new messages.
 * @param {string} chatId
 * @param {object[]} messages the newest page
 * @param {string} myId
 * @param {number} [now]
 */
export function recordCheck(chatId, messages, myId, now = Date.now()) {
  const state = inboxStore.get();
  const previous = state.byChat[chatId];
  let lastReadAt = state.lastReadAt[chatId];

  if (lastReadAt === undefined) {
    // first sight on this phone: what is there now counts as read
    lastReadAt = Date.parse(latestMessage(messages)?.createdAt ?? '') || now;
    inboxStore.set({ lastReadAt: { ...state.lastReadAt, [chatId]: lastReadAt } });
    saveReadTimes();
  }

  // Only after a successful check is there a baseline; a failure-only entry is not one.
  const fresh = previous?.checkedAt ? newFromOthers(messages, new Set(previous.seenIds), myId) : [];
  const entry = applyPage(previous, messages, { myId, lastReadAt, now });
  inboxStore.set((current) => ({ byChat: { ...current.byChat, [chatId]: entry } }));

  if (fresh.length && chatId !== inboxStore.get().openChatId) {
    log.state(`inbox: ${fresh.length} new in chat ${chatId.slice(-6)}`);
    listeners.forEach((listener) => listener({ chatId, messages: fresh }));
  }
}

/**
 * Notes a failed check so the checker can back off.
 * @param {string} chatId
 */
export function recordFailure(chatId) {
  inboxStore.set((state) => {
    const entry = state.byChat[chatId] ?? { latest: null, unread: 0, seenIds: [], checkedAt: 0 };
    return {
      byChat: { ...state.byChat, [chatId]: { ...entry, failures: (entry.failures ?? 0) + 1 } },
    };
  });
}

/**
 * The chat screen's own poll found messages: keep the inbox in step so the
 * row shows the right last message without waiting for the next cycle.
 * @param {string} chatId
 * @param {object[]} messages
 * @param {string} myId
 */
export function syncOpenChat(chatId, messages, myId) {
  const state = inboxStore.get();
  const entry = applyPage(state.byChat[chatId], messages, {
    myId,
    lastReadAt: Date.now(),
    now: Date.now(),
  });
  inboxStore.set({ byChat: { ...state.byChat, [chatId]: entry } });
}

sessionStore.subscribe((session) => {
  if (session.status === 'signedOut' && inboxStore.get().userKey) inboxStore.reset();
});
