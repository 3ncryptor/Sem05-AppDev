/**
 * Composer: the message pill and send button (design.md 6.5). The send
 * button turns to the gradient once there is something to send. An
 * optional `leading` slot holds the attach button (F8).
 */
import SendHorizontal from 'lucide-react-native/icons/send-horizontal';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { fonts, radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { GradientFill } from '../ui/GradientFill';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';

const HEIGHT = 56;
const MAX_INPUT_HEIGHT = 120;
const MAX_LENGTH = 2000;

/**
 * @param {object} props
 * @param {(text: string) => void} props.onSend
 * @param {import('react').ReactNode} [props.leading]
 */
export function Composer({ onSend, leading }) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const isReady = text.trim().length > 0;

  function send() {
    if (!isReady) return;
    onSend(text);
    setText('');
  }

  const icon = <Icon as={SendHorizontal} color="#FFFFFF" size={22} />;

  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: colors.surfaceRaised }]}>
        {leading}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="type your message..."
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={MAX_LENGTH}
          accessibilityLabel="Message"
          style={[styles.input, { color: colors.textPrimary }]}
        />
      </View>
      <PressableScale onPress={send} disabled={!isReady} accessibilityLabel="Send message">
        {isReady ? (
          <GradientFill style={styles.send}>{icon}</GradientFill>
        ) : (
          <View style={[styles.send, { backgroundColor: colors.ink }]}>
            <Icon as={SendHorizontal} color={colors.onInk} size={22} />
          </View>
        )}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, paddingHorizontal: space.md },
  pill: {
    flex: 1,
    minHeight: HEIGHT,
    borderRadius: radius.slab,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    maxHeight: MAX_INPUT_HEIGHT,
    paddingVertical: space.sm,
  },
  send: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
