/**
 * DmRow: one direct conversation as a light card row (buildPlan.md 5.2).
 */
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { StyleSheet, Text, View } from 'react-native';
import { radius, shadow, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';

/**
 * @param {object} props
 * @param {string} props.name the other person
 * @param {() => void} props.onPress
 */
export function DmRow({ name, onPress }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} accessibilityLabel={`Chat with ${name}`}>
      <View style={[styles.row, { backgroundColor: colors.card, ...shadow(1, colors.shadow) }]}>
        <Avatar name={name} size={44} />
        <Text style={[type.heading, styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[type.caption, { color: colors.textTertiary }]}>dm</Text>
        <Icon as={ChevronRight} color={colors.textTertiary} size={18} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    paddingRight: space.md,
    borderRadius: radius.bubble,
  },
  name: { flex: 1 },
});
