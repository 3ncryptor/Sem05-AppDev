/**
 * Avatar: a user's illustrated face on a pastel circle (buildPlan.md 4).
 * Memoised because lists render many of these. The face is parsed once per
 * (style, name) and drawn from the cached tree at an exact pixel size, so it
 * never waits on layout (buildPlan.md 13, V0).
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgAst } from 'react-native-svg';
import { useStore } from '../../hooks/useStore';
import { settingsStore } from '../../store/settingsStore';
import { avatarAst } from './avatarAst';
import { avatarTint } from './avatarSvg';

/**
 * @param {object} props
 * @param {string} props.name username, the seed for the face
 * @param {number} [props.size=40]
 * @param {string} [props.styleId] DiceBear style id; defaults to the style chosen in Profile
 * @param {string} [props.ringColor] draws a 2 px ring, used when avatars overlap
 */
function AvatarBase({ name, size = 40, styleId, ringColor }) {
  const chosenStyle = useStore(settingsStore, (state) => state.avatarStyle);
  const ring = ringColor ? { borderWidth: 2, borderColor: ringColor } : null;

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarTint(name) },
        ring,
      ]}
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s avatar` : 'avatar'}
    >
      <SvgAst
        ast={avatarAst(name, styleId ?? chosenStyle)}
        override={{ width: size, height: size }}
      />
    </View>
  );
}

export const Avatar = memo(AvatarBase);

const styles = StyleSheet.create({
  circle: { overflow: 'hidden' },
});
