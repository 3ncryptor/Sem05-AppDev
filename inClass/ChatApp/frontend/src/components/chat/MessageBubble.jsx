/**
 * MessageBubble: one message (design.md 6.4). Incoming bubbles are light
 * cards with the sender's face beside the last bubble of a run; outgoing
 * ones are ink pills on the right with ticks. A failed send shakes, turns
 * red and offers "tap to retry". Long-press opens the message menu.
 */
import ImageIcon from 'lucide-react-native/icons/image';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, shadow, space, type } from '../../constants/theme';
import { useShake } from '../../hooks/useShake';
import { useTheme } from '../../hooks/useTheme';
import { formatClock } from '../../utils/format';
import { haptics } from '../../utils/haptics';
import { bubbleLabel, tickState } from '../../utils/ticks';
import { Avatar } from '../avatar/Avatar';
import { Icon } from '../ui/Icon';
import { Ticks } from './Ticks';
import Animated, { Keyframe } from 'react-native-reanimated';
import { durations, EASE_OUT, riseIn } from '../../constants/motion';

const BUBBLE_IN = riseIn(0, durations.messageIn);
/** My message grows out of the composer corner (origin-aware), not out of nowhere. */
const MINE_IN = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.94 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: EASE_OUT },
}).duration(durations.messageIn);

const AVATAR = 28;
const SENDING_OPACITY = 0.7;

/**
 * @param {object} props
 * @param {object} props.message
 * @param {boolean} props.isMine
 * @param {string} props.senderName
 * @param {boolean} props.showSenderName group chats, first bubble of a run
 * @param {boolean} props.isLastInRun gets the avatar, tail and time
 * @param {(message: object) => void} props.onLongPress
 * @param {(id: string) => void} props.onRetry
 * @param {import('react').ReactNode} [props.attachment] image content (F8)
 */
export function MessageBubble({
  message,
  isMine,
  senderName,
  showSenderName,
  isLastInRun,
  onLongPress,
  onRetry,
  attachment,
}) {
  const { colors } = useTheme();
  const { animatedStyle, shake } = useShake();
  const ticks = isMine ? tickState(message) : null;
  const isFailed = ticks === 'failed';

  useEffect(() => {
    if (isFailed) {
      haptics.error();
      shake();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFailed]);

  const tail = isLastInRun
    ? isMine
      ? { borderBottomRightRadius: radius.tail }
      : { borderBottomLeftRadius: radius.tail }
    : null;
  const fill = isFailed
    ? { backgroundColor: colors.danger }
    : isMine
      ? { backgroundColor: colors.ink }
      : { backgroundColor: colors.card, ...shadow(1, colors.shadow) };
  const textColor = isMine || isFailed ? colors.onInk : colors.textPrimary;

  function handlePress() {
    if (isFailed) onRetry(message.id);
  }

  function handleLongPress() {
    if (message.localState) return;
    haptics.select();
    onLongPress(message);
  }

  return (
    <Animated.View
      entering={message.isFresh ? (isMine ? MINE_IN : BUBBLE_IN) : undefined}
      style={[styles.row, isMine ? styles.mine : styles.theirs, isLastInRun && styles.runEnd]}
    >
      {!isMine ? (
        <View style={styles.avatarSlot}>
          {isLastInRun ? <Avatar name={senderName} size={AVATAR} /> : null}
        </View>
      ) : null}
      <View style={[styles.column, isMine && styles.columnMine]}>
        {showSenderName ? (
          <Text style={[type.caption, styles.sender, { color: colors.textSecondary }]}>
            {senderName}
          </Text>
        ) : null}
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={300}
            accessibilityRole={isFailed ? 'button' : 'text'}
            accessibilityLabel={bubbleLabel({
              isMine,
              senderName,
              content: message.content,
              type: message.type,
              time: formatClock(message.createdAt),
              ticks,
            })}
            accessibilityHint={isFailed ? 'Tap to retry' : 'Long press for options'}
            style={[
              styles.bubble,
              fill,
              tail,
              attachment ? styles.withAttachment : null,
              { opacity: message.localState === 'sending' && !attachment ? SENDING_OPACITY : 1 },
            ]}
          >
            {attachment ??
              (message.type !== 'TEXT' && !message.content ? (
                <View style={styles.attachmentHint}>
                  <Icon as={ImageIcon} color={textColor} size={18} />
                  <Text style={[type.body, { color: textColor }]}>photo</Text>
                </View>
              ) : null)}
            {message.content ? (
              <Text style={[type.body, attachment && styles.caption, { color: textColor }]}>
                {message.content}
              </Text>
            ) : null}
          </Pressable>
        </Animated.View>
        {isLastInRun || isFailed ? (
          <View style={[styles.meta, isMine && styles.metaMine]}>
            <Text style={[type.caption, { color: isFailed ? colors.danger : colors.textTertiary }]}>
              {isFailed ? 'not sent, tap to retry' : formatClock(message.createdAt)}
            </Text>
            {ticks ? <Ticks state={ticks} /> : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.md, marginTop: 4 },
  runEnd: { marginBottom: space.xs },
  mine: { justifyContent: 'flex-end', transformOrigin: 'right bottom' },
  theirs: { justifyContent: 'flex-start' },
  avatarSlot: { width: AVATAR, marginRight: space.xs, marginBottom: 20 },
  column: { maxWidth: '78%', gap: 4 },
  columnMine: { alignItems: 'flex-end' },
  sender: { marginLeft: space.sm },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.bubble,
    gap: space.xs,
  },
  withAttachment: { padding: 6 },
  caption: { paddingHorizontal: space.xs, paddingBottom: 4 },
  attachmentHint: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: space.sm },
  metaMine: { marginLeft: 0, marginRight: space.xs },
});
