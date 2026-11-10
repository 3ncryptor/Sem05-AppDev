/**
 * useIslandFeeds: connects the app's live sources to the island (V7):
 * - the inbox checker's new messages  -> "diya: are you coming?"
 * - a chat that appears in the list   -> "kabir added you"
 * - the chats poll's connection state -> "reconnecting" / "back online"
 * - coming back to the app with nothing new -> one quiet breath (W1)
 * Mounted once, by NotchIsland. Plain subscriptions, no rendering.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { messagePreview } from '../inbox/inboxLogic';
import { onInboxNews } from '../inbox/inboxStore';
import { islandConnection, islandMessage, islandNewChat } from '../island/islandEvents';
import { breatheIsland, islandStore } from '../island/islandStore';
import { chatsStore } from '../store/chatsStore';
import { directoryStore } from '../store/directoryStore';
import { sessionStore } from '../store/sessionStore';
import { conversationTitle } from '../utils/conversationTitle';

function nameOf(userId) {
  return directoryStore.get().byId[userId]?.name ?? 'someone';
}

function handleNews({ chatId, messages }) {
  const chat = chatsStore.get().conversations.find((item) => item.id === chatId);
  if (!chat) return;
  const myId = sessionStore.get().user?.id ?? '';
  const latest = messages.at(-1);
  const isGroup = chat.type === 'GROUP';
  const previous = islandStore.get().activities.find((item) => item.key === `msg:${chatId}`);
  islandMessage({
    chatId,
    title: conversationTitle(chat, myId, directoryStore.get().byId),
    sender: nameOf(latest.senderId),
    preview: messagePreview(latest),
    count: messages.length,
    isGroup,
    previousCount: previous?.count ?? 0,
  });
}

/** Long enough for the first inbox round to report anything new first. */
const BREATH_DELAY_MS = 2500;

export function useIslandFeeds() {
  useEffect(() => onInboxNews(handleNews), []);

  useEffect(() => {
    let timer = null;
    const subscription = AppState.addEventListener('change', (state) => {
      clearTimeout(timer);
      if (state === 'active') timer = setTimeout(breatheIsland, BREATH_DELAY_MS);
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let knownIds = null;
    let lastConnection = chatsStore.get().connection;

    return chatsStore.subscribe((state) => {
      if (state.connection !== lastConnection) {
        lastConnection = state.connection;
        islandConnection(state.connection);
      }
      if (state.status === 'idle') knownIds = null; // signed out: the next user starts fresh
      if (state.status !== 'ready') return;

      const ids = state.conversations.map((chat) => chat.id);
      if (knownIds === null) {
        knownIds = new Set(ids); // first load: everything is already known
        return;
      }
      const myId = sessionStore.get().user?.id ?? '';
      state.conversations
        .filter((chat) => !knownIds.has(chat.id) && chat.createdBy !== myId)
        .forEach((chat) =>
          islandNewChat({
            chatId: chat.id,
            title: conversationTitle(chat, myId, directoryStore.get().byId),
            by: chat.createdBy ? nameOf(chat.createdBy) : '',
          }),
        );
      knownIds = new Set(ids);
    });
  }, []);
}
