/**
 * Avatar: a user's illustrated face on a pastel circle (buildPlan.md 4).
 * Memoised because lists render many of these and the SVG parse is the
 * expensive part; the SVG string itself comes from a cache.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { avatarSvg, avatarTint, DEFAULT_AVATAR_STYLE } from './avatarSvg';

/**
 * @param {object} props
 * @param {string} props.name username, the seed for the face
 * @param {number} [props.size=40]
 * @param {string} [props.styleId] DiceBear style id (Profile setting, later from the settings store)
 * @param {string} [props.ringColor] draws a 2 px ring, used when avatars overlap
 */
function AvatarBase({ name, size = 40, styleId = DEFAULT_AVATAR_STYLE, ringColor }) {
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
      <SvgXml xml={avatarSvg(name, styleId)} width="100%" height="100%" />
    </View>
  );
}

export const Avatar = memo(AvatarBase);

const styles = StyleSheet.create({
  circle: { overflow: 'hidden' },
});
