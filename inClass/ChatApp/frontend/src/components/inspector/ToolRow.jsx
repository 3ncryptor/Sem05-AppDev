/**
 * ToolRow: one setting inside a ToolCard: a label with an optional one-line
 * explanation, a switch or control on the right, and optionally a control
 * underneath (interval chips), so nothing is squeezed onto one line.
 */
import { StyleSheet, Switch, Text, View } from 'react-native';
import { gradient, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.detail]
 * @param {import('react').ReactNode} [props.right]
 * @param {{ value: boolean, onChange: (value: boolean) => void }} [props.toggle]
 * @param {import('react').ReactNode} [props.below] a control under the label
 */
export function ToolRow({ label, detail, right, toggle, below }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
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
      {below}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingVertical: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
  },
  text: { flex: 1, gap: 2 },
});
