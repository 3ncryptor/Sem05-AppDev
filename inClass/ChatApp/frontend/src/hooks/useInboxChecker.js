/**
 * useInboxChecker: runs the inbox checker while signed in and in the
 * foreground (V5). Mounted once at the root. It obeys Inspector > tools
 * (pause polling, the "inbox checks" switch, the interval) and is quiet in
 * the background, where nobody can see an unread badge anyway.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { listMessages } from '../api/messages';
import { toolsStore } from '../debug/toolsStore';
import { createInboxChecker } from '../inbox/inboxChecker';
import { inboxStore, recordCheck, recordFailure, restoreInbox } from '../inbox/inboxStore';
import { chatsStore } from '../store/chatsStore';
import { sessionStore } from '../store/sessionStore';
import { useStore } from './useStore';

async function checkChat(chatId) {
  const myId = sessionStore.get().user?.id;
  try {
    const page = await listMessages(chatId, { isPoll: true, initiator: 'inbox checker' });
    recordCheck(chatId, page.data ?? [], myId);
  } catch {
    // the request is already logged by the client; back off quietly
    recordFailure(chatId);
  }
}

function isEnabled() {
  const tools = toolsStore.get();
  return tools.inboxChecks && !tools.pausePolling;
}

export function useInboxChecker() {
  const isSignedIn = useStore(sessionStore, (state) => state.status === 'signedIn');
  const userName = useStore(sessionStore, (state) => state.name);

  useEffect(() => {
    if (!isSignedIn || !userName) return undefined;
    let isCancelled = false;

    const checker = createInboxChecker({
      getChatIds: () => chatsStore.get().conversations.map((chat) => chat.id),
      getOpenId: () => inboxStore.get().openChatId,
      getCycleMs: () => toolsStore.get().pollMs.inbox,
      isEnabled,
      getFailures: (chatId) => inboxStore.get().byChat[chatId]?.failures ?? 0,
      check: checkChat,
    });
    // Read times first, so the first checks count unread against them.
    restoreInbox(userName).then(() => {
      if (!isCancelled && AppState.currentState === 'active') checker.start();
    });

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checker.start();
      else checker.stop();
    });
    return () => {
      isCancelled = true;
      subscription.remove();
      checker.stop();
    };
  }, [isSignedIn, userName]);
}
