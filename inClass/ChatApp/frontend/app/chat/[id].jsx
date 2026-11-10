/**
 * Chat room (buildPlan.md 5.3): header slab, inverted message list with
 * older pages, optimistic sending with ticks, "N new" pill, long-press menu.
 * Photos: attach, upload with progress stage, tap to open the viewer.
 * Polls every 3 s while open.
 */
import MessageCircle from 'lucide-react-native/icons/message-circle';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AttachButton } from '../../src/components/chat/AttachButton';
import { ChatHeader } from '../../src/components/chat/ChatHeader';
import { ImageBubble } from '../../src/components/chat/ImageBubble';
import { Composer } from '../../src/components/chat/Composer';
import { MessageList } from '../../src/components/chat/MessageList';
import { MessageMenu } from '../../src/components/chat/MessageMenu';
import { MembersSheet } from '../../src/components/chats/MembersSheet';
import { ChatsSkeleton } from '../../src/components/chats/ChatsSkeleton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { space } from '../../src/constants/theme';
import { useMessages } from '../../src/hooks/useMessages';
import { useStore } from '../../src/hooks/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { chatsStore, loadConversations } from '../../src/store/chatsStore';
import { directoryStore, loadUsers } from '../../src/store/directoryStore';
import { sessionStore } from '../../src/store/sessionStore';
import { conversationTitle, memberNames } from '../../src/utils/conversationTitle';
import { formatClock } from '../../src/utils/format';
import { log } from '../../src/utils/logger';
import { KeyboardSpacer } from '../../src/components/ui/KeyboardSpacer';
import { setOpenChat, syncOpenChat } from '../../src/inbox/inboxStore';
import { islandFailed, islandPhotoDone, islandPhotoStarted } from '../../src/island/islandEvents';
import { dismissActivity } from '../../src/island/islandStore';
import { isLocal } from '../../src/hooks/messageList';

function showPhotoError(message) {
  Alert.alert('Photo not sent', message);
}

export default function ChatRoom() {
  const { id } = useLocalSearchParams();
  const conversationId = String(id);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const myName = useStore(sessionStore, (s) => s.name);
  const usersById = useStore(directoryStore, (s) => s.byId);
  const conversation = useStore(chatsStore, (s) =>
    s.conversations.find((item) => item.id === conversationId),
  );
  const chat = useMessages(conversationId, myId);
  const [menuMessage, setMenuMessage] = useState(null);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  // The inbox skips this chat while it is open, and counts it as read (V5).
  useEffect(() => {
    setOpenChat(conversationId);
    // the island's "new message" for this chat has been answered by opening it
    dismissActivity(`msg:${conversationId}`);
    dismissActivity(`new:${conversationId}`);
    return () => setOpenChat(null);
  }, [conversationId]);

  // Keep the Chats row (last message) in step with what this screen sees.
  useEffect(() => {
    const fromServer = chat.messages.filter((message) => !isLocal(message));
    if (fromServer.length) syncOpenChat(conversationId, fromServer, myId);
  }, [chat.messages, conversationId, myId]);

  // Messages that failed to send show in the island, tap to retry them all (V7).
  const failedIds = chat.messages
    .filter((message) => message.localState === 'failed')
    .map((message) => message.id)
    .join(',');
  useEffect(() => {
    const ids = failedIds ? failedIds.split(',') : [];
    islandFailed(conversationId, ids.length, () => ids.forEach((id) => chat.retry(id)));
    // chat.retry is stable (the controller is created once)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedIds, conversationId]);
  useEffect(() => () => islandFailed(conversationId, 0), [conversationId]);

  // Opened from a link before the chat list loaded: fetch what the header needs.
  useEffect(() => {
    if (!conversation) loadConversations();
    if (!Object.keys(usersById).length) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isGroup = conversation?.type === 'GROUP';
  const title = conversation ? conversationTitle(conversation, myId, usersById) : '';
  const names = conversation ? memberNames(conversation, myId, usersById) : [];

  function send(text) {
    chat.send(text);
    setSentCount((count) => count + 1);
  }

  async function sendPhoto(photo) {
    setSentCount((count) => count + 1);
    islandPhotoStarted(conversationId);
    const result = await chat.sendImage(photo);
    islandPhotoDone(result.ok);
    if (result.error) showPhotoError(result.error);
  }

  function openImage(message) {
    log.nav(`chat -> image/${message.fileId}`);
    router.push({
      pathname: '/image/[id]',
      params: {
        id: message.fileId,
        sender: usersById[message.senderId]?.name ?? '',
        time: formatClock(message.createdAt),
        caption: message.content ?? '',
      },
    });
  }

  function renderAttachment(message) {
    const hasImage = message.type === 'IMAGE' && (message.fileId || message.localUri);
    return hasImage ? <ImageBubble message={message} onOpen={openImage} /> : undefined;
  }

  function renderBody() {
    if (chat.status === 'loading') return <ChatsSkeleton />;
    if (chat.status === 'error') {
      return (
        <EmptyState
          icon={WifiOff}
          title="can't open this chat"
          message={chat.error}
          actionLabel="Try again"
          onAction={chat.loadInitial}
        />
      );
    }
    if (!chat.messages.length) {
      return <EmptyState icon={MessageCircle} title="say hello" message="No messages yet." />;
    }
    return (
      <MessageList
        messages={chat.messages}
        myId={myId}
        usersById={usersById}
        isGroup={isGroup}
        hasOlder={Boolean(chat.nextCursor)}
        isLoadingOlder={chat.isLoadingOlder}
        unseen={chat.unseen}
        onLoadOlder={chat.loadOlder}
        onSeen={chat.markSeen}
        onLongPress={setMenuMessage}
        onRetry={chat.retry}
        renderAttachment={renderAttachment}
        scrollToBottomSignal={sentCount}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ChatHeader
        title={title}
        isGroup={isGroup}
        names={names}
        isLive={chat.isLive}
        onShowMembers={() => setIsMembersOpen(true)}
      />
      <View style={styles.body}>{renderBody()}</View>
      <View style={styles.composer}>
        <Composer
          onSend={send}
          leading={<AttachButton onPick={sendPhoto} onError={showPhotoError} />}
        />
      </View>
      <KeyboardSpacer restingHeight={insets.bottom} />
      <MessageMenu
        message={menuMessage}
        isMine={menuMessage?.senderId === myId}
        usersById={usersById}
        onClose={() => setMenuMessage(null)}
      />
      <MembersSheet
        visible={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        title={title}
        names={names}
        myName={myName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  composer: { paddingTop: space.xs, paddingBottom: space.sm },
});
