/**
 * ServerLogsNotice: a calm one-line status for server logs (buildPlan.md 6.5).
 * Shows nothing while they stream normally; "check again" for unreachable.
 */
import ServerOff from 'lucide-react-native/icons/server-off';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';

const MESSAGES = {
  idle: '',
  available: '',
  checking: 'checking server logs...',
  unsupported: "server logs unavailable here: this server doesn't share logs",
  unreachable: "can't reach the server's logs",
  signedOut: 'sign in to see server logs',
};

/**
 * @param {object} props
 * @param {string} props.status serverLogStore status
 * @param {() => void} props.onRetry
 */
export function ServerLogsNotice({ status, onRetry }) {
  const { colors } = useTheme();
  const message = MESSAGES[status];
  if (!message) return null;

  return (
    <View style={[styles.notice, { backgroundColor: colors.slabRaised }]}>
      <Icon as={ServerOff} color={colors.textOnSlabMuted} size={16} />
      <Text style={[type.caption, styles.text, { color: colors.textOnSlabMuted }]}>{message}</Text>
      {status === 'unreachable' ? (
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Check again">
          <Text style={[type.chip, { color: colors.textOnSlab }]}>check again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  text: { flex: 1 },
});
