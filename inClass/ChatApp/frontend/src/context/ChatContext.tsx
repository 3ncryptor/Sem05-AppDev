import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ConversationResponseDto,
  MessageResponseDto,
  UserResponseDto,
} from '../types/api';
import { chatApi } from '../api/endpoints';
import { mockBackend, resetMockDatabase } from '../api/mockServer';
import { useAuth } from './AuthContext';

export interface ConversationMessageState {
  messages: MessageResponseDto[]; // Chronological oldest -> newest
  nextCursor: string | null;      // Pass as from_message_cursor for older pages
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
}

export type ReactionIconKey =
  | 'heart'
  | 'thumbs-up'
  | 'flame'
  | 'flash'
  | 'sparkles'
  | 'checkmark-circle';

interface ChatContextValue {
  users: UserResponseDto[];
  usersById: Record<string, UserResponseDto>;
  conversations: ConversationResponseDto[];
  lastMessageByConvId: Record<string, MessageResponseDto | undefined>;
  messagesByConvId: Record<string, ConversationMessageState>;
  pinnedConvIds: string[];
  mutedConvIds: string[];
  starredMessageIds: string[];
  reactionsByMessageId: Record<string, ReactionIconKey[]>;
  isLoadingDirectory: boolean;
  isLoadingConversations: boolean;
  globalError: string | null;
  factBotAutoEnabled: boolean;
  activeViewerImage: {
    uri: string;
    caption?: string | null;
    senderName?: string;
    createdAt?: string;
  } | null;

  refreshAll: () => Promise<void>;
  refreshUsers: () => Promise<UserResponseDto[]>;
  refreshConversations: () => Promise<ConversationResponseDto[]>;
  startOrGetDm: (recipientUserId: string) => Promise<ConversationResponseDto>;
  createGroup: (name: string, participantIds: string[]) => Promise<ConversationResponseDto>;
  loadLatestMessages: (conversationId: string, silent?: boolean) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<number>;
  sendMessage: (
    conversationId: string,
    payload: { content?: string; imageInfo?: string },
  ) => Promise<MessageResponseDto>;
  togglePinConversation: (conversationId: string) => void;
  toggleMuteConversation: (conversationId: string) => void;
  toggleStarMessage: (messageId: string) => void;
  toggleMessageReaction: (messageId: string, reaction: ReactionIconKey) => void;
  fetchUserProfileById: (userId?: string) => Promise<UserResponseDto>;
  setFactBotAutoEnabled: (enabled: boolean) => void;
  triggerFactBotNow: () => Promise<MessageResponseDto | null>;
  resetMockData: () => Promise<void>;
  setActiveViewerImage: (
    img: {
      uri: string;
      caption?: string | null;
      senderName?: string;
      createdAt?: string;
    } | null,
  ) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  PINNED: '@chatapp_pinned_convs_v1',
  MUTED: '@chatapp_muted_convs_v1',
  STARRED: '@chatapp_starred_msgs_v1',
  REACTIONS: '@chatapp_msg_reactions_v1',
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiConfig, currentUser, mode, credentials } = useAuth();

  const [users, setUsers] = useState<UserResponseDto[]>([]);
  const [conversations, setConversations] = useState<ConversationResponseDto[]>([]);
  const [messagesByConvId, setMessagesByConvId] = useState<
    Record<string, ConversationMessageState>
  >({});
  const [lastMessageByConvId, setLastMessageByConvId] = useState<
    Record<string, MessageResponseDto | undefined>
  >({});
  const [pinnedConvIds, setPinnedConvIds] = useState<string[]>([]);
  const [mutedConvIds, setMutedConvIds] = useState<string[]>([]);
  const [starredMessageIds, setStarredMessageIds] = useState<string[]>([]);
  const [reactionsByMessageId, setReactionsByMessageId] = useState<
    Record<string, ReactionIconKey[]>
  >({});
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [factBotAutoEnabled, setFactBotAutoEnabled] = useState<boolean>(false);
  const [activeViewerImage, setActiveViewerImage] = useState<{
    uri: string;
    caption?: string | null;
    senderName?: string;
    createdAt?: string;
  } | null>(null);

  // Hydrate persisted client-side UX preferences (pins, mutes, stars, reactions)
  useEffect(() => {
    (async () => {
      try {
        const [rawPins, rawMutes, rawStars, rawReacts] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PINNED),
          AsyncStorage.getItem(STORAGE_KEYS.MUTED),
          AsyncStorage.getItem(STORAGE_KEYS.STARRED),
          AsyncStorage.getItem(STORAGE_KEYS.REACTIONS),
        ]);
        if (rawPins) setPinnedConvIds(JSON.parse(rawPins));
        if (rawMutes) setMutedConvIds(JSON.parse(rawMutes));
        if (rawStars) setStarredMessageIds(JSON.parse(rawStars));
        if (rawReacts) setReactionsByMessageId(JSON.parse(rawReacts));
      } catch {
        // Ignore storage load errors
      }
    })();
  }, []);

  const messagesRef = useRef(messagesByConvId);
  messagesRef.current = messagesByConvId;

  const usersById = useMemo(() => {
    const map: Record<string, UserResponseDto> = {};
    for (const u of users) {
      map[u.id] = u;
    }
    if (currentUser) {
      map[currentUser.id] = currentUser;
    }
    return map;
  }, [currentUser, users]);

  const refreshUsers = useCallback(async (): Promise<UserResponseDto[]> => {
    if (!apiConfig) return [];
    setIsLoadingDirectory(true);
    try {
      const list = await chatApi.getAllUsers(apiConfig);
      setUsers(list);
      setGlobalError(null);
      return list;
    } catch (err: any) {
      setGlobalError(err?.message || 'Failed to load user directory');
      throw err;
    } finally {
      setIsLoadingDirectory(false);
    }
  }, [apiConfig]);

  const refreshConversations = useCallback(async (): Promise<ConversationResponseDto[]> => {
    if (!apiConfig) return [];
    setIsLoadingConversations(true);
    try {
      const list = await chatApi.getConversations(apiConfig);
      setConversations(list);
      setGlobalError(null);

      // Hydrate latest preview message for conversations that haven't been loaded yet
      await Promise.all(
        list.slice(0, 12).map(async (conv) => {
          try {
            const page = await chatApi.getMessages(apiConfig, conv.id);
            if (page.data.length > 0) {
              const newest = page.data[page.data.length - 1];
              setLastMessageByConvId((prev) => ({
                ...prev,
                [conv.id]: newest,
              }));
            }
          } catch {
            // Ignore preview errors
          }
        }),
      );

      return list;
    } catch (err: any) {
      setGlobalError(err?.message || 'Failed to load conversations');
      throw err;
    } finally {
      setIsLoadingConversations(false);
    }
  }, [apiConfig]);

  const refreshAll = useCallback(async () => {
    if (!apiConfig) return;
    return Promise.all([
      refreshUsers().catch(() => []),
      refreshConversations().catch(() => []),
    ]).then(() => undefined);
  }, [apiConfig, refreshConversations, refreshUsers]);

  // Initial load on login or mode switch
  useEffect(() => {
    if (!apiConfig || !currentUser) {
      setUsers([]);
      setConversations([]);
      setMessagesByConvId({});
      setLastMessageByConvId({});
      return;
    }
    refreshAll().catch(() => {
      // Handled in globalError state
    });
  }, [apiConfig, currentUser, refreshAll]);

  /**
   * Optional FactBot 10-second simulator when in Offline Mock Mode
   */
  useEffect(() => {
    if (mode !== 'mock' || !factBotAutoEnabled || !credentials) return;
    const timer = setInterval(async () => {
      try {
        const msg = await mockBackend.triggerFactBotTick(credentials);
        if (msg) {
          await refreshConversations();
          if (messagesRef.current[msg.conversationId]?.hasLoadedOnce) {
            await loadLatestMessages(msg.conversationId, true);
          }
        }
      } catch {
        // Ignore tick error
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [credentials, factBotAutoEnabled, mode, refreshConversations]);

  const startOrGetDm = useCallback(
    async (recipientUserId: string): Promise<ConversationResponseDto> => {
      if (!apiConfig) throw new Error('Not authenticated');
      const conv = await chatApi.createConversation(apiConfig, {
        type: 'DM',
        participants_ids: [recipientUserId],
      });
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        return exists ? prev : [conv, ...prev];
      });
      return conv;
    },
    [apiConfig],
  );

  const createGroup = useCallback(
    async (name: string, participantIds: string[]): Promise<ConversationResponseDto> => {
      if (!apiConfig) throw new Error('Not authenticated');
      const conv = await chatApi.createConversation(apiConfig, {
        type: 'GROUP',
        name: name.trim(),
        participants_ids: participantIds,
      });
      setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
      return conv;
    },
    [apiConfig],
  );

  /**
   * Fetches the most recent page of 20 messages (`GET /message?conversation_id=CID`)
   * and merges it with any older history already paged into memory.
   */
  const loadLatestMessages = useCallback(
    async (conversationId: string, silent = false): Promise<void> => {
      if (!apiConfig) return;

      if (!silent) {
        setMessagesByConvId((prev) => ({
          ...prev,
          [conversationId]: {
            messages: prev[conversationId]?.messages ?? [],
            nextCursor: prev[conversationId]?.nextCursor ?? null,
            isLoadingInitial: true,
            isLoadingMore: false,
            hasLoadedOnce: prev[conversationId]?.hasLoadedOnce ?? false,
            error: null,
          },
        }));
      }

      try {
        const res = await chatApi.getMessages(apiConfig, conversationId);
        setMessagesByConvId((prev) => {
          const existingState = prev[conversationId];
          const existingMessages = existingState?.messages ?? [];

          // Merge existing older messages with latest page without duplicates
          const mapById = new Map<string, MessageResponseDto>();
          for (const m of existingMessages) mapById.set(m.id, m);
          for (const m of res.data) mapById.set(m.id, m);

          const merged = Array.from(mapById.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );

          // Preserve older nextCursor if user already loaded older pages
          const nextCursor =
            existingState?.hasLoadedOnce && existingMessages.length > res.data.length
              ? existingState.nextCursor
              : res.nextCursor ?? null;

          return {
            ...prev,
            [conversationId]: {
              messages: merged,
              nextCursor,
              isLoadingInitial: false,
              isLoadingMore: false,
              hasLoadedOnce: true,
              error: null,
            },
          };
        });

        if (res.data.length > 0) {
          const newest = res.data[res.data.length - 1];
          setLastMessageByConvId((prev) => ({
            ...prev,
            [conversationId]: newest,
          }));
        }
      } catch (err: any) {
        setMessagesByConvId((prev) => ({
          ...prev,
          [conversationId]: {
            messages: prev[conversationId]?.messages ?? [],
            nextCursor: prev[conversationId]?.nextCursor ?? null,
            isLoadingInitial: false,
            isLoadingMore: false,
            hasLoadedOnce: prev[conversationId]?.hasLoadedOnce ?? false,
            error: err?.message || 'Failed to load messages',
          },
        }));
      }
    },
    [apiConfig],
  );

  /**
   * Reverse-cursor pagination:
   * Calls `GET /message?conversation_id=CID&from_message_cursor=<nextCursor>`
   * and prepends the 20 older messages ahead of the current messages list.
   */
  const loadOlderMessages = useCallback(
    async (conversationId: string): Promise<number> => {
      if (!apiConfig) return 0;
      const currentState = messagesRef.current[conversationId];
      if (!currentState || !currentState.nextCursor || currentState.isLoadingMore) {
        return 0;
      }

      const cursorToFetch = currentState.nextCursor;
      setMessagesByConvId((prev) => ({
        ...prev,
        [conversationId]: {
          ...prev[conversationId],
          isLoadingMore: true,
          error: null,
        },
      }));

      try {
        const res = await chatApi.getMessages(apiConfig, conversationId, cursorToFetch);
        setMessagesByConvId((prev) => {
          const prevList = prev[conversationId]?.messages ?? [];
          const mapById = new Map<string, MessageResponseDto>();
          // Prepend older messages first
          for (const m of res.data) mapById.set(m.id, m);
          for (const m of prevList) mapById.set(m.id, m);

          const merged = Array.from(mapById.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );

          return {
            ...prev,
            [conversationId]: {
              messages: merged,
              nextCursor: res.nextCursor ?? null,
              isLoadingInitial: false,
              isLoadingMore: false,
              hasLoadedOnce: true,
              error: null,
            },
          };
        });
        return res.data.length;
      } catch (err: any) {
        setMessagesByConvId((prev) => ({
          ...prev,
          [conversationId]: {
            ...prev[conversationId],
            isLoadingMore: false,
            error: err?.message || 'Failed to load older messages',
          },
        }));
        return 0;
      }
    },
    [apiConfig],
  );

  /**
   * Sends a text and/or Base64 image message via `POST /message`
   */
  const sendMessage = useCallback(
    async (
      conversationId: string,
      payload: { content?: string; imageInfo?: string },
    ): Promise<MessageResponseDto> => {
      if (!apiConfig) throw new Error('Not authenticated');
      const created = await chatApi.createMessage(apiConfig, {
        conversation_id: conversationId,
        content: payload.content?.trim() || undefined,
        imageInfo: payload.imageInfo || undefined,
      });

      setMessagesByConvId((prev) => {
        const existing = prev[conversationId]?.messages ?? [];
        const withoutDup = existing.filter((m) => m.id !== created.id);
        return {
          ...prev,
          [conversationId]: {
            messages: [...withoutDup, created],
            nextCursor: prev[conversationId]?.nextCursor ?? null,
            isLoadingInitial: false,
            isLoadingMore: false,
            hasLoadedOnce: true,
            error: null,
          },
        };
      });

      setLastMessageByConvId((prev) => ({
        ...prev,
        [conversationId]: created,
      }));

      return created;
    },
    [apiConfig],
  );

  const fetchUserProfileById = useCallback(
    async (userId?: string): Promise<UserResponseDto> => {
      if (!apiConfig) throw new Error('Not authenticated');
      return chatApi.getProfile(apiConfig, userId);
    },
    [apiConfig],
  );

  const togglePinConversation = useCallback((conversationId: string) => {
    setPinnedConvIds((prev) => {
      const next = prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [conversationId, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.PINNED, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleMuteConversation = useCallback((conversationId: string) => {
    setMutedConvIds((prev) => {
      const next = prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId];
      AsyncStorage.setItem(STORAGE_KEYS.MUTED, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleStarMessage = useCallback((messageId: string) => {
    setStarredMessageIds((prev) => {
      const next = prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [messageId, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.STARRED, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleMessageReaction = useCallback(
    (messageId: string, reaction: ReactionIconKey) => {
      setReactionsByMessageId((prev) => {
        const current = prev[messageId] ?? [];
        const exists = current.includes(reaction);
        const updatedList = exists
          ? current.filter((r) => r !== reaction)
          : [...current, reaction];
        const next = { ...prev, [messageId]: updatedList };
        AsyncStorage.setItem(STORAGE_KEYS.REACTIONS, JSON.stringify(next)).catch(
          () => {},
        );
        return next;
      });
    },
    [],
  );

  const triggerFactBotNow = useCallback(async (): Promise<MessageResponseDto | null> => {
    if (!credentials) return null;
    const msg = await mockBackend.triggerFactBotTick(credentials);
    if (msg) {
      await refreshConversations();
      if (messagesRef.current[msg.conversationId]?.hasLoadedOnce) {
        await loadLatestMessages(msg.conversationId, true);
      }
    }
    return msg;
  }, [credentials, loadLatestMessages, refreshConversations]);

  const resetMockData = useCallback(async () => {
    await resetMockDatabase();
    setMessagesByConvId({});
    setLastMessageByConvId({});
    await refreshAll();
  }, [refreshAll]);

  const value = useMemo<ChatContextValue>(
    () => ({
      users,
      usersById,
      conversations,
      lastMessageByConvId,
      messagesByConvId,
      pinnedConvIds,
      mutedConvIds,
      starredMessageIds,
      reactionsByMessageId,
      isLoadingDirectory,
      isLoadingConversations,
      globalError,
      factBotAutoEnabled,
      activeViewerImage,
      refreshAll,
      refreshUsers,
      refreshConversations,
      startOrGetDm,
      createGroup,
      loadLatestMessages,
      loadOlderMessages,
      sendMessage,
      togglePinConversation,
      toggleMuteConversation,
      toggleStarMessage,
      toggleMessageReaction,
      fetchUserProfileById,
      setFactBotAutoEnabled,
      triggerFactBotNow,
      resetMockData,
      setActiveViewerImage,
    }),
    [
      activeViewerImage,
      conversations,
      createGroup,
      factBotAutoEnabled,
      fetchUserProfileById,
      globalError,
      isLoadingConversations,
      isLoadingDirectory,
      lastMessageByConvId,
      loadLatestMessages,
      loadOlderMessages,
      messagesByConvId,
      mutedConvIds,
      pinnedConvIds,
      reactionsByMessageId,
      refreshAll,
      refreshConversations,
      refreshUsers,
      resetMockData,
      sendMessage,
      starredMessageIds,
      startOrGetDm,
      toggleMessageReaction,
      toggleMuteConversation,
      togglePinConversation,
      toggleStarMessage,
      triggerFactBotNow,
      users,
      usersById,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used inside a ChatProvider');
  }
  return ctx;
}

