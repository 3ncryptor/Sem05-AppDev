/**
 * useConversations: the Chats screen's data. Loads conversations and users,
 * polls conversations every POLL_MS.conversations, and offers refresh() for
 * pull-to-refresh. Returns display-ready groups and DMs.
 */
import { useEffect, useState } from 'react';
import { POLL_MS } from '../constants/config';
import { chatsStore, loadConversations } from '../store/chatsStore';
import { directoryStore, loadUsers } from '../store/directoryStore';
import { sessionStore } from '../store/sessionStore';
import { splitConversations } from '../utils/conversationTitle';
import { usePolling } from './usePolling';
import { useStore } from './useStore';

const pollConversations = () => loadConversations({ isPoll: true });

export function useConversations() {
  const chats = useStore(chatsStore);
  const usersById = useStore(directoryStore, (state) => state.byId);
  const myId = useStore(sessionStore, (state) => state.user?.id ?? '');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
    loadUsers();
  }, []);

  usePolling(pollConversations, POLL_MS.conversations);

  async function refresh() {
    setIsRefreshing(true);
    await Promise.all([loadConversations(), loadUsers()]);
    setIsRefreshing(false);
  }

  const { groups, dms } = splitConversations(chats.conversations);
  return {
    groups,
    dms,
    usersById,
    myId,
    status: chats.status,
    error: chats.error,
    connection: chats.connection,
    isRefreshing,
    refresh,
  };
}
