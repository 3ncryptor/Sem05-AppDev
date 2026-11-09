/**
 * MessageList: the inverted message list (newest at the bottom).
 * - scrolling to the top loads older pages
 * - while scrolled up, new messages from others show the "N new" pill;
 *   at the bottom they count as seen straight away
 * The list ref is used only to scroll (a visual concern, allowed by the hooks policy).
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { runPosition } from '../../hooks/messageList';
import { MessageBubble } from './MessageBubble';
import { NewMessagesPill } from './NewMessagesPill';

const NEAR_BOTTOM = 80;

/**
 * @param {object} props
 * @param {object[]} props.messages newest first
 * @param {string} props.myId
 * @param {Record<string, { name: string }>} props.usersById
 * @param {boolean} props.isGroup
 * @param {boolean} props.hasOlder
 * @param {boolean} props.isLoadingOlder
 * @param {number} props.unseen
 * @param {() => void} props.onLoadOlder
 * @param {() => void} props.onSeen
 * @param {(message: object) => void} props.onLongPress
 * @param {(id: string) => void} props.onRetry
 * @param {(message: object, isMine: boolean) => import('react').ReactNode} [props.renderAttachment]
 * @param {number} [props.scrollToBottomSignal] change it to jump to the newest message
 */
export function MessageList({
  messages,
  myId,
  usersById,
  isGroup,
  hasOlder,
  isLoadingOlder,
  unseen,
  onLoadOlder,
  onSeen,
  onLongPress,
  onRetry,
  renderAttachment,
  scrollToBottomSignal,
}) {
  const { colors } = useTheme();
  const listRef = useRef(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  useEffect(() => {
    if (!isScrolledUp && unseen > 0) onSeen();
  }, [isScrolledUp, unseen, onSeen]);

  useEffect(() => {
    if (scrollToBottomSignal) listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [scrollToBottomSignal]);

  function jumpToNewest() {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    onSeen();
  }

  const top = isLoadingOlder ? (
    <ActivityIndicator style={styles.top} color={colors.textTertiary} />
  ) : !hasOlder && messages.length ? (
    <Text style={[type.caption, styles.top, { color: colors.textTertiary }]}>
      start of the conversation
    </Text>
  ) : null;

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={messages}
        inverted
        keyExtractor={(message) => message.id}
        onEndReached={hasOlder ? onLoadOlder : undefined}
        onEndReachedThreshold={0.3}
        ListFooterComponent={top}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => setIsScrolledUp(event.nativeEvent.contentOffset.y > NEAR_BOTTOM)}
        scrollEventThrottle={100}
        contentContainerStyle={styles.content}
        renderItem={({ item, index }) => {
          const isMine = item.senderId === myId;
          const { isLastInRun, isFirstInRun } = runPosition(messages, index);
          return (
            <MessageBubble
              message={item}
              isMine={isMine}
              senderName={usersById[item.senderId]?.name ?? 'unknown user'}
              showSenderName={isGroup && !isMine && isFirstInRun}
              isLastInRun={isLastInRun}
              onLongPress={onLongPress}
              onRetry={onRetry}
              attachment={renderAttachment?.(item, isMine)}
            />
          );
        }}
      />
      <NewMessagesPill count={isScrolledUp ? unseen : 0} onPress={jumpToNewest} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { paddingVertical: space.md },
  top: { alignSelf: 'center', marginVertical: space.md },
});
