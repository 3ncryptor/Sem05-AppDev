/**
 * StylePicker: your face in each of the three avatar styles; the chosen one
 * has a gradient ring. Changing it updates every face in the app at once.
 */
import { StyleSheet, Text, View } from 'react-native';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { Avatar } from '../avatar/Avatar';
import { AVATAR_STYLES } from '../avatar/avatarSvg';
import { GradientFill } from '../ui/GradientFill';
import { PressableScale } from '../ui/PressableScale';

const FACE = 64;
const RING = 3;

/**
 * @param {object} props
 * @param {string} props.name your username (the faces are previews of you)
 * @param {string} props.value selected style id
 * @param {(styleId: string) => void} props.onChange
 */
export function StylePicker({ name, value, onChange }) {
  const { colors } = useTheme();

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {AVATAR_STYLES.map((style) => {
        const isSelected = style.id === value;
        const face = <Avatar name={name} size={FACE} styleId={style.id} />;
        return (
          <PressableScale
            key={style.id}
            haptic={false}
            onPress={() => {
              if (isSelected) return;
              haptics.select();
              onChange(style.id);
            }}
            accessibilityLabel={`Avatar style ${style.label}`}
            style={styles.grow}
          >
            <View
              style={[styles.card, { backgroundColor: colors.surfaceRaised }]}
              accessibilityState={{ selected: isSelected }}
            >
              {isSelected ? (
                <GradientFill style={styles.ring}>{face}</GradientFill>
              ) : (
                <View style={styles.ringPlaceholder}>{face}</View>
              )}
              <Text
                style={[
                  type.caption,
                  { color: isSelected ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {style.label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  grow: { flex: 1 },
  card: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.bubble,
  },
  ring: { padding: RING, borderRadius: (FACE + RING * 2) / 2 },
  ringPlaceholder: { padding: RING },
});
