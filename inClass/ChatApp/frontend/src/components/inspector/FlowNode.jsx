/**
 * FlowNode: one box on the Live Wire (phone, server, db, bot). The server
 * lists its layers (guard, controller, service); explain mode lights up the
 * box or layer the current step is about.
 */
import { StyleSheet, Text, View } from 'react-native';
import { fonts, gradient, radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';

/**
 * @param {object} props
 * @param {import('react').ComponentType<any>} props.icon
 * @param {string} props.label
 * @param {{ id: string, label: string }[]} [props.layers]
 * @param {string | null} props.active node or layer id being explained
 * @param {string} props.id
 * @param {object} [props.style]
 */
export function FlowNode({ icon, label, layers = [], active, id, style }) {
  const { colors } = useTheme();
  const isActive = active === id || layers.some((layer) => layer.id === active);
  return (
    <View
      style={[
        styles.node,
        {
          backgroundColor: colors.slabRaised,
          borderColor: isActive ? gradient.colors[1] : 'transparent',
        },
        style,
      ]}
      accessibilityLabel={label}
    >
      <Icon as={icon} color={isActive ? gradient.colors[1] : colors.textOnSlab} size={20} />
      <Text style={[type.caption, { color: colors.textOnSlab }]}>{label}</Text>
      {layers.map((layer) => (
        <Text
          key={layer.id}
          style={[
            styles.layer,
            { color: active === layer.id ? gradient.colors[1] : colors.textOnSlabMuted },
          ]}
        >
          {layer.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  node: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radius.image,
    borderWidth: 2,
    minWidth: 72,
  },
  layer: { fontFamily: fonts.mono, fontSize: 10 },
});
