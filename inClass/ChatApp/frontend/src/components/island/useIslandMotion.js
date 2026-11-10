/**
 * useIslandMotion: every shared value the island animates (W2).
 *
 * - Shape: width, height, radius, group offset and the circles' split, all
 *   on the same calm spring.
 * - Inhale: when the island is about to grow, it squashes for 90 ms
 *   (wider, shorter) and the growth starts just after: the anticipation is
 *   what makes an arrival noticeable without any bounce.
 * - Breath (W1): one widen-and-settle with a faint rim, when asked.
 * - Press squish and drag stretch are driven by the gesture hook.
 * Reduce motion: values snap; no inhale, breath or stretch.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { EASE_IN_OUT, EASE_OUT, springs } from '../../constants/motion';

const INHALE_MS = 90;
const INHALE_X = 1.04;
const INHALE_Y = 0.94;
const GROW_DELAY_MS = 60;
const BREATH_X = 1.06;
const BREATH_IN_MS = 160;
const BREATH_OUT_MS = 260;
const RIM_PEAK = 0.55;
const RIM_FADE_MS = 420;

/**
 * @param {{ width: number, height: number, radius: number, left: number, split: number }} target
 * @param {boolean} reduceMotion
 * @param {number} breathId bumps for one breath
 */
export function useIslandMotion(target, reduceMotion, breathId) {
  const w = useSharedValue(target.width);
  const h = useSharedValue(target.height);
  const r = useSharedValue(target.radius);
  const left = useSharedValue(target.left);
  const split = useSharedValue(target.split);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const rim = useSharedValue(0);
  const previousArea = useRef(target.width * target.height);

  useEffect(() => {
    const area = target.width * target.height;
    const isGrowing = area > previousArea.current + 1;
    previousArea.current = area;

    if (reduceMotion) {
      w.set(target.width);
      h.set(target.height);
      r.set(target.radius);
      left.set(target.left);
      split.set(target.split);
      return;
    }
    if (isGrowing) {
      const out = { duration: INHALE_MS, easing: EASE_OUT };
      sx.set(withSequence(withTiming(INHALE_X, out), withSpring(1, springs.island)));
      sy.set(withSequence(withTiming(INHALE_Y, out), withSpring(1, springs.island)));
    }
    const delay = isGrowing ? GROW_DELAY_MS : 0;
    const move = (value, to) => value.set(withDelay(delay, withSpring(to, springs.island)));
    move(w, target.width);
    move(h, target.height);
    move(r, target.radius);
    move(left, target.left);
    move(split, target.split);
  }, [
    target.width,
    target.height,
    target.radius,
    target.left,
    target.split,
    reduceMotion,
    w,
    h,
    r,
    left,
    split,
    sx,
    sy,
  ]);

  useEffect(() => {
    if (!breathId || reduceMotion) return;
    sx.set(
      withSequence(
        withTiming(BREATH_X, { duration: BREATH_IN_MS, easing: EASE_OUT }),
        withTiming(1, { duration: BREATH_OUT_MS, easing: EASE_IN_OUT }),
      ),
    );
    rim.set(
      withSequence(
        withTiming(RIM_PEAK, { duration: BREATH_IN_MS, easing: EASE_OUT }),
        withTiming(0, { duration: RIM_FADE_MS, easing: EASE_IN_OUT }),
      ),
    );
  }, [breathId, reduceMotion, sx, rim]);

  return useMemo(
    () => ({ w, h, r, left, split, sx, sy, rim }),
    [w, h, r, left, split, sx, sy, rim],
  );
}
