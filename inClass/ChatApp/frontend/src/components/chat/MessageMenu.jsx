/**
 * MessageMenu: long-press a bubble and it lifts onto a blurred backdrop
 * with actions (buildPlan.md 5.3): copy the text, or show details (time,
 * id and the receipt of every other member).
 */
import Copy from 'lucide-react-native/icons/copy';
import Info from 'lucide-react-native/icons/info';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { radius, shadow, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatDateTime } from '../../utils/format';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';
import { receiptRows } from '../../utils/ticks';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { softPop } from '../../constants/motion';
import { islandCopied } from '../../island/islandEvents';

const POP = softPop();

const DETAILS_MAX_HEIGHT = 260;

/**
 * @param {object} props
 * @param {object | null} props.message null hides the menu
 * @param {boolean} props.isMine
 * @param {Record<string, { name: string }>} props.usersById
 * @param {() => void} props.onClose
 */
export function MessageMenu({ message, isMine, usersById, onClose }) {
  const { colors, isDark } = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  function close() {
    setShowDetails(false);
    onClose();
  }

  async function copy() {
    await Clipboard.setStringAsync(message?.content ?? '');
    haptics.success();
    islandCopied();
    log.app('message copied');
    close();
  }

  const action = (icon, label, onPress) => (
    <PressableScale onPress={onPress} scaleTo={0.97} accessibilityLabel={label}>
      <View style={styles.action}>
        <Icon as={icon} color={colors.textPrimary} size={20} />
        <Text style={[type.body, { color: colors.textPrimary }]}>{label}</Text>
      </View>
    </PressableScale>
  );

  return (
    <Modal
      visible={Boolean(message)}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel="Close menu"
        />
        {message ? (
          <View
            style={[styles.center, isMine ? styles.right : styles.left]}
            pointerEvents="box-none"
          >
            <Animated.View
              entering={POP}
              style={[
                styles.bubble,
                isMine
                  ? { backgroundColor: colors.ink }
                  : { backgroundColor: colors.card, ...shadow(2, colors.shadow) },
              ]}
            >
              <Text style={[type.body, { color: isMine ? colors.onInk : colors.textPrimary }]}>
                {message.content || 'photo'}
              </Text>
            </Animated.View>
            <Animated.View
              entering={FadeIn.delay(80)}
              style={[styles.card, { backgroundColor: colors.card, ...shadow(3, colors.shadow) }]}
            >
              {message.content ? action(Copy, 'Copy', copy) : null}
              {action(Info, showDetails ? 'Hide details' : 'Details', () =>
                setShowDetails((v) => !v),
              )}
              {showDetails ? (
                <ScrollView style={{ maxHeight: DETAILS_MAX_HEIGHT }}>
                  <Text style={[type.caption, { color: colors.textSecondary }]}>
                    {formatDateTime(message.createdAt)}
                  </Text>
                  <Text style={[type.caption, { color: colors.textTertiary }]} selectable>
                    id {message.id}
                  </Text>
                  {receiptRows(message, usersById).map((row) => (
                    <View key={row.id} style={styles.receipt}>
                      <Text style={[type.meta, { color: colors.textPrimary }]}>{row.name}</Text>
                      <Text style={[type.meta, { color: colors.textSecondary }]}>{row.state}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </Animated.View>
          </View>
        ) : null}
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: space.lg, gap: space.sm },
  left: { alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.bubble,
  },
  card: { minWidth: 220, maxWidth: '85%', borderRadius: radius.bubble, padding: space.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  receipt: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
