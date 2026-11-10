/**
 * CheckDraw: a check mark that draws itself once (the confirm morph's
 * payoff). The stroke offset runs from the full length to 0 after the shape
 * has mostly landed, so cause (the island turning square) comes before
 * effect (the check). With reduce motion it simply appears.
 */
import { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { EASE_OUT } from '../../constants/motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);
/** The check path is about 26.6 long; the gap is longer than the dash, so no cap shows early. */
const CHECK_LENGTH = 27;
const CHECK_GAP = 40;
const HIDDEN_OFFSET = CHECK_LENGTH + 5;
const DRAW_MS = 320;
const DRAW_DELAY_MS = 180;

/**
 * @param {object} props
 * @param {number} [props.size=44]
 * @param {string} props.color stroke colour
 * @param {string} props.ring the circle behind it
 */
export function CheckDraw({ size = 44, color, ring }) {
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(reduceMotion ? 0 : HIDDEN_OFFSET);

  useEffect(() => {
    if (reduceMotion) return;
    offset.set(withDelay(DRAW_DELAY_MS, withTiming(0, { duration: DRAW_MS, easing: EASE_OUT })));
  }, [offset, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));

  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={21} fill={ring} />
      <AnimatedPath
        d="M13 22.5 L19.5 29 L31 16"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={[CHECK_LENGTH, CHECK_GAP]}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
