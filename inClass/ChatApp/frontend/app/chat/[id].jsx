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
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
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
    const result = await chat.sendImage(photo);
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
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ChatHeader
        title={title}
        isGroup={isGroup}
        names={names}
        isLive={chat.isLive}
        onShowMembers={() => setIsMembersOpen(true)}
      />
      <View style={styles.body}>{renderBody()}</View>
      <View style={{ paddingBottom: insets.bottom + space.sm, paddingTop: space.xs }}>
        <Composer
          onSend={send}
          leading={<AttachButton onPick={sendPhoto} onError={showPhotoError} />}
        />
      </View>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
});
