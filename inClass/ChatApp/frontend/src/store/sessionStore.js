/**
 * sessionStore: who is signed in and to which server.
 *
 * status: 'restoring' (app start, reading the Keychain) -> 'signedOut' | 'signedIn'.
 * Persisted: server choice, name, password and profile. On launch the LAN
 * address is worked out again, because the laptop's IP can change.
 * Network calls (checking the password) live in the login hook, not here.
 */
import { resolveBaseUrl } from '../api/baseUrl';
import { log } from '../utils/logger';
import { createStore } from './createStore';
import { loadJson, saveJson } from './persist';

const STORAGE_KEY = 'huddle.session';

const signedOutState = {
  status: 'signedOut',
  serverMode: 'lan',
  customUrl: '',
  baseUrl: '',
  name: '',
  password: '',
  user: null,
};

export const sessionStore = createStore({ ...signedOutState, status: 'restoring' });

function persisted({ serverMode, customUrl, name, password, user }) {
  return { serverMode, customUrl, name, password, user };
}

/** Reads the saved session at launch. Always ends in signedIn or signedOut. */
export async function restoreSession() {
  const saved = await loadJson(STORAGE_KEY);
  const serverMode = saved?.serverMode === 'custom' ? 'custom' : 'lan';
  const customUrl = saved?.customUrl ?? '';
  const baseUrl = resolveBaseUrl(serverMode, customUrl) ?? '';
  const canSignIn = Boolean(saved?.name && saved?.password && saved?.user && baseUrl);

  sessionStore.set({
    ...signedOutState,
    serverMode,
    customUrl,
    baseUrl,
    name: saved?.name ?? '',
    password: canSignIn ? saved.password : '',
    user: canSignIn ? saved.user : null,
    status: canSignIn ? 'signedIn' : 'signedOut',
  });
  log.state(canSignIn ? `session: restored ${saved.name} @ ${baseUrl}` : 'session: no saved login');
}

/**
 * Called by login after the server accepted the name and password.
 * @param {{ serverMode: 'lan'|'custom', customUrl: string, baseUrl: string,
 *           name: string, password: string, user: object }} session
 */
export async function completeSignIn(session) {
  sessionStore.set({ ...session, status: 'signedIn' });
  log.state(`session: signed in as ${session.name} @ ${session.baseUrl}`);
  await saveJson(STORAGE_KEY, persisted(sessionStore.get()));
}

/** Keeps the server choice and name (handy on the login screen), forgets the password. */
export async function signOut() {
  const { serverMode, customUrl, baseUrl, name } = sessionStore.get();
  sessionStore.set({ ...signedOutState, serverMode, customUrl, baseUrl, name });
  log.state(`session: signed out ${name}`);
  await saveJson(STORAGE_KEY, persisted(sessionStore.get()));
}
