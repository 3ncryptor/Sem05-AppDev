/**
 * AvatarStack: up to three overlapping faces and a "+N" circle for the rest
 * (design.md 6.3). Used in group cards and the chat header slab.
 */
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from './Avatar';
import { splitStack } from './splitStack';

const OVERLAP = 12;

/**
 * @param {object} props
 * @param {string[]} props.names usernames, in display order
 * @param {number} [props.size=40]
 * @param {number} [props.max=3] faces shown before the "+N" circle
 * @param {'surface' | 'slab'} [props.on='surface'] background behind the stack (ring + "+N" colours)
 * @param {string} [props.styleId]
 */
export function AvatarStack({ names, size = 40, max = 3, on = 'surface', styleId }) {
  const { colors } = useTheme();
  const { shown, extra } = splitStack(names, max);
  const ringColor = on === 'slab' ? colors.slab : colors.surface;
  const moreFill = on === 'slab' ? colors.slabRaised : colors.surfaceRaised;
  const moreText = on === 'slab' ? colors.textOnSlab : colors.textPrimary;
  const circle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      style={styles.row}
      accessibilityLabel={`${names.length} ${names.length === 1 ? 'person' : 'people'}`}
    >
      {shown.map((name, index) => (
        <View key={`${name}-${index}`} style={index > 0 ? { marginLeft: -OVERLAP } : null}>
          <Avatar name={name} size={size} styleId={styleId} ringColor={ringColor} />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={[
            styles.more,
            circle,
            { marginLeft: -OVERLAP, backgroundColor: moreFill, borderColor: ringColor },
          ]}
        >
          <Text style={[styles.moreText, { color: moreText, fontSize: Math.round(size * 0.32) }]}>
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  more: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fonts.semibold },
});
