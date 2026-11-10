/**
 * NewMessagesPill: "2 new" with a down arrow, shown when messages arrive
 * while the user is scrolled up. Tapping jumps to the newest message.
 */
import ArrowDown from 'lucide-react-native/icons/arrow-down';
import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { riseIn, softOut } from '../../constants/motion';
import { radius, shadow, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';

const PILL_IN = riseIn();
const PILL_OUT = softOut();

/** @param {{ count: number, onPress: () => void }} props */
export function NewMessagesPill({ count, onPress }) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  return (
    <Animated.View entering={PILL_IN} exiting={PILL_OUT} style={styles.anchor}>
      <PressableScale
        onPress={onPress}
        accessibilityLabel={`${count} new messages, jump to newest`}
      >
        <Animated.View
          style={[styles.pill, { backgroundColor: colors.ink, ...shadow(2, colors.shadow) }]}
        >
          <Icon as={ArrowDown} color={colors.onInk} size={16} />
          <Text style={[type.chip, { color: colors.onInk }]}>{count} new</Text>
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', alignSelf: 'center', bottom: space.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    height: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
  },
});
