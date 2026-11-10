/**
 * chatsStore: the signed-in user's conversations plus the connection state
 * that drives the "reconnecting" / "back online" banner.
 * loadConversations() is called on first load, pull-to-refresh and every
 * poll; it only replaces the list when something actually changed.
 */
import { createConversation, listConversations } from '../api/conversations';
import { friendlyMessage } from '../api/ApiError';
import { RESTORED_BANNER_MS } from '../constants/config';
import { nextConnectionState } from '../utils/connectionState';
import { listSignature } from '../utils/conversationTitle';
import { findDirectChat } from '../utils/people';
import { log } from '../utils/logger';
import { createStore } from './createStore';
import { hasUnknownUsers, loadUsers } from './directoryStore';
import { sessionStore } from './sessionStore';

const initialState = {
  conversations: [],
  signature: '',
  status: 'idle', // idle | loading | ready | error
  error: '',
  connection: 'online', // online | reconnecting | restored
};

export const chatsStore = createStore(initialState);

let settleTimer = null;

function moveConnection(event) {
  const before = chatsStore.get().connection;
  const after = nextConnectionState(before, event);
  if (after === before) return;
  chatsStore.set({ connection: after });
  log.state(`connection: ${after}`, { level: after === 'reconnecting' ? 'warn' : 'info' });

  clearTimeout(settleTimer);
  if (after === 'restored') {
    settleTimer = setTimeout(() => moveConnection('settle'), RESTORED_BANNER_MS);
  }
}

/** @param {{ isPoll?: boolean }} [options] */
export async function loadConversations({ isPoll = false } = {}) {
  const { status } = chatsStore.get();
  if (status === 'idle') chatsStore.set({ status: 'loading' });

  try {
    const conversations = await listConversations({ isPoll });
    const signature = listSignature(conversations);
    const changed = signature !== chatsStore.get().signature;
    if (changed) chatsStore.set({ conversations, signature });
    chatsStore.set({ status: 'ready', error: '' });
    moveConnection('success');
    // Unchanged background checks are counted by the heartbeat, not logged (V4).
    if (changed) log.state(`chats changed: ${conversations.length} in total`, { isPoll });

    const ids = conversations.flatMap((item) => item.participants_ids);
    if (hasUnknownUsers(ids)) loadUsers({ isPoll });
  } catch (error) {
    chatsStore.set({
      status: chatsStore.get().conversations.length ? 'ready' : 'error',
      error: friendlyMessage(error),
    });
    moveConnection('failure');
  }
}

/** Adds a conversation the user just created, without waiting for the next poll. */
export function addConversation(conversation) {
  const conversations = [conversation, ...chatsStore.get().conversations];
  chatsStore.set({ conversations, signature: listSignature(conversations) });
}

/**
 * The DM with someone: the existing one, or a new one.
 * @param {string} myId
 * @param {string} otherId
 * @returns {Promise<string>} conversation id
 */
export async function openDirectChat(myId, otherId) {
  if (chatsStore.get().status !== 'ready') await loadConversations();
  const existing = findDirectChat(chatsStore.get().conversations, myId, otherId);
  if (existing) return existing.id;
  const created = await createConversation({ type: 'DM', participantIds: [otherId] });
  addConversation(created);
  log.state(`chats: new DM ${created.id}`);
  return created.id;
}

/**
 * @param {string} name
 * @param {string[]} participantIds people other than me (the server adds me)
 * @returns {Promise<string>} conversation id
 */
export async function createGroup(name, participantIds) {
  const created = await createConversation({ type: 'GROUP', name: name.trim(), participantIds });
  addConversation(created);
  log.state(`chats: new group "${created.name}" with ${participantIds.length} people`);
  return created.id;
}

sessionStore.subscribe((session) => {
  if (session.status !== 'signedOut') return;
  clearTimeout(settleTimer);
  chatsStore.reset();
});
