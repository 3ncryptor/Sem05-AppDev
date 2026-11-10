/**
 * SettingRow: a label on the left and a control or value on the right.
 * With `toggle`, the right side is a switch.
 */
import { StyleSheet, Switch, Text, View } from 'react-native';
import { gradient, radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.detail] small text under the label
 * @param {import('react').ReactNode} [props.right]
 * @param {{ value: boolean, onChange: (value: boolean) => void }} [props.toggle]
 */
export function SettingRow({ label, detail, right, toggle }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceRaised }]}>
      <View style={styles.text}>
        <Text style={[type.body, { color: colors.textPrimary }]}>{label}</Text>
        {detail ? (
          <Text style={[type.caption, { color: colors.textTertiary }]} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={(value) => {
            haptics.select();
            toggle.onChange(value);
          }}
          trackColor={{ true: gradient.colors[1], false: colors.textTertiary }}
          thumbColor="#FFFFFF"
          accessibilityLabel={label}
        />
      ) : (
        right
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 56,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.bubble,
  },
  text: { flex: 1, gap: 2 },
});
