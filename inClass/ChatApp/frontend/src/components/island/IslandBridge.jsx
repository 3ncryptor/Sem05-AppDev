/**
 * IslandBridge: the liquid neck between the pill and the first circle (W2).
 *
 * Drawn as one SVG path with concave sides. While the circle splits off, the
 * neck thins from almost the full height to nothing and the two shapes pull
 * apart like drops of water; merging plays it backwards. Its ends tuck inside
 * the pill and the circle (both black), so only the neck is ever seen.
 * Hidden once fully split or fully merged, and with reduce motion.
 */
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { island } from './islandTheme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** How far each end tucks inside the pill and the circle. */
const TUCK = 8;
const END_HEIGHT = 0.78;

/**
 * @param {object} props
 * @param {number} props.size circle diameter (= pill height in multi)
 * @param {number} props.gap space between the pill and the circle when split
 * @param {{ w: object, left: object, split: object }} props.motion
 * @param {object} props.dragX
 */
export function IslandBridge({ size, gap, motion, dragX }) {
  const width = gap + size + TUCK * 2;

  const animatedProps = useAnimatedProps(() => {
    const split = motion.split.get();
    // distance between the pill's edge and the circle's edge right now
    const apart = gap - (1 - split) * (gap + size);
    const span = Math.max(0, apart + TUCK * 2);
    const end = size * END_HEIGHT;
    const neck = end * (1 - split) * 0.95;
    const top = (size - end) / 2;
    const bottom = (size + end) / 2;
    const midTop = (size - neck) / 2;
    const midBottom = (size + neck) / 2;
    const mid = span / 2;
    return {
      d:
        `M0 ${top} C${mid} ${midTop} ${mid} ${midTop} ${span} ${top} ` +
        `L${span} ${bottom} C${mid} ${midBottom} ${mid} ${midBottom} 0 ${bottom} Z`,
    };
  });

  const style = useAnimatedStyle(() => {
    const split = motion.split.get();
    return {
      opacity: split > 0.02 && split < 0.97 ? 1 : 0,
      transform: [{ translateX: motion.left.get() + motion.w.get() - TUCK + dragX.get() }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { width, height: size }, style]}>
      <Svg width={width} height={size}>
        <AnimatedPath animatedProps={animatedProps} fill={island.fill} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0 },
});
