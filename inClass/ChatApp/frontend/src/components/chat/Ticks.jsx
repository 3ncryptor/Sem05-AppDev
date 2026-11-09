/**
 * Ticks: the delivery state of your own message (buildPlan.md 8).
 * sending = clock, sent = one tick, delivered = two ticks, read = two ticks
 * in the accent colour, failed = alert icon.
 */
import Check from 'lucide-react-native/icons/check';
import CheckCheck from 'lucide-react-native/icons/check-check';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Clock from 'lucide-react-native/icons/clock';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { gradient } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';

const SIZE = 14;
const LABELS = {
  sending: 'sending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'not sent',
};

/** @param {{ state: import('../../utils/ticks').TickState }} props */
export function Ticks({ state }) {
  const { colors } = useTheme();
  const icon = {
    sending: Clock,
    sent: Check,
    delivered: CheckCheck,
    read: CheckCheck,
    failed: CircleAlert,
  }[state];
  const color =
    state === 'read'
      ? gradient.colors[2]
      : state === 'failed'
        ? colors.danger
        : colors.textTertiary;

  return (
    <Animated.View key={state} entering={ZoomIn.springify()} accessibilityLabel={LABELS[state]}>
      <Icon as={icon} color={color} size={SIZE} />
    </Animated.View>
  );
}
