/**
 * directoryStore: everyone on the server (GET /user), shared by Chats
 * (DM titles, member faces), People and the chat room. Loaded once and
 * refreshed on pull-to-refresh, or when a conversation mentions someone new.
 */
import { friendlyMessage } from '../api/ApiError';
import { listUsers } from '../api/users';
import { indexById } from '../utils/conversationTitle';
import { log } from '../utils/logger';
import { createStore } from './createStore';
import { sessionStore } from './sessionStore';

const initialState = { users: [], byId: {}, status: 'idle', error: '' };

export const directoryStore = createStore(initialState);

let inFlight = null;

/**
 * Loads the user list. Calls made while one is running share it.
 * @param {{ isPoll?: boolean }} [options]
 */
export function loadUsers({ isPoll = false } = {}) {
  if (inFlight) return inFlight;
  if (directoryStore.get().status === 'idle') directoryStore.set({ status: 'loading' });

  inFlight = listUsers({ isPoll })
    .then((users) => {
      directoryStore.set({ users, byId: indexById(users), status: 'ready', error: '' });
      log.state(`directory: ${users.length} users`, { isPoll, toConsole: !isPoll });
    })
    .catch((error) => {
      directoryStore.set({ status: 'error', error: friendlyMessage(error) });
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** @param {string[]} ids */
export function hasUnknownUsers(ids) {
  const { byId } = directoryStore.get();
  return ids.some((id) => !byId[id]);
}

sessionStore.subscribe((session) => {
  if (session.status === 'signedOut') directoryStore.reset();
});
