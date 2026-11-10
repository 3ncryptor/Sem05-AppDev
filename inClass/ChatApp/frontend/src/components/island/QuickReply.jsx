/**
 * QuickReply: answer a message from the island without opening the chat.
 * Sends through the normal endpoint (so it is logged and shows in the
 * Inspector), marks the chat read, then the island confirms "sent".
 * Focusing the field keeps the card open (the auto-collapse is cancelled).
 */
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { friendlyMessage } from '../../api/ApiError';
import { sendMessage } from '../../api/messages';
import { fonts } from '../../constants/theme';
import { markChatRead } from '../../inbox/inboxStore';
import { confirmIsland, dismissActivity, expandIsland } from '../../island/islandStore';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';
import { GradientFill } from '../ui/GradientFill';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { island } from './islandTheme';

const HEIGHT = 40;

/**
 * @param {object} props
 * @param {object} props.activity a message activity
 * @param {(problem: string) => void} props.onError
 */
export function QuickReply({ activity, onError }) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const canSend = text.trim().length > 0 && !isSending;

  async function send() {
    if (!canSend) return;
    onError('');
    setIsSending(true);
    try {
      await sendMessage({ conversationId: activity.chatId, content: text.trim() });
      markChatRead(activity.chatId);
      dismissActivity(activity.key);
      haptics.success();
      confirmIsland({ title: 'sent' });
      log.state(`island: quick reply to ${activity.title}`);
    } catch (error) {
      onError(friendlyMessage(error));
      setIsSending(false);
    }
  }

  return (
    <View style={styles.row}>
      <TextInput
        value={text}
        onChangeText={(next) => {
          setText(next);
          onError('');
        }}
        onFocus={() => expandIsland(activity.key)}
        onSubmitEditing={send}
        placeholder={`reply to ${activity.isGroup ? activity.title : activity.sender}`}
        placeholderTextColor={island.muted}
        style={styles.input}
        returnKeyType="send"
        maxLength={1000}
        accessibilityLabel="Quick reply"
      />
      <PressableScale
        onPress={send}
        disabled={!canSend}
        accessibilityLabel="Send reply"
        style={styles.sendWrap}
      >
        <GradientFill style={styles.send}>
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Icon as={ArrowUp} color="#FFFFFF" size={18} />
          )}
        </GradientFill>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    flex: 1,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    paddingHorizontal: 14,
    backgroundColor: island.raised,
    color: island.text,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  sendWrap: { width: HEIGHT, height: HEIGHT },
  send: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
