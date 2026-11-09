/**
 * ToolRow: one row on the dark Inspector sheet, a label with optional detail
 * on the left and a switch or any control on the right.
 */
import { StyleSheet, Switch, Text, View } from 'react-native';
import { gradient, radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.detail]
 * @param {import('react').ReactNode} [props.right]
 * @param {{ value: boolean, onChange: (value: boolean) => void }} [props.toggle]
 */
export function ToolRow({ label, detail, right, toggle }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.slabRaised }]}>
      <View style={styles.text}>
        <Text style={[type.body, { color: colors.textOnSlab }]}>{label}</Text>
        {detail ? (
          <Text style={[type.caption, { color: colors.textOnSlabMuted }]} numberOfLines={2}>
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
          trackColor={{ true: gradient.colors[1], false: colors.textOnSlabMuted }}
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
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.bubble,
    minHeight: 56,
  },
  text: { flex: 1, gap: 2 },
});
